import {
  onSnapshot,
  type CollectionReference,
  type DocumentReference,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export type Live<T> = { data: T; loading: boolean; error: FirestoreError | null };

/** Lyssnar på ett dokument. `data` är null om det inte finns. */
export function useDoc<T>(ref: DocumentReference | null): Live<T | null> {
  const path = ref?.path ?? null;
  const [state, setState] = useState<Live<T | null> & { path: string | null }>({
    data: null,
    loading: true,
    error: null,
    path,
  });
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? (snap.data() as T) : null, loading: false, error: null, path }),
      (error) => setState({ data: null, loading: false, error, path }),
    );
    // Sökvägen räcker som beroende; ref är ett nytt objekt varje rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  if (!ref) return { data: null, loading: false, error: null };
  if (state.path !== path) return { data: null, loading: true, error: null };
  return state;
}

/** Lyssnar på en samling. Varje element får sitt dokument-id som `uid`. */
export function useCollection<T>(ref: CollectionReference | null): Live<(T & { uid: string })[]> {
  const path = ref?.path ?? null;
  const [state, setState] = useState<Live<(T & { uid: string })[]> & { path: string | null }>({
    data: [],
    loading: true,
    error: null,
    path,
  });
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (snap) =>
        setState({
          data: snap.docs.map((d) => ({ ...(d.data() as T), uid: d.id })),
          loading: false,
          error: null,
          path,
        }),
      (error) => setState({ data: [], loading: false, error, path }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  if (!ref) return { data: [], loading: false, error: null };
  if (state.path !== path) return { data: [], loading: true, error: null };
  return state;
}
