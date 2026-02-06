'use client';

import { use, useMemo } from 'react';
import Image from 'next/image';
import { MemoryCard } from '@/app/(app)/memories/components/memory-card';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, type Query } from 'firebase/firestore';
import type { Memory, Event } from '@/lib/types';
import { deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { profile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  // Fetch Event Document
  const eventDocRef = useMemo(() => {
    return firestore ? (doc(firestore, 'events', eventId) as any) : null;
  }, [firestore, eventId]);

  const { data: event, loading: eventLoading } = useDoc<Event>(eventDocRef);

  const handleDelete = async () => {
    if (!event || !firestore || !confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    setDeleting(true);
    try {
      // 1. Delete images from Cloudinary
      if (event.images) {
        await Promise.all(event.images.map(async (img) => {
          if (img.publicId) {
            await fetch('/api/delete-image', {
              method: 'POST',
              body: JSON.stringify({ publicId: img.publicId }),
            });
          }
        }));
      }

      // 2. Delete Firestore document
      await deleteDoc(doc(firestore, 'events', eventId));

      toast({
        title: 'Event Deleted',
        description: 'The event and its photos have been removed.',
      });

      router.push('/events');
    } catch (error) {
      console.error('Delete failed', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the event fully.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Fetch Memories for this Event
  const memoriesQuery = useMemo(() => {
    if (!firestore || !eventId) return null;
    return query(
      collection(firestore, 'memories'),
      where('event.id', '==', eventId), // Querying by nested object field 'event.id'
      orderBy('createdAt', 'desc')
    );
  }, [firestore, eventId]);

  const { data: eventMemories, loading: memsLoading } = useCollection<Memory>(memoriesQuery as any);

  if (eventLoading) {
    return <div className="flex h-64 items-center justify-center"><LoaderCircle className="animate-spin" /></div>;
  }

  if (!event) {
    if (!eventLoading) return <div className="p-8 text-center">Event not found.</div>;
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight font-headline">{event.title}</h1>
          {event.date && (
            <p className="text-lg text-muted-foreground mt-1">
              {format(new Date(event.date), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Only caregivers can delete */}
          {(event.patientUid === profile?.patientUid || profile?.role === 'caregiver') && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          )}
        </div>
      </header>

      <section className="space-y-6">
        {event.description && (
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed">{event.description}</p>
          </div>
        )}

        {(event.images && event.images.length > 0) || (event.imageUrls && event.imageUrls.length > 0) ? (
          <div>
            <h2 className="text-2xl font-bold font-headline mb-4">Photos</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Support both new 'images' array and old 'imageUrls' array */}
              {(event.images || []).map((img, index) => (
                <div key={index} className="relative aspect-[4/3] w-full overflow-hidden rounded-md shadow-sm">
                  <Image
                    src={img.url}
                    alt={`Event photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
              {/* Fallback for old data without publicId */}
              {!event.images && event.imageUrls?.map((url, index) => (
                <div key={index} className="relative aspect-[4/3] w-full overflow-hidden rounded-md shadow-sm">
                  <Image
                    src={url}
                    alt={`Event photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Legacy/Linked Memories Section */}
        {eventMemories && eventMemories.length > 0 && (
          <div className="pt-8 border-t">
            <h2 className="text-2xl font-bold font-headline mb-4">Linked Memories</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {eventMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
