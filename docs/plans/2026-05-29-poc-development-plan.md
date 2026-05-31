# AMSV-3 POC Development Plan
**Date:** 2026-05-29
**Status:** Active — pending execution
**Scope:** Close out the 5 POC items defined in `AGENTS.md`

---

## Overview

The POC is declared complete when all five reading-experience milestones pass end-to-end. Work runs on two parallel tracks. The backend track is a single additive schema change. The frontend track delivers four independent improvements to the reading loop. An integration step wires both tracks together.

---

## Track A — Backend: `tempo_hint` Schema

**Owner:** Copilot / Data Engineer
**Dependencies:** None (runs in parallel with Track B)

### A-1 — Model + migration
- Add `tempo_hint = Column(Float, nullable=True)` to `BibleText` in [backend/app/models.py](backend/app/models.py)
- Create [backend/migrations/versions/0003_add_tempo_hint.py](backend/migrations/versions/0003_add_tempo_hint.py):
  ```sql
  ALTER TABLE bible_text ADD COLUMN tempo_hint FLOAT;
  ```
- Run `alembic upgrade head` against the dev DB, verify column exists

### A-2 — Schema + endpoint update
- Add `tempo_hint: float | None = None` to `VerseRead` in [backend/app/schemas.py](backend/app/schemas.py)
- Add `tempo_hint: float | None = None` to a new `ChapterVerseReadFull` schema (or extend `ChapterVerseRead`)
- Update the `/chapter` endpoint response in [backend/app/main.py](backend/app/main.py) to include `tempo_hint` from each verse row
- Guard on the way out: if `tempo_hint is not None and tempo_hint <= 0`, coerce to `None`

### A-3 — Tests
- Add a test in [backend/tests/test_api.py](backend/tests/test_api.py) that:
  - Creates a verse with no `tempo_hint` → `/chapter` returns `"tempo_hint": null`
  - Creates a verse with `tempo_hint=1.3` → `/chapter` returns `"tempo_hint": 1.3`
  - Creates a verse with `tempo_hint=0` → `/chapter` returns `"tempo_hint": null` (guard applied)

**Exit criterion:** `pytest backend/` passes, `/chapter` response includes `tempo_hint` for every verse.

---

## Track B — Frontend: Four Reading Experience Items

**Owner:** Claude Code / UX & Frontend
**Dependencies:** None (runs in parallel with Track A)

### B-1 — Breath Word Animation
**File:** [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](frontend/scripture-flow/src/components/reader/ReadingPane.tsx)

Replace the current 3D zoom animation (lines ~283–311) with the breath arrival spec:

```ts
// REMOVE: scale: 0.35, z: -400, filter: "blur(14px)", rotateX: -20
// REPLACE WITH:
initial: { opacity: 0, y: 10, filter: "blur(3px)", scale: 0.97 }
animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, ...color/shadow }
transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
```

- Remove `transformStyle: "preserve-3d"` and `perspective-stage` CSS class usage
- Remove the `z` property from the motion span
- Validate against `frontend/scripture-flow/public/prototype_atmosphere.html` — open in browser to compare feel

**Exit criterion:** Words arrive with soft opacity+translateY+scale, no 3D rotation or zoom depth.

---

### B-2 — Verse-Paced Background Scroll
**File:** [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](frontend/scripture-flow/src/components/reader/ReadingPane.tsx)

Currently the background scroll fires on every `revealed` change. It should only fire when the **active verse number changes**.

- Add a `useRef` (or derived value) that tracks the last verse number that triggered a background scroll
- Change the background scroll `useEffect` dependency from `[revealed]` to `[activeVerseRef]` where `activeVerseRef` updates only on verse boundary

Implementation sketch:
```ts
const lastScrolledVerse = useRef<number>(-1);
// inside the active verse useEffect:
if (last && last.verse !== lastScrolledVerse.current) {
  lastScrolledVerse.current = last.verse;
  bgRef.current?.scrollTo({ top: bgRef.current.scrollHeight - bgRef.current.clientHeight, behavior: "smooth" });
}
```

**Exit criterion:** Background text scrolls once per completed verse, not on every word reveal.

---

### B-3 — Punctuation-Aware Timing
**New file:** [frontend/scripture-flow/src/lib/timing.ts](frontend/scripture-flow/src/lib/timing.ts)

Create a pure function:
```ts
const MULTIPLIERS: [RegExp, number][] = [
  [/[.?!]$/, 2.5],
  [/[,;:]$/, 1.5],
  [/[—\-]$/, 1.3],
];

export function tokenInterval(token: string, baseInterval: number): number {
  for (const [re, mult] of MULTIPLIERS) {
    if (re.test(token)) return baseInterval * mult;
  }
  return baseInterval;
}

export function verseMarkerInterval(baseInterval: number): number {
  return baseInterval * 1.8;
}
```

**Update ReadingPane playback timer:**
- Replace the flat `window.setInterval` with a recursive `setTimeout` chain
- For each token, compute `tokenInterval(token.text, baseInterval)` before scheduling the next reveal
- Verse marker tokens use `verseMarkerInterval`

**Exit criterion:** Sentences with terminal punctuation have a noticeable pause; commas have a shorter pause; plain words run at base WPM.

---

### B-4 — Chrome Recession During Playback
**Files:**
- [frontend/scripture-flow/src/styles.css](frontend/scripture-flow/src/styles.css)
- [frontend/scripture-flow/src/routes/index.tsx](frontend/scripture-flow/src/routes/index.tsx)
- [frontend/scripture-flow/src/components/reader/TopBar.tsx](frontend/scripture-flow/src/components/reader/TopBar.tsx)

**Step 1 — CSS rule** (add to `styles.css`):
```css
[data-reading="true"] .chrome-element {
  opacity: 0.2;
  transition: opacity 0.8s ease;
}
.chrome-element {
  transition: opacity 0.8s ease;
}
```

**Step 2 — Wire `data-reading` to `<main>`** in `index.tsx`:
```tsx
<main
  className="relative h-screen w-screen overflow-hidden"
  data-reading={playing ? "true" : undefined}
>
```

**Step 3 — Tag chrome elements** with `chrome-element` class:
- `TopBar` root element
- Verse badge div (`v. {activeVerse}`)
- Watermark div (`Lectio · ASV`)
- Pull-down handle in `ReadingPane`
- Speed hint zone in `ReadingPane`

**Exit criterion:** While `playing=true`, all chrome elements fade to ~20% opacity. Tap to pause → all chrome fades back to full immediately.

---

## Track C — Integration: Frontend consumes `tempo_hint`

**Dependencies:** Track A complete + Track B-3 complete
**Owner:** Claude Code / UX & Frontend

### C-1 — Update API types
**File:** [frontend/scripture-flow/src/lib/api.ts](frontend/scripture-flow/src/lib/api.ts)

```ts
// Update Verse type:
export type Verse = { book: string; chapter: number; verse: number; text: string; tempo_hint?: number | null };
```

### C-2 — Apply `tempo_hint` in playback timer
**File:** [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](frontend/scripture-flow/src/components/reader/ReadingPane.tsx)

In the setTimeout chain (from B-3):
- When advancing to a new verse, look up `verses.find(v => v.verse === nextVerseNumber)?.tempo_hint`
- Guard: `if (tempo_hint && tempo_hint > 0)` — multiply `baseInterval` by `tempo_hint` for the verse duration
- Default (`null` / `0`): punctuation rules only (no verse-level multiplier)

**Exit criterion:** A verse with `tempo_hint=0.7` reads measurably faster than adjacent verses; a verse with `tempo_hint=1.5` reads slower. Null/0 falls through to punctuation rules unchanged.

---

## Optimal Development Sequence

```
Day 1
├── [A-1] tempo_hint migration + model update
├── [B-1] Breath animation (self-contained, visible immediately)
└── [B-4] Chrome recession (self-contained, CSS + 2 attribute changes)

Day 2
├── [A-2] Schema + endpoint update
├── [A-3] Backend tests
├── [B-2] Verse-paced background scroll
└── [B-3] Punctuation timing (timing.ts + setTimeout chain)

Day 3
└── [C-1 + C-2] Integration: tempo_hint wired end-to-end
    └── Manual QA: open app, verify all 5 POC items end-to-end
```

Rationale: B-1 and B-4 are the most visible wins and have zero dependencies — ship them first for immediate feedback. B-2 and B-3 require more ReadingPane surgery. C depends on both tracks being stable.

---

## Plan Revisit Policy

- **Trigger for next session plan**: `/closeout` after all 5 POC items pass QA → update `PROJECT_HISTORY.md` → new `/brainstorm` for Phase 2
- **Natural Phase 2 entry point**: Verse picker (no schema changes, new route + component only)
- **Infrastructure risk watch**: Any feature requiring user identity (reading history sync, shared annotations) will need a `users` table and would touch every data model. Flag this before designing any "sign in" feature.

---

## POC Completion Checklist

- [ ] A-1: `tempo_hint` column in DB, migration runs clean
- [ ] A-2: `/chapter` response includes `tempo_hint` per verse
- [ ] A-3: Backend tests pass (including `tempo_hint` cases)
- [ ] B-1: Breath animation — no 3D transforms, soft opacity+blur+y arrival
- [ ] B-2: Background scrolls only at verse boundaries
- [ ] B-3: Punctuation pauses perceptible; `.` = 2.5× longer than plain word
- [ ] B-4: Chrome fades to 20% during playback, returns on pause
- [ ] C-2: `tempo_hint` respected as per-verse interval multiplier, 0/null falls through
