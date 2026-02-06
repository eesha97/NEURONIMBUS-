'use client';

import { use, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemoryCard } from '@/app/(app)/memories/components/memory-card';
import { LoaderCircle, Edit } from 'lucide-react';
import { useDoc, useCollection, useFirestore } from '@/firebase';
import { doc, collection, query, where, orderBy, type Query } from 'firebase/firestore';
import type { Memory, Person } from '@/lib/types';
import { notFound } from 'next/navigation';
import { MemoryDetailDialog } from '@/app/(app)/memories/components/memory-detail-dialog';
import { useState } from 'react';

export default function PersonDetailPage({ params }: { params: Promise<{ peopleId: string }> }) {
  const { peopleId } = use(params);
  const firestore = useFirestore();

  // Fetch Person Document
  const personDocRef = useMemo(() => {
    return firestore ? (doc(firestore, 'people', peopleId) as any) : null;
  }, [firestore, peopleId]);

  const { data: person, loading: personLoading } = useDoc<Person>(personDocRef);

  // Fetch Memories for this Person
  const memoriesQuery = useMemo(() => {
    if (!firestore || !peopleId) return null;
    return query(
      collection(firestore, 'memories'),
      where('people', 'array-contains', { id: peopleId }), // Note: This depends on how data is stored. 
      // If people is an array of objects, simple array-contains only works if objects match exactly fields-wise or if we store IDs separately.
      // Based on types.ts: people: Pick<Person...>[], so this queries might be tricky without a dedicated 'peopleIds' array.
      // FALLBACK for now: Query all memories for patient (we can get patientUid from person) and filter client side, or assume 'peopleIds' field exists.
      // Let's assume for this refactor we might filter client side if the dataset is small, or better, query by patientUid if we had it.
      // Actually, let's revert to a simpler query assuming 'peopleIds' array exists or stick to client filtering if we can.
      // BUT we don't have patientUid easily here without the person loaded.
      // Let's try to just fetch the person first.
    );
  }, [firestore, peopleId]);

  // ACTUALLY: The Mock implementation filtered by: m.people.some(p => p.id === peopleId)
  // To do this efficiently in Firestore, we usually store an array of IDs `peopleIds: string[]` on the memory document.
  // I will check if I can query by that. If not, I will query by patientUid (if I had it)
  // For now, let's just fetch the person.

  if (personLoading) {
    return <div className="flex h-64 items-center justify-center"><LoaderCircle className="animate-spin" /></div>;
  }

  if (!person) {
    // Only 404 if done loading and no person
    if (!personLoading) return <div className="p-8 text-center">Person not found.</div>;
    return null;
  }

  return <PersonDetailContent person={person} peopleId={peopleId} />;
}

// Separated content component to handle memory fetching once person is known
function PersonDetailContent({ person, peopleId }: { person: Person, peopleId: string }) {
  const firestore = useFirestore();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  const memsQuery = useMemo(() => {
    if (!firestore) return null;
    // Optimization: Query memories by patientUid
    return query(
      collection(firestore, 'memories'),
      where('patientUid', '==', person.patientUid),
      orderBy('createdAt', 'desc')
    ) as Query<Memory>;
  }, [firestore, person.patientUid]);

  const { data: allMemories, loading: memsLoading } = useCollection<Memory>(memsQuery);

  const personMemories = useMemo(() => {
    if (!allMemories) return [];
    return allMemories.filter(m => m.people?.some(p => p.id === peopleId));
  }, [allMemories, peopleId]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0">
          <Image
            src={person.faceThumbUrl}
            alt={person.displayName}
            fill
            className="rounded-full object-cover border-4 border-background shadow-lg"
            data-ai-hint={person.faceThumbHint}
          />
        </div>
        <div className="flex-grow">
          <h1 className="text-4xl font-bold tracking-tight font-headline">{person.displayName}</h1>

        </div>
      </header>

      <section>
        <h2 className="text-2xl font-bold tracking-tight font-headline mb-4">Memories with {person.displayName}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {memsLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : personMemories.length > 0 ? (
            personMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onClick={() => setSelectedMemory(memory)}
              />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full">No memories found for {person.displayName}.</p>
          )}
        </div>
      </section>

      <MemoryDetailDialog
        memory={selectedMemory}
        isOpen={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
      />
    </div>
  );
}
