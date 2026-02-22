'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LoaderCircle } from 'lucide-react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import type { Person, Memory } from '@/lib/types';
import { collection, query, where, orderBy, type Query } from 'firebase/firestore';
import { useMemo } from 'react';

export default function PeoplePage() {
  const { profile, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const patientUid = profile?.patientUid;

  // Query MEMORIES instead of people directly, to ensure we see everyone who appears
  // in the patient's timeline, regardless of who uploaded it.
  const memoriesQuery = useMemo(() => {
    if (!firestore || !patientUid) return null;
    return query(
      collection(firestore, 'memories'),
      where('patientUid', '==', patientUid),
      orderBy('createdAt', 'desc')
    ) as Query<Memory>;
  }, [firestore, patientUid]);

  const { data: memories, loading: memoriesLoading } = useCollection<Memory>(memoriesQuery);

  // Aggregate people from memories labels
  const people = useMemo(() => {
    if (!memories || !patientUid) return [];

    const peopleMap = new Map<string, { id: string; displayName: string; faceThumbUrl: string; faceThumbHint: string }>();

    memories.forEach(memory => {
      // Use the new labels array for primary grouping
      if (memory.labels && memory.labels.length > 0) {
        memory.labels.forEach(label => {
          const safeLabel = label.toLowerCase().replace(/\s+/g, '-');
          const personId = `${patientUid}_${safeLabel}`;

          if (!peopleMap.has(personId)) {
            // Find display name from keywords or use capitalized label
            const originalKeyword = memory.keywords?.find(k => k.toLowerCase() === label.toLowerCase());
            const displayName = originalKeyword || label.charAt(0).toUpperCase() + label.slice(1);

            peopleMap.set(personId, {
              id: personId,
              displayName: displayName,
              faceThumbUrl: memory.photoUrl,
              faceThumbHint: memory.photoHint
            });
          }
        });
      } else if (memory.people) {
        // Fallback for older memories that might not have the labels array yet
        memory.people.forEach(person => {
          if (!peopleMap.has(person.id)) {
            peopleMap.set(person.id, person);
          }
        });
      }
    });

    return Array.from(peopleMap.values());
  }, [memories, patientUid]);

  const isLoading = userLoading || memoriesLoading;

  if (userLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!patientUid) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">No Patient Selected</h2>
        <p className="text-muted-foreground">Please log in or select a patient to view people.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">People</h1>
        <Button>
          <Plus className="-ml-1 mr-2 h-4 w-4" />
          Add Person
        </Button>
      </header>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {people.length > 0 ? (
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
            <p className="text-muted-foreground col-span-full text-center">No people found in memories.</p>
          )}
        </div>
      )}
    </div>
  );
}
