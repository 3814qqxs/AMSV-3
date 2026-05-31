// Centralised API client.
// In dev: Vite proxy maps /api/* → http://localhost:8000/*
// In prod: set VITE_API_URL to the deployed FastAPI origin (e.g. https://api.amsv.app)

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

async function get<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    let detail = "";
    try { detail = ((await res.json()) as { detail?: string }).detail ?? ""; } catch { /* unparseable body */ }
    throw new Error(`AMSV API ${res.status} ${path}${detail ? `: ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export type Verse = { book: string; chapter: number; verse: number; text: string; tempo_hint?: number | null };
export type LinkedRef = { ref: string; phrase?: string };
export type CommentaryEntry = { initials: string; text: string; links?: LinkedRef[] };

export function fetchChapter(
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Verse[]> {
  return get<Verse[]>("/chapter", { book, chapter }, signal);
}

export function fetchCrossRefs(
  book: string,
  chapter: number,
  verse: number,
): Promise<LinkedRef[]> {
  return get<LinkedRef[]>("/cross-refs", { book, chapter, verse });
}

export function fetchCommentary(
  book: string,
  chapter: number,
  verse: number,
): Promise<CommentaryEntry | null> {
  return get<CommentaryEntry | null>("/commentary", { book, chapter, verse });
}
