'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { LoaderCircle, User } from 'lucide-react';

export default function PatientLoginPage() {
    const [patientId, setPatientId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const firestore = useFirestore();
    const router = useRouter();
    const auth = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!firestore || !patientId.trim() || !auth) return;

        setLoading(true);

        try {
            const targetId = patientId.trim();
            // 1. Verify ID exists in directory (public)
            // 1. Verify ID exists in directory (public) or Users collection
            const docRef = doc(firestore, 'patient_directory', targetId);
            let docSnap = await getDoc(docRef);
            let patientName = '';

            if (docSnap.exists()) {
                patientName = docSnap.data().displayName;
            } else {
                // Fallback: Check authoritative User collection
                const userDocRef = doc(firestore, 'users', targetId);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists() && userSnap.data().role === 'patient') {
                    docSnap = userSnap; // Treat as valid
                    patientName = userSnap.data().displayName;
                } else {
                    setError('Invalid Patient ID. Please check with your caregiver.');
                    setLoading(false);
                    return;
                }
            }

            const patientData = { displayName: patientName };

            // 2. Sign In Anonymously to get a valid Firebase Token
            // This ensures we can read protected collections like Events/Notes
            await signInAnonymously(auth);

            // 3. Persist ID to local storage so useUser can find the profile
            localStorage.setItem('neuro_patient_uid', targetId);
            localStorage.setItem('neuro_patient_name', patientData.displayName);

            router.push('/dashboard');

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/admin-restricted-operation') {
                setError('Anonymous Auth is disabled in Firebase Console. Please enable it under Authentication > Sign-in method.');
            } else {
                setError('Login failed. Please try again.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <Logo className="mb-8" />

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <User className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Patient Access</CardTitle>
                    <CardDescription className="text-center">
                        Enter your Patient ID to view your memories.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="patientId">Patient ID</Label>
                            <Input
                                id="patientId"
                                placeholder="e.g. patient_..."
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive font-medium text-center">
                                {error}
                            </div>
                        )}

                        <Button disabled={loading || !patientId.trim()} type="submit" className="w-full">
                            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enter
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <p className="mt-8 text-muted-foreground text-sm">
                Caregivers, please <a href="/login" className="underline hover:text-primary">log in here</a>.
            </p>
        </div>
    );
}
