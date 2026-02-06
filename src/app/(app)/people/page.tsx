'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LoaderCircle } from 'lucide-react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import type { Person } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';

// Default public patient ID to fallback to if no user is logged in
// In a real app this might be strict, but fitting existing patterns
const PUBLIC_PATIENT_ID = 'patient123';

export default function PeoplePage() {
  const { profile, loading: userLoading } = useUser();
  const firestore = useFirestore();

  // Wait for profile to load before falling back (or better, show loading)
  // If we are loading user, we shouldn't query yet.
  const patientUid = profile?.patientUid || PUBLIC_PATIENT_ID;

  const peopleQuery = useMemo(() => {
    if (!firestore || !patientUid) return null;
    return query(
      collection(firestore, 'people'),
      where('patientUid', '==', patientUid)
    );
  }, [firestore, patientUid]);

  const { data: people, loading } = useCollection<Person>(peopleQuery as any); // Cast avoiding complex generic mismatch for now

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">People</h1>
        <Button>
          <Plus className="-ml-1 mr-2 h-4 w-4" />
          Add Person
        </Button>
      </header>

      {(loading || userLoading) ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {people && people.length > 0 ? (
            people.map((person) => (
              <Link href={`/people/${person.id}`} key={person.id}>
                <Card className="overflow-hidden transition-all hover:scale-105 hover:shadow-xl">
                  <CardHeader className="p-0">
                    <div className="relative aspect-square">
                      <Image
                        src={person.faceThumbUrl}
                        alt={person.displayName}
                        fill
                        className="object-cover"
                        data-ai-hint={person.faceThumbHint}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="font-semibold truncate">{person.displayName}</p>

                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center">No people found.</p>
          )}
        </div>
      )}
    </div>
  );
}
