'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Plus, LoaderCircle, Trash2 } from 'lucide-react';
import { useCollection, useUser, useFirestore } from '@/firebase';
import type { NoteSession } from '@/lib/types';
import { collection, query, where, orderBy, limit, doc, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const PUBLIC_PATIENT_ID = 'patient123';

export default function NotesPage() {
  const { profile, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const patientUid = profile?.patientUid || PUBLIC_PATIENT_ID;

  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(5); // Default to show latest 5

  // Query for the most recent note session for this patient
  // Query for note sessions for this patient
  // Note: We removed orderBy('updatedAt', 'desc') to avoid needing a composite index. 
  // We will sort client-side.
  const sessionQuery = useMemo(() => {
    if (!firestore || !patientUid) return null;
    return query(
      collection(firestore, 'note_sessions'),
      where('patientUid', '==', patientUid)
    );
  }, [firestore, patientUid]);

  const { data: sessions, loading, error } = useCollection<NoteSession>(sessionQuery as any);

  // Client-side sort to get the latest session
  const currentSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    return [...sessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  }, [sessions]);

  // Helper to Create Session if none exists
  const createSessionWithNote = async (noteText: string) => {
    if (!firestore || !patientUid) return;
    try {
      const noteData = {
        id: crypto.randomUUID(),
        text: noteText,
        createdAt: Date.now()
      };

      await addDoc(collection(firestore, 'note_sessions'), {
        caregiverUid: profile?.uid || 'unknown',
        patientUid,
        title: `Notes for ${format(new Date(), 'MMM d')}`,
        notes: [noteData], // Initialize with the note
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setNewNote('');
      toast({ title: 'Note added' });
    } catch (e) {
      console.error("Error creating session", e);
      toast({ variant: 'destructive', title: 'Error adding note' });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !firestore || submitting) return;

    setSubmitting(true);
    try {
      // If no session exists, create one with the note immediately
      if (!currentSession) {
        await createSessionWithNote(newNote.trim());
        return;
      }

      const noteData = {
        id: crypto.randomUUID(),
        text: newNote.trim(),
        createdAt: Date.now()
      };

      const docRef = doc(firestore, 'note_sessions', currentSession.id);
      await updateDoc(docRef, {
        notes: arrayUnion(noteData),
        updatedAt: Date.now()
      });

      setNewNote('');
      toast({ title: 'Note added' });
    } catch (error) {
      console.error('Failed to add note', error);
      toast({ variant: 'destructive', title: 'Error adding note' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteToDelete: any) => {
    if (!firestore || !currentSession) return;
    if (!confirm('Delete this note?')) return;

    try {
      const docRef = doc(firestore, 'note_sessions', currentSession.id);

      // Robust filtering: prefer ID, fallback to createdAt uniqueness
      const updatedNotes = currentSession.notes.filter(n => {
        if (noteToDelete.id && n.id) {
          return n.id !== noteToDelete.id;
        }
        // Fallback for legacy notes without IDs
        return n.createdAt !== noteToDelete.createdAt;
      });

      await updateDoc(docRef, {
        notes: updatedNotes,
        updatedAt: Date.now()
      });
      toast({ title: 'Note deleted' });
    } catch (error) {
      console.error('Failed to delete', error);
      toast({ variant: 'destructive', title: 'Error deleting note' });
    }
  };

  if (loading || userLoading) {
    return <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  // Ensure we have a valid session object even if empty (UI handle)
  const displayNotes = currentSession?.notes ? [...currentSession.notes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : [];
  const visibleNotes = displayNotes.slice(0, historyLimit);
  const remainingCount = Math.max(0, displayNotes.length - historyLimit);

  const handleLoadHistory = () => {
    setHistoryLimit(prev => prev + 5);
  };

  if (!currentSession && !loading) {
    // If genuinely no session, show empty state but call create logic if they try to add
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Memory Notes</h1>
      </header>
      <div className="grid gap-8 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>{currentSession?.title || 'Daily Notes'}</CardTitle>
            <CardDescription>Add fragmented notes below.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* INPUT AREA - Hide for patients */}
            {profile?.role !== 'patient' && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a new note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                />
                <Button size="icon" className="h-auto aspect-square" onClick={handleAddNote} disabled={submitting || !newNote.trim()}>
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            )}

            <div className="space-y-3 mt-4">
              {visibleNotes.length > 0 ? visibleNotes.map((note, index) => (
                <div key={note.id || index} className="flex items-start gap-3 group">
                  <div className="text-sm text-muted-foreground min-w-16 text-right pt-2">
                    {format(new Date(note.createdAt), 'h:mm a')}
                  </div>
                  <div className="flex-1 rounded-md border bg-muted/50 p-3 text-sm flex justify-between items-start gap-2">
                    <span className="whitespace-pre-wrap">{note.text}</span>
                    {profile?.role !== 'patient' && (
                      <button
                        onClick={() => handleDeleteNote(note)}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded opacity-70 hover:opacity-100 transition-opacity"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">No notes recorded yet.</p>
              )}

              {remainingCount > 0 && (
                <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={handleLoadHistory}>
                  History ({remainingCount} more)
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
