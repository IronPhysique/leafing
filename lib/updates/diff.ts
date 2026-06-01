export interface FetchedChapter {
  ref: string;
  number: string;
}

export interface DiffResult {
  newRefs: string[];
  newCount: number;
}

export function diffChapters(
  known: string[],
  fetched: FetchedChapter[]
): DiffResult {
  if (known.length === 0) {
    return { newRefs: [], newCount: 0 };
  }

  const knownSet = new Set(known);
  const newRefs = fetched
    .map((c) => c.ref)
    .filter((ref) => !knownSet.has(ref));

  return { newRefs, newCount: newRefs.length };
}
