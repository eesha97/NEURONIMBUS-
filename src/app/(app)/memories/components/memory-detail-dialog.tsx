'use client';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Trash2, LoaderCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { deleteDoc, doc, updateDoc, arrayRemove, deleteField } from 'firebase/firestore';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Memory } from '@/lib/types';
import Image from 'next/image';

interface MemoryDetailDialogProps {
    memory: Memory | null;
    isOpen: boolean;
    onClose: () => void;
}

export function MemoryDetailDialog({ memory, isOpen, onClose }: MemoryDetailDialogProps) {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!memory) return null;

    const isCaregiver = profile?.role === 'caregiver';

    const handleDelete = async () => {
        if (!firestore || !memory.id || !user) return;

        const isNewFormat = Array.isArray(memory.labels);
        const isOldFormat = !isNewFormat && !!memory.label;

        let willFullDelete = false;
        let currentLabelToRemove = null;
        let shouldRemoveLabelFromArray = false;

        if (isOldFormat) {
            willFullDelete = true;
        } else if (isNewFormat) {
            const isLastCaregiver = (memory.uploadedBy?.length === 1 && memory.uploadedBy.includes(user.uid));

            const currentLabel = memory.labelMap?.[user.uid];
            const otherLabels = Object.entries(memory.labelMap || {})
                .filter(([uid]) => uid !== user.uid)
                .map(([, label]) => label);

            shouldRemoveLabelFromArray = !!(currentLabel && !otherLabels.includes(currentLabel));
            currentLabelToRemove = currentLabel;

            willFullDelete = isLastCaregiver || (memory.labels.length === 1 && shouldRemoveLabelFromArray);
        } else {
            // Fallback for docs without labels array or singular label
            willFullDelete = (memory.ownerUid === user.uid || memory.caregiverUid === user.uid);
        }

        const confirmMsg = willFullDelete
            ? "Are you sure you want to delete this memory? This will remove it for everyone and delete the image."
            : "Are you sure you want to remove your label from this memory? Others will still see it.";

        if (!confirm(confirmMsg)) return;

        setIsDeleting(true);
        try {
            const memoryRef = doc(firestore, 'memories', memory.id);

            if (willFullDelete) {
                // Delete from Cloudinary if publicId exists
                if (memory.publicId) {
                    await fetch('/api/delete-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publicId: memory.publicId }),
                    });
                }
                await deleteDoc(memoryRef);
                toast({ title: 'Memory Deleted', description: 'Removed successfully.' });
            } else {
                const updates: any = {
                    uploadedBy: arrayRemove(user.uid),
                    [`labelMap.${user.uid}`]: deleteField()
                };
                if (shouldRemoveLabelFromArray && currentLabelToRemove) {
                    updates.labels = arrayRemove(currentLabelToRemove);
                }
                await updateDoc(memoryRef, updates);
                toast({ title: 'Removed', description: 'Your association has been removed.' });
            }
            onClose();
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete memory.' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0">

                {/* MEDIA HEADER (Full Width) */}
                <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                    <Image
                        src={memory.photoUrl}
                        alt={memory.caption || 'Memory'}
                        fill
                        className="object-contain"
                    />
                </div>

                <div className="p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-headline leading-tight">
                            {memory.caption || 'Untitled Memory'}
                        </DialogTitle>
                        {memory.createdAt && (
                            <p className="text-muted-foreground">
                                {format(
                                    // @ts-ignore
                                    typeof memory.createdAt?.toDate === 'function' ? memory.createdAt.toDate() : new Date(memory.createdAt),
                                    'MMMM d, yyyy'
                                )}
                            </p>
                        )}
                    </DialogHeader>

                    {/* PEOPLE section */}
                    {memory.people && memory.people.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People</h4>
                            <div className="flex flex-wrap gap-4">
                                {memory.people.map(p => (
                                    <div key={p.id} className="flex items-center gap-2">
                                        <Avatar className="h-10 w-10 border-2 border-background">
                                            <AvatarImage src={p.faceThumbUrl} />
                                            <AvatarFallback>{p.displayName[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{p.displayName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EVENT & KEYWORDS */}
                    <div className="flex flex-wrap gap-2">
                        {memory.event && (
                            <Badge variant="outline" className="text-sm py-1 px-3 border-accent text-accent-foreground">
                                Event: {memory.event.title}
                            </Badge>
                        )}
                        {memory.keywords?.map(k => (
                            <Badge key={k} variant="secondary" className="text-sm py-1 px-3">
                                {k}
                            </Badge>
                        ))}
                    </div>

                    <DialogFooter className="mt-8 pt-4 border-t">
                        {isCaregiver && (
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="w-full sm:w-auto"
                            >
                                {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete Memory
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto mt-2 sm:mt-0">
                            Close
                        </Button>
                    </DialogFooter>
                </div>

            </DialogContent>
        </Dialog>
    );
}
