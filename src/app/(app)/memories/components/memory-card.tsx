'use client';

import Image from 'next/image';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Memory } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Trash2, LoaderCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MemoryCardProps {
  memory: Memory;
  onClick?: () => void;
}

export function MemoryCard({ memory, onClick }: MemoryCardProps) {
  const { profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click (nav)
    if (!firestore || !memory.id) return;
    if (!confirm("Delete this memory including the image?")) return;

    setIsDeleting(true);
    try {
      // Delete image first
      if (memory.publicId) {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: memory.publicId }),
        });
      }
      await deleteDoc(doc(firestore, 'memories', memory.id));
      toast({ title: "Deleted", description: "Memory removed." });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: "Error", description: "Could not delete." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Show if NOT patient (fallback safe)
  const canDelete = profile?.role !== 'patient';
  return (
    <Card
      className={`flex flex-col overflow-hidden transition-shadow hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* IMAGE */}
      <CardHeader className="p-4 relative group">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
          <Image
            src={memory.photoUrl || '/placeholder.png'}
            alt={memory.caption || 'Memory image'}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover"
          />
        </div>
        {canDelete && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="flex-grow p-4 pt-0">
        {memory.createdAt && (
          <p className="text-sm text-muted-foreground">
            {format(
              // @ts-ignore - createdAt might be a Firestore Timestamp at runtime
              typeof memory.createdAt?.toDate === 'function'
                // @ts-ignore
                ? memory.createdAt.toDate()
                : new Date(memory.createdAt),
              'MMMM d, yyyy'
            )}
          </p>
        )}

        {memory.caption && (
          <p className="mt-2 text-base leading-relaxed">
            {memory.caption}
          </p>
        )}

        {memory.duplicateStatus === 'candidate' && (
          <Alert variant="destructive" className="mt-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Possible Duplicate</AlertTitle>
            <AlertDescription>
              This memory seems similar to another one.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="flex-col items-start gap-4 p-4 pt-0">
        {/* PEOPLE */}
        {/* PEOPLE - HIDDEN AS REQUESTED */}
        {/* {memory.people?.length > 0 && (
          <div className="flex -space-x-2 overflow-hidden">
            {memory.people.map((person) => (
              <Avatar
                key={person.id}
                className="h-8 w-8 border-2 border-card"
              >
                <AvatarImage
                  src={person.faceThumbUrl}
                  alt={person.displayName}
                />
                <AvatarFallback>
                  {person.displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )} */}

        {/* TAGS */}
        <div className="flex flex-wrap gap-2">
          {memory.keywords?.map((keyword) => (
            <Badge
              key={keyword}
              variant="secondary"
              className="font-normal"
            >
              {keyword}
            </Badge>
          ))}

          {memory.event && (
            <Badge
              variant="outline"
              className="font-normal border-accent text-accent-foreground"
            >
              {memory.event.title}
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
