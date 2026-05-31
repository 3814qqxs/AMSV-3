const PUNCT_MULTIPLIERS: [RegExp, number][] = [
  [/[.?!]$/, 2.5],
  [/[,;:]$/, 1.5],
  [/[—\-]$/, 1.3],
];

export function tokenInterval(token: string, baseInterval: number): number {
  for (const [re, mult] of PUNCT_MULTIPLIERS) {
    if (re.test(token)) return baseInterval * mult;
  }
  return baseInterval;
}

export function verseMarkerInterval(baseInterval: number): number {
  return baseInterval * 1.8;
}
