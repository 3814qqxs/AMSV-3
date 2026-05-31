# AMSV-3 Project History

---

## Session 2026-05-29 — POC Build Sprint

**Goal:** Execute all POC items from `2026-05-29-poc-development-plan.md` and refine the reading experience.

---

### A — Backend: `tempo_hint`

- Added `tempo_hint = Column(Float, nullable=True)` to `BibleText` model ([backend/app/models.py](../../backend/app/models.py))
- Created Alembic migration `0003_add_tempo_hint.py` — `ALTER TABLE bible_text ADD COLUMN tempo_hint FLOAT`
- Extended `VerseCreate`, `VerseRead`, `ChapterVerseRead` schemas with `tempo_hint: float | None = None`
- Updated `/chapter` endpoint to expose `tempo_hint`; coerces `0` → `null`
- Added 3 TDD tests (all green): null default, value passthrough, zero coercion
- Created `backend/Dockerfile` (python:3.12-slim) after docker-compose run failed with missing image

---

### B — Frontend: Reading Experience

**B-1 Breath animation**
- Replaced 3D zoom (`scale: 0.35, z: -400, rotateX`) with breath arrival: `opacity 0 → 1, y 10 → 0, blur(3px) → 0, scale 0.97 → 1`
- Transition: `duration 0.55, ease [0.16, 1, 0.3, 1]`
- Removed `transformStyle: preserve-3d` and `perspective-stage` class

**B-2 Verse-paced background scroll**
- Added `lastScrolledVerse = useRef(-1)` — background scroll fires only when active verse number changes, not on every word reveal

**B-3 Punctuation-aware timing**
- Created `frontend/scripture-flow/src/lib/timing.ts` with `tokenInterval` and `verseMarkerInterval`
- Multipliers: `.?!` → 2.5×, `,;:` → 1.5×, `—-` → 1.3×, verse marker → 1.8×
- Replaced `setInterval` with recursive `setTimeout` chain in ReadingPane

**B-4 Chrome recession**
- Added `@utility chrome-element` and `[data-reading="true"] .chrome-element { opacity: 0.2 }` to `styles.css`
- Wired `data-reading={playing ? "true" : undefined}` to `<main>`
- Tagged: TopBar, verse badge, watermark, pull-down handle, speed zone

---

### C — Integration: `tempo_hint` in playback

- Updated `Verse` type in `api.ts` to include `tempo_hint?: number | null`
- Applied in ReadingPane `scheduleNext`: at verse boundary, `verseBaseRef.current = globalBase / hint` when hint > 0

---

### Post-POC UI Iterations

**NavSheet (iOS-style swipe-up navigation)**
- Replaced TopBar picker with full-screen sheet (`fixed inset-0 z-50`, spring `stiffness: 300, damping: 32`)
- Drag-to-dismiss on y-axis; horizontal plane transition between book → chapter views
- BookPicker: OT/NT toggle + section-grouped grid (2–3 cols, 10 testament sections)
- ChapterPicker: `← Books` back button, chapter grid (5–7 cols), swipe-right to go back
- Plane transition: books exit `x: -30%`, chapters enter `x: 100% → 0`, ease `[0.32, 0.72, 0, 1]`
- Committing a chapter sets ref and auto-starts playback

**TopBar**
- Rewritten to display-only: `pointer-events-none`, shows book name / chapter number / "ASV"

**Pull-down handle fixes**
- `dragConstraints={{ top: 0, bottom: 0 }}`, `dragElastic={0}`, removed `style={{ y: pullY }}` binding — handle stays static

**HistoryPane fixes**
- `wasPlayingRef` captures pre-pulldown play state; restored on `onClose`
- Added `onNavigate` prop + "Change" button in header → opens NavSheet

**DevPane removal**
- Removed DevPane, DevButton, `userEdits`, all localStorage effects and `NOTES_KEY` from `index.tsx`
- Removed developer icon as per user request

**Default reference**
- Changed from Genesis 1 → John 1

**Swipe-up handle (index.tsx)**
- Thin `h-1 w-10` pill below the reading card; pointer events open NavSheet on upward swipe ≥ 40px

**Speed zone**
- Replaced chevron UI with thin pill indicator matching nav home bar visual language
- Subsequently simplified further: removed pill/WPM toggle, now always displays `{wpm} wpm` as persistent `text-primary/70` label; removed chrome recession from this zone so it stays visible during playback
- Removed unused `AnimatePresence` import from ReadingPane

---

### Bugs Fixed

| Bug | Fix |
|-----|-----|
| Playback didn't resume after HistoryPane close | `wasPlayingRef` pattern |
| Pull-down handle moved during drag | Removed `y` motion binding, `dragElastic={0}` |
| `timerRef` TypeScript error (0 args) | `useRef<... \| undefined>(undefined)` |
| `clearTimeout` null mismatch | Changed initial from `null` to `undefined` |
| Stale `userEdits` destructure | Removed after DevPane deletion |
| `PointerEvent<T>` not generic | `React.PointerEvent<HTMLDivElement>` with `React` namespace import |
| OT references not loading | Docker was not running (user-side) |

---

### Pre-existing Errors (unresolved, non-blocking)

- `BackgroundPane`, `HistoryPane`, `ReadingPane` — `Verse` import not exported from `@/lib/bible`
- `utils.ts` — missing `clsx` / `tailwind-merge`
- `wpmTimerRef` — `useRef` called with 0 args

These do not block the Vite dev build.

---

### POC Completion Checklist

- [x] A-1: `tempo_hint` column in DB, migration runs clean
- [x] A-2: `/chapter` response includes `tempo_hint` per verse
- [x] A-3: Backend tests pass (13/13 green)
- [x] B-1: Breath animation — no 3D transforms, soft opacity+blur+y arrival
- [x] B-2: Background scrolls only at verse boundaries
- [x] B-3: Punctuation pauses perceptible; `.` = 2.5× longer than plain word
- [x] B-4: Chrome fades to 20% during playback, returns on pause
- [x] C-2: `tempo_hint` respected as per-verse interval multiplier, 0/null falls through

---

### Next Phase Considerations

- Phase 2 entry point: commentary + cross-reference data entry via GitHub (user-directed, separate activity)
- Infrastructure risk: any "sign in" / reading history sync feature requires a `users` table — flag before designing
- Revisit plan trigger: `/closeout` → update this file → new `/brainstorm` for Phase 2

---

## Session 2026-05-31 — V2 Build Sprint

**Source:** `2026-05-30-uat-poc.md` + `2026-05-31-v2-development-plan.md`
**Restore point:** git commit `restore: POC v1 complete — pre-V2 implementation` (first commit on repo)

---

### Track 1 — Bug Fixes

**1-A Background scroll cadence**
Replaced `revealed`-dependent background scroll with a dedicated `bgScrollVerse` state. Updates only when the active verse number changes. Scroll effect depends on `bgScrollVerse` alone — one scroll per verse boundary.

**1-B/C NavSheet spring-close + drag pill in chapters view**
Removed the `view === "books"` guard from `handleSheetDragEnd` — sheet dismisses on y-drag from either view. Removed `drag="x"` from the chapter motion plane (UAT 6.17 skipped), eliminating the touch-event conflict blocking the outer y-drag.

**1-D NavSheet state reset on second navigation**
Added `useEffect` watching `open`: resets `view → "books"`, `selectedBook → null`, `testament → defaultTestament` on every open. Fixes the second-navigation failure.

**1-E Animation jank**
Added `willChange: "transform"` and `willChange: "transform, opacity, filter"` to NavSheet, HistoryPane, ReadingPane word spans, and pull-down handle.

**1-F Long-book (Psalms) load failure**
Rewrote import script regex to `^(.+?)\s+(\d+):(\d+)\s+(.+)$` — lazy `.+?` captures multi-word book names. Added `BOOK_NAME_MAP` normalization dict (e.g., "Psalm" → "Psalms", "Song of Songs" → "Song of Solomon"). Skipped-line counter added to import output.

---

### Track 2 — Interaction Model

**2-A Tap anywhere to play/pause**
Added pointer handlers to ReadingPane root div with a 5px distance guard. Speed zone and end-of-chapter buttons call `e.stopPropagation()`.

**2-B HistoryPane swipe-up to close**
Replaced "Close" button with a top drag-handle pill (`drag="y"`, `dragElastic={{ top: 0.25, bottom: 0 }}`). Dismiss on `offset.y < -60 || velocity.y < -400`.

**2-C HistoryPane bottom strip opens NavSheet**
Replaced "Change" button with a bottom swipe-up strip. Swipe up ≥ 40px calls `onNavigate`. Structure: top handle (close) → text → bottom strip (navigate to NavSheet).

**2-D NavSheet defaults to current book's testament**
Added `currentBook: string` prop. Derives `defaultTestament` via `useMemo`. Resets to active book's testament on every open.

**2-E Touch targets for side panes**
Added recessed left/right edge tap buttons on reading card. Both carry `chrome-element` class; thin `h-10 w-1` pill indicators.

---

### Track 3 — Visual Polish

**3-A AMSV label** — "ASV" → "AMSV" in TopBar, watermark, page title, and meta.

**3-B Chrome recession unification** — Removed `chrome-element` from TopBar and verse badge. Both stay fully visible during playback, matching WPM behaviour.

**3-C End-of-chapter arrows** — Replaced text with `← Prev` / `Next →` buttons using Lucide chevrons. Props `onPrev` / `onNext` added to ReadingPane.

**3-D ← Books pin** — Confirmed already in `shrink-0` header above the scrollable grid; annotated in code.

---

### Track 4 — Phase 2 Features

**4-A Phrase-based reveal** — `phraseMode?: boolean` prop. Pre-computes `phraseEnd[]` map; phrases are ≤3 words broken at punctuation. `scheduleNext` advances to `phraseEnd[current] + 1` in one step.

**4-B Three-line stage** — Stage height `lineHeightPx * 3`, scroll target `(lineIndex - 2) * lh`, bottom `mask-image` gradient blends into background.

**4-C Cinematic cross-ref transition** — New `CrossRefTransition` component: source text scrolls upward rapidly (1.4 s), target ref fades in at center. `jumpToRef` triggers, waits 1.1 s, loads chapter, clears overlay.

**4-D Speed presets** — `SPEED_PRESETS = [150, 250, 400]` with `Low / Med / High` labels. Bottom-right chrome button cycles presets on tap.

**4-E Welcome splash** — New `WelcomeScreen` + `useWelcomed` hook (localStorage `amsv-welcomed`). "Begin with John 1" or embedded NavSheet to choose starting point.

---

### Files Changed

| File | Changes |
|------|---------|
| `frontend/.../ReadingPane.tsx` | Rewrote: 1-A, 1-E, 2-A, 3-C, 4-A, 4-B |
| `frontend/.../NavSheet.tsx` | Rewrote: 1-B/C, 1-D, 2-D, 3-D |
| `frontend/.../HistoryPane.tsx` | Rewrote: 2-B, 2-C |
| `frontend/.../TopBar.tsx` | 3-A, 3-B |
| `frontend/.../index.tsx` | Rewrote: all wiring + 2-E, 3-A, 3-B, 4-C, 4-D, 4-E |
| `frontend/.../CrossRefTransition.tsx` | New: 4-C |
| `frontend/.../WelcomeScreen.tsx` | New: 4-E |
| `backend/scripts/import_bible_text.py` | 1-F regex + normalization |

**TypeScript:** Only the 5 pre-existing errors remain (Verse not exported from `@/lib/bible`, utils.ts missing clsx/tailwind-merge). No new errors.
