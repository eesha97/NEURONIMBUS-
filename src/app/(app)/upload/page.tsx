'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser } from '@/firebase';

import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, UploadCloud, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type SelectedImage = {
  file: File;
  previewUrl: string;
};

export default function UploadPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [caption, setCaption] = useState('');
  const [personLabel, setPersonLabel] = useState('');

  const [uploading, setUploading] = useState(false);

  // Redirect patients away from upload page
  if (profile?.role === 'patient') {
    router.push('/dashboard');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image')) {
      setSelectedImage({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    } else if (file) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please select an image file.',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !user || !profile?.patientUid || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please select an image and ensure you are logged in and assigned to a patient.',
      });
      return;
    }

    setUploading(true);

    try {
      const file = selectedImage.file;
      let photoUrl = '';
      let photoHint = '';
      let publicId = '';

      // 1. Generate SHA-256 hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const imageHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // 2. Check for duplicate in Firestore
      const memoriesCol = collection(firestore, 'memories');
      const q = query(
        memoriesCol,
        where("imageHash", "==", imageHash),
        where("patientUid", "==", profile.patientUid)
      );
      const querySnapshot = await getDocs(q);

      const normalizedLabel = personLabel.trim().toLowerCase();

      if (!querySnapshot.empty) {
        // DUPLICATE EXISTS
        const existingDoc = querySnapshot.docs[0];
        const existingRef = doc(firestore, 'memories', existingDoc.id);

        await updateDoc(existingRef, {
          labels: arrayUnion(normalizedLabel),
          uploadedBy: arrayUnion(user.uid),
          keywords: arrayUnion(personLabel.trim()),
          [`labelMap.${user.uid}`]: normalizedLabel
        });

        toast({
          title: 'Memory Updated!',
          description: `Image already exists. Added label "${personLabel}" to it.`,
        });

        router.push('/memories');
        return;
      }

      // 3. NO DUPLICATE - Proceed with Upload
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      photoUrl = data.url;
      publicId = data.publicId || '';
      photoHint = file.name.split('.')[0].replace(/_/g, ' ');

      let peopleArray: any[] = [];

      // Handle Person Labeling (Keeping existing logic for backward compatibility/People section)
      if (personLabel.trim()) {
        const safeLabel = normalizedLabel.replace(/\s+/g, '-');
        const personId = `${profile.patientUid}_${safeLabel}`;
        const personRef = doc(firestore, 'people', personId);
        const personSnap = await getDoc(personRef);

        if (!personSnap.exists()) {
          // Create new person
          await setDoc(personRef, {
            id: personId,
            patientUid: profile.patientUid,
            displayName: personLabel.trim(),
            faceThumbUrl: photoUrl,
            faceThumbHint: photoHint,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            relationshipTag: 'Friend/Family'
          });
        }

        peopleArray.push({
          id: personId,
          displayName: personLabel.trim(),
          faceThumbUrl: photoUrl,
          faceThumbHint: photoHint
        });
      }

      const memoryData = {
        ownerUid: user.uid,
        patientUid: profile.patientUid,
        photoUrl,
        publicId,
        photoHint,
        caption,
        imageHash,
        labels: [normalizedLabel].filter(Boolean),
        uploadedBy: [user.uid],
        labelMap: normalizedLabel ? { [user.uid]: normalizedLabel } : {},
        createdAt: serverTimestamp(),
        people: peopleArray,
        keywords: [personLabel.trim()].filter(Boolean),
        duplicateStatus: 'none',
        processing: { status: 'done' }
      };

      await addDoc(memoriesCol, memoryData);

      toast({
        title: 'Memory Uploaded!',
        description: `Saved and tagged with ${personLabel ? personLabel : 'no label'}.`,
      });

      router.push('/memories');

    } catch (err: any) {
      console.error("Upload failed:", err);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight font-headline">New Memory</h1>
        <p className="text-muted-foreground">Upload a photo and add details to create a new memory.</p>
      </header>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Choose an Image</CardTitle>
            <CardDescription>Upload a photo from your computer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="picture">Upload from your computer</Label>
              <Input id="picture" type="file" accept="image/*" className="h-auto" onChange={handleFileChange} disabled={uploading} />
            </div>

            {selectedImage && (
              <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                <Image
                  src={selectedImage.previewUrl}
                  alt="Image preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>2. Add Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="personLabel">Who is this? (Person Label)</Label>
                <Input
                  id="personLabel"
                  placeholder="e.g. Grandma, John, Mom"
                  value={personLabel}
                  onChange={(e) => setPersonLabel(e.target.value)}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">Type a name to group photos of this person together.</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea id="caption" placeholder="Describe the memory..." rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={uploading} />
              </div>
            </CardContent>
          </Card>

          {!profile?.patientUid && user && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Patient Not Assigned</AlertTitle>
              <AlertDescription>
                You must be assigned to a patient to upload memories. Please go to{' '}
                <Link href="/settings" className="font-bold underline">Settings</Link> to create a demo patient.
              </AlertDescription>
            </Alert>
          )}

          <Button size="lg" className="w-full" onClick={handleUpload} disabled={uploading || !selectedImage || !profile?.patientUid}>
            {uploading ? <><LoaderCircle className='mr-2 animate-spin' /> Uploading...</> : <><UploadCloud className='mr-2' /> Upload Memory</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
