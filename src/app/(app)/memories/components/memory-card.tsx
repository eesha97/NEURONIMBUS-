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
import { deleteDoc, doc, updateDoc, arrayRemove, deleteField } from 'firebase/firestore';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface MemoryCardProps {
  memory: Memory;
  onClick?: () => void;
}

export function MemoryCard({ memory, onClick }: MemoryCardProps) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !memory.id || !user) return;

    const isLastCaregiver = memory.uploadedBy
      ? (memory.uploadedBy.length === 1 && memory.uploadedBy.includes(user.uid))
      : (memory.ownerUid === user.uid);

    const confirmMsg = isLastCaregiver
      ? "Delete this memory including the image?"
      : "Remove your label from this shared memory?";

    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const memoryRef = doc(firestore, 'memories', memory.id);

      const isNewFormat = Array.isArray(memory.labels);
      const isOldFormat = !isNewFormat && !!memory.label;

      let willBeEmpty = false;
      let currentLabelToRemove = null;
      let shouldRemoveLabelFromArray = false;

      if (isOldFormat) {
        willBeEmpty = true;
      } else if (isNewFormat) {
        const isLastCaregiver = (memory.uploadedBy?.length === 1 && memory.uploadedBy.includes(user.uid));

        const currentLabel = memory.labelMap?.[user.uid];
        const otherLabels = Object.entries(memory.labelMap || {})
          .filter(([uid]) => uid !== user.uid)
          .map(([, label]) => label);

        shouldRemoveLabelFromArray = !!(currentLabel && !otherLabels.includes(currentLabel));
        currentLabelToRemove = currentLabel;

        willBeEmpty = isLastCaregiver || (memory.labels.length === 1 && shouldRemoveLabelFromArray);
      } else {
        // Fallback for docs without labels array or singular label
        willBeEmpty = (memory.ownerUid === user.uid || memory.caregiverUid === user.uid);
      }

      if (willBeEmpty) {
        // Delete image first
        if (memory.publicId) {
          await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId: memory.publicId }),
          });
        }
        await deleteDoc(memoryRef);
        toast({ title: "Deleted", description: "Memory removed successfully." });
      } else {
        // Just remove this caregiver's association
        const updates: any = {
          uploadedBy: arrayRemove(user.uid),
          [`labelMap.${user.uid}`]: deleteField()
        };
        if (shouldRemoveLabelFromArray && currentLabelToRemove) {
          updates.labels = arrayRemove(currentLabelToRemove);
        }
        await updateDoc(memoryRef, updates);
        toast({ title: "Removed", description: "Your association has been removed." });
      }
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

        {/* KEYWORDS & LABELS (Vertical Separation) */}
        <div className="mt-2 flex flex-col gap-1.5">
          {(() => {
            const labels = (memory.labels || []).filter(Boolean);
            const keywords = (memory.keywords || []).filter(k => !labels.includes(k.toLowerCase())).filter(Boolean);

            if (labels.length === 0 && keywords.length === 0) {
              return <p className="text-sm font-bold text-muted-foreground lowercase leading-relaxed">{memory.caption}</p>;
            }

            return (
              <>
                {/* Line 1: Keywords (GRAY, LOWERCASE) */}
                {keywords.length > 0 && (
                  <p className="text-sm font-bold text-muted-foreground lowercase leading-tight">
                    {keywords.join(" • ")}
                  </p>
                )}

                {/* Line 2: Labels (BLACK OVAL BADGES, UPPERCASE) */}
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {labels.map((label, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="rounded-full border-black text-black font-bold uppercase text-[10px] py-0 px-2 h-5"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

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
        {/* TAGS */}
        <div className="flex flex-wrap gap-2">
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
