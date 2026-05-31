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
