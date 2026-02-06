'use client';

import { useEffect, useState } from 'react';
import type {
  FirestoreError,
  Query,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

export type UseCollectionOptions = {
  listen: boolean;
};

const DEFAULT_OPTIONS: UseCollectionOptions = {
  listen: true,
};

export function useCollection<T = DocumentData>(
  query?: Query<T> | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
    setLoading(true);
    setError(undefined);

    const { listen } = options ?? DEFAULT_OPTIONS;

    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!listen) {
      // Not implemented for non-listening queries in this fix, 
      // but keeping structure for future expansion.
      // For now, if not listening, we just return.
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(docs);
        setLoading(false);
        setError(undefined);
      },
      (err: FirestoreError) => {
        console.error("Firestore Error in useCollection:", err);
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [query, options?.listen]);

  return { data, loading, error };
}
