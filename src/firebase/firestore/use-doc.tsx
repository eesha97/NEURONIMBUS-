'use client';

import { useEffect, useState } from 'react';
import type {
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

export type UseDocOptions = {
  listen: boolean;
};

const DEFAULT_OPTIONS = {
  listen: true,
};

export function useDoc<T>(
  ref?: DocumentReference<T> | null,
  options?: UseDocOptions
) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
    setLoading(true);
    setError(undefined);

    const { listen } = options ?? DEFAULT_OPTIONS;

    if (!ref) {
      setData(undefined);
      setLoading(false);
      return;
    }

    if (!listen) {
      // Not implemented
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          const d = snapshot.data();
          setData(d);
        } else {
          setData(undefined);
        }
        setLoading(false);
        setError(undefined);
      },
      (err) => {
        console.error("Firestore Error in useDoc:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [ref, options?.listen]);

  return { data, loading, error };
}
