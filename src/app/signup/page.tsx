'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';

import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 h-4 w-4"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Configuration error',
        description: 'App is not configured correctly.',
      });
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(cred.user, {
        displayName: name.trim(),
      });

      const newPatientId = 'patient_' + Math.random().toString(36).substring(2, 10);
      const batch = writeBatch(firestore);

      // 1. Create User Doc (Caregiver)
      batch.set(doc(firestore, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName: name.trim(),
        email: cred.user.email,
        role: 'caregiver',
        patientUid: newPatientId, // Auto-assign
        createdAt: serverTimestamp(),
      });

      // 2. Create Patient Doc (User role=patient)
      batch.set(doc(firestore, 'users', newPatientId), {
        uid: newPatientId,
        role: 'patient',
        displayName: 'My Patient', // Default name
        email: `${newPatientId}@memory-app.local`,
        createdAt: serverTimestamp(),
      });

      // 3. Create Directory Entry (For Linkage/Login)
      batch.set(doc(firestore, 'patient_directory', newPatientId), {
        uid: newPatientId,
        displayName: 'My Patient'
      });

      await batch.commit();

      router.replace('/dashboard');
    } catch (error: any) {
      console.error(error);
      let message = 'Something went wrong. Please try again.';
      if (error?.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error?.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      }

      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Configuration error',
        description: 'App is not configured correctly.',
      });
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const ref = doc(firestore, 'users', result.user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        const newPatientId = 'patient_' + Math.random().toString(36).substring(2, 10);
        const batch = writeBatch(firestore);

        // 1. Create User Doc
        batch.set(ref, {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          role: 'caregiver',
          patientUid: newPatientId, // Auto-assign
          createdAt: serverTimestamp(),
        });

        // 2. Create Patient Doc
        batch.set(doc(firestore, 'users', newPatientId), {
          uid: newPatientId,
          role: 'patient',
          displayName: 'My Patient',
          email: `${newPatientId}@memory-app.local`,
          createdAt: serverTimestamp(),
        });

        // 3. Create Directory Entry
        batch.set(doc(firestore, 'patient_directory', newPatientId), {
          uid: newPatientId,
          displayName: 'My Patient'
        });

        await batch.commit();
      }

      router.replace('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google signup failed',
        description: error.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Logo className="mb-8" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Caregiver Sign Up</CardTitle>
          <CardDescription>
            Create a caregiver account to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button disabled={loading} type="submit">
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleGoogleSignup}
            disabled={loading}
            type="button"
          >
            <GoogleIcon />
            Sign up with Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
