'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, LoaderCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCollection, useUser, useFirestore } from '@/firebase';
import type { Event } from '@/lib/types';
import { collection, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const PUBLIC_PATIENT_ID = 'patient123';

export default function EventsPage() {
  const { profile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const patientUid = profile?.patientUid || PUBLIC_PATIENT_ID;
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (e: React.MouseEvent, event: Event) => {
    e.preventDefault(); // Prevent link nav
    e.stopPropagation();
    if (!firestore || !event.id) return;
    if (!confirm("Delete this event?")) return;

    setDeletingIds(prev => new Set(prev).add(event.id!));
    try {
      // Delete images first if any (simplified: just doc for now as detail page handles images better, but we should try)
      // For list view delete, we might skip full cleanup or do a simple doc delete. Events don't always have publicIds easily available here unless we fetch them.
      // Let's assume just doc delete for list view efficiency, or better:
      // Actually, if we delete the doc, we leave orphaned images in Cloudinary.
      // Ideally we should delete images. event.images might be available.
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

      await deleteDoc(doc(firestore, 'events', event.id));
      toast({ title: "Event Deleted" });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: "Error deleting event" });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(event.id!);
        return next;
      });
    }
  };

  const canDelete = profile?.role !== 'patient';

  const eventsQuery = useMemo(() => {
    if (!firestore || !patientUid) return null;
    return query(
      collection(firestore, 'events'),
      where('patientUid', '==', patientUid)
    );
  }, [firestore, patientUid]);

  const { data: rawEvents, loading } = useCollection<Event>(eventsQuery as any);

  // Client-side sort
  const events = useMemo(() => {
    if (!rawEvents) return [];
    return [...rawEvents].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [rawEvents]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Events</h1>
        {profile?.role !== 'patient' && (
          <Button asChild>
            <Link href="/events/new">
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
      </header>

      {(loading || userLoading) ? (
        <div className="flex h-64 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events && events.length > 0 ? (
            events.map((event) => (
              <Link href={`/events/${event.id}`} key={event.id}>
                <Card className="overflow-hidden transition-all hover:shadow-xl group">
                  <CardHeader className="p-0 relative group">
                    <div className="relative w-full aspect-video">
                      {event.coverPhotoUrl && (
                        <Image
                          src={event.coverPhotoUrl}
                          alt={event.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          data-ai-hint={event.coverPhotoHint}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => handleDelete(e, event)}
                        disabled={deletingIds.has(event.id!)}
                      >
                        {deletingIds.has(event.id!) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="absolute bottom-0 w-full p-4">
                    <h3 className="text-xl font-bold text-white font-headline">{event.title}</h3>
                    {event.date && (
                      <p className="text-sm text-gray-200">{format(new Date(event.date), 'MMMM d, yyyy')}</p>
                    )}
                    <p className="text-sm text-gray-300 mt-1">{event.memoryCount} {event.memoryCount === 1 ? 'memory' : 'memories'}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center">No events found.</p>
          )}
        </div>
      )}
    </div>
  );
}
