# AMSV-3 V3 Development Plan
**Date:** 2026-06-06
**Source:** `2026-05-31-uat-v2.md`
**Restore point:** create before beginning — `git tag v2-complete`

---

## Summary

V3 addresses four priority areas identified in the V2 UAT:

1. **Reading pane** — tap feedback, play state labels, phrase mode as default, stage polish
2. **History Pane** — gesture conflict fix, visual continuity with reading pane
3. **Speed control** — replace WPM / fine-tune with Low / Med / High only
4. **Data** — Psalms + Song of Solomon failing to load (backend)

Secondary work covers welcome screen redesign, side pane interaction overhaul, TopBar & label cleanup, and chrome recession adjustments.

---

## Track 1 — Bug Fixes (must ship)

### 1-A — Welcome screen fails in Edge (UAT 1.1)
**File:** `frontend/.../WelcomeScreen.tsx`
- Investigate `localStorage` access pattern in Edge — likely a stricter security context
- Move `localStorage.getItem` call inside a `try/catch` (already present) but verify it initialises `welcomed = false` cleanly on exception rather than throwing
- Test: fresh Edge profile shows welcome splash; refresh skips it

---

### 1-B — "Choose where to start" button broken; welcome screen redesign (UAT 1.5, finding 1.n)
**Files:** `frontend/.../WelcomeScreen.tsx`

Replace the two current buttons ("Begin with John 1" / "Choose where to start") with two new buttons:

| Button | Action |
|--------|--------|
| **Old Testament** | Opens embedded NavSheet, testament pre-set to Old Testament |
| **New Testament** | Opens embedded NavSheet, testament pre-set to New Testament |

- Remove `handleBeginDefault` (John 1 shortcut gone)
- `setShowNav(true)` on both buttons; pass the target testament as a prop/state so NavSheet opens to the correct tab immediately
- NavSheet `onCommit` path is unchanged — user picks book + chapter → `onBegin(book, chapter)` → playback starts
- Fix the NavSheet flash on selection (finding 1.n): `onBegin` should first set `welcomed`, trigger exit animation on `WelcomeScreen`, then start playback — NavSheet should not be momentarily visible after commit

---

### 1-C — "paused" label not shown on tap-to-pause (UAT 2.6, finding 2.n)
**Files:** `frontend/.../ReadingPane.tsx`, `frontend/.../index.tsx`

Two issues:
1. `wpm === 0 ? "paused" : \`${wpm} wpm\`` — "paused" only shows when WPM is literally 0. Change to `!playing || wpm === 0 ? "paused" : \`${wpm} wpm\``  
   *This requires passing `playing` into ReadingPane's speed label, or deriving it from the parent.*
2. Speed preset button (Low/Med/High) disappears during playback because it has `chrome-element` class — remove `chrome-element` from the preset button so it stays fully visible at all times (same treatment WPM got in V2)

---

### 1-D — History Pane gesture conflict (UAT 8.3, 8.5, 8.6)
**File:** `frontend/.../HistoryPane.tsx`

The top pill swipe-up is triggering the bottom strip's NavSheet action instead of closing. Fix gesture isolation:

- **Top handle** (`drag="y"`, Motion): keep swipe UP → `onClose()`. Tighten the drag constraints so pointer events don't fall through to the bottom strip. Add `onPointerDown` stopPropagation on the top handle div.
- **Bottom strip**: keep swipe UP → `onNavigate()`. Ensure `setPointerCapture` is working correctly so the gesture doesn't bleed.
- **Visual distinction**: the two pills are currently identical (`h-1 w-10 bg-primary/30` vs `bg-primary/25`). Make them visually distinct so the layered intent is clear:
  - Top pill: slightly larger / brighter — "return to reading"
  - Bottom pill: standard — "open navigation"
- Test: swipe up on top pill closes to reading pane. Swipe up on bottom pill opens NavSheet. No cross-firing.

---

### 1-E — Psalms and Song of Solomon fail to load with error (UAT 12.1, 12.2)
**Files:** `backend/scripts/import_bible_text.py`, database

The V2 import script fix (1-F regex + `BOOK_NAME_MAP`) was committed but the import may not have been re-run against the database. Steps:

1. Run import script against the source text file with the fixed regex — confirm `skipped` counter is 0 for Psalms rows
2. Verify the `book` column in the database for Psalms rows matches exactly `"Psalms"` (not `"Psalm"`, `"PSALM"`, etc.)
3. Same check for `"Song of Solomon"` (not `"Song of Songs"`, `"Song of Song"`)
4. Verify `/chapter?book=Psalms&chapter=23` returns verses in the API — test with curl before testing in UI
5. Test: Psalms 23 and Song of Solomon 1 load in the app without error

---

### 1-F — Prev / Next arrows don't auto-start playback (UAT 2.4, finding 3.11)
**File:** `frontend/.../index.tsx`

`handleNext` and `handlePrev` currently only call `setRef(...)`. Add `setPlaying(true)` so chapter navigation always begins playback:

```ts
const handleNext = useCallback(() => {
  setRef((r) => nextChapter(r));
  setPlaying(true);
}, []);
const handlePrev = useCallback(() => {
  setRef((r) => prevChapter(r));
  setPlaying(true);
}, []);
```

Same fix for `handleNavCommit` — already sets `setPlaying(true)`, verify it's consistent.

---

## Track 2 — Interaction Model

### 2-A — Play / pause icon flash feedback (UAT 2.1)
**File:** `frontend/.../ReadingPane.tsx` or `frontend/.../index.tsx`

Show a brief centred icon (▶ / ⏸) in the reading pane on every tap-to-toggle:

- Use `AnimatePresence` + a `key`-changing motion div: each toggle increments a key so the icon re-mounts and replays the animation
- Animation: `opacity 0 → 1 → 0`, `scale 0.7 → 1 → 1.1`, duration ~600 ms total
- Icon: use Lucide `Play` / `Pause`; size ~40px, `text-primary/70`
- Position: absolute centre of the reading pane, `pointer-events-none`
- Triggered from `handleTogglePlay` in `index.tsx` — increment a `flashKey` counter passed as prop, or handle entirely inside ReadingPane by watching the `playing` prop change

---

### 2-B — Speed control: replace tempo zone with preset-only (UAT 5.1, finding 5.n)
**Files:** `frontend/.../ReadingPane.tsx`, `frontend/.../index.tsx`

Replace the scroll/swipe tempo zone with a single tap interaction:

- **Remove** the `onTempo` prop, `handleTempoWheel`, `handleTempoPointerDown`, `handleTempoPointerUp`, and the `onTempo` callback from `index.tsx`
- **Remove** the `wpm` fine-tune logic (`Math.round((w + d) / 50) * 50`)
- **Keep** the Low / Med / High cycle button (already in `index.tsx`)
- **Move** the cycle button to bottom-centre of the reading pane (currently bottom-right) — more thumb-friendly, symmetrical with the WPM label
- **Remove** `chrome-element` from the cycle button so it stays fully visible during playback
- The speed zone div at the bottom of ReadingPane becomes display-only (`pointer-events-none`)
- Remove keyboard `↑` / `↓` WPM adjustment from `index.tsx` `onKey` handler
- Test: Low → Med → High → Low cycles correctly; speed changes immediately; button always visible

---

### 2-C — Side pane interaction overhaul (UAT 10.1–10.6, findings 10.n, 10.nn)
**Files:** `frontend/.../index.tsx`, `frontend/.../SidePane.tsx`

Four changes bundled:

**Pills inside the reading card:**
- Move the left/right pill indicator buttons from `absolute left-0` / `absolute right-0` (outside card) to inside the reading card — `absolute left-2` / `absolute right-2`, same vertical range

**Swipe gestures:**
- Add swipe-right gesture on the reading pane to open cross-references (left pane)
- Add swipe-left gesture on the reading pane to open commentary (right pane)
- Use the same pointer distance guard pattern as tap-to-pause: capture start position, compare on pointer-up; `dx > 40` and `dy < dx` (primarily horizontal) triggers the swipe
- Swipe gestures and tap-to-pause must not conflict: horizontal swipes (dx > 40) → side pane; near-vertical or stationary taps → play/pause

**Reversed keyboard arrows + auto-close:**
- Change `←` → opens Commentary (right pane), `→` → opens Cross-refs (left pane)
- When opening a pane via keyboard, close the opposite pane first: `setSide("left")` closes right; `setSide("right")` closes left

**Remove × close button:**
- Remove the close × button from `SidePane`
- Add a right-swipe gesture on the left pane to close it; left-swipe on the right pane to close it
- Or: tapping outside the pane (the overlay) closes it — add `onClick` to the overlay backdrop

---

### 2-D — TopBar tap opens chapter picker for current book (UAT 9.4, 6.1)
**Files:** `frontend/.../TopBar.tsx`, `frontend/.../index.tsx`

Currently `TopBar` is `pointer-events-none`. Make it tappable:

- Remove `pointer-events-none` from TopBar root
- Add `onClick` prop: `onTap?: () => void`
- In `index.tsx`, pass `onTap={() => setNavOpen(true)}` and also set a new `navInitialBook` state so NavSheet opens directly to the chapter picker for `refData.book` (skip book list)
- `NavSheet`: add optional `initialBook?: string` prop — if provided, start in `view: "chapters"` with `selectedBook = initialBook`

---

### 2-E — NavSheet: remove close × button (finding 7.n)
**File:** `frontend/.../NavSheet.tsx`

- Remove the close × button from the book picker header
- Dismissal is pill-drag only — this was the V2 intent and is already fully working (7.6–7.8 all Pass)

---

## Track 3 — Visual Polish

### 3-A — TopBar: remove AMSV label (UAT 9.1)
**File:** `frontend/.../TopBar.tsx`
- Remove the "AMSV" text from the TopBar display
- TopBar shows book name + chapter number only

### 3-B — Watermark: remove "Lectio" (UAT 6.3, 9.2)
**File:** `frontend/.../index.tsx`
- Change `"Lectio · AMSV"` → `"AMSV"` in the watermark div

### 3-C — Page title cleanup (UAT 9.3)
**File:** `frontend/.../routes/index.tsx`
- Change title from `"Lectio — paced AMSV Bible reader"` → `"AMSV"` (placeholder; will be updated when branding is finalised)
- Change meta description similarly

### 3-D — Pull-down handle: remove from chrome recession (UAT 6.4)
**File:** `frontend/.../ReadingPane.tsx`
- Remove `chrome-element` class from the pull-down handle div
- Handle stays fully visible during playback

### 3-E — Phrase mode as default (finding 3.5)
**File:** `frontend/.../index.tsx`
- Pass `phraseMode={true}` to `ReadingPane` — make phrase-based reveal the standard experience
- Remove the option for single-word mode from all UI (no toggle needed)

### 3-F — Gradient mask direction fix (UAT 3.3)
**File:** `frontend/.../ReadingPane.tsx`
- Current: `maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)"` — fades the bottom of the stage
- Change to fade the top instead: `"linear-gradient(to top, black 55%, transparent 100%)"` — words arrive from transparent at top and become fully visible
- This creates the sense of text materialising into view from above, matching the reading direction

### 3-G — End-of-chapter: last word normalises to white (finding 3.n)
**File:** `frontend/.../ReadingPane.tsx`
- When `isComplete` is true, the last revealed word retains `color: var(--color-primary)` indefinitely
- Fix: when `isComplete`, set all words to `color: var(--color-foreground)` — or stop applying the `isLast` highlight condition once the chapter is done

### 3-H — History Pane: visual continuity (finding 8.n)
**File:** `frontend/.../HistoryPane.tsx`
- Current: HistoryPane slides down from the top — jarring because the pull-down gesture implies expanding downward, but the pane arrives from above
- Change entry animation: instead of `initial: { y: "-100%" }`, use `initial: { opacity: 0, y: -40, filter: "blur(6px)" }` — pane fades in from a slight upward offset, feeling like the text is expanding out of the reading pane rather than slamming down from above
- Adjust `exit` to match: `{ opacity: 0, y: -40, filter: "blur(6px)" }`

### 3-I — History Pane: dimmed words colour (UAT 8.10)
**File:** `frontend/.../HistoryPane.tsx`
- Unrevealed words: change from `text-muted-foreground/30` → `text-muted-foreground/50`
- Creates less stark contrast between revealed and unrevealed text

---

## Track 4 — Phase 3 Features (if time permits)

### 4-A — Background page-turn effect (finding 4.3)
**File:** `frontend/.../ReadingPane.tsx`

New behaviour for the background layer:
- Accumulate revealed text normally until the background div is filled to capacity (scroll height ≈ client height)
- At that point: animate the entire background content scrolling upward in one smooth sweep (`y: 0 → -100%`, ~0.8 s ease), then reset scroll to 0 and continue accumulating
- Visual effect: a complete "page turn" rather than per-verse incremental scroll
- Implementation approach: track `bgRef.current.scrollHeight` vs `bgRef.current.clientHeight`; when filled, trigger a CSS class or motion animation on the inner content div, then reset on completion

*Note: this is a meaningful redesign of background behaviour — treat as a standalone brainstorm before implementation.*

---

## Sprint Sequence

```
Week 1  Track 1 bugs (1-A through 1-F) — restore read experience before UX work
Week 2  Track 2 interactions (2-A through 2-E) — welcome + controls + side panes
Week 3  Track 3 polish (3-A through 3-I)
Week 4  UAT v3, then Track 4 if V3 UAT is clean
```

---

## Open Design Questions

| # | Question | Blocking |
|---|----------|---------|
| D-1 | ~~Welcome screen subtitle~~ — resolved: displays "AMSV" with `TODO: welcome subtitle` placeholder | ✓ done |
| D-2 | After Track 4-A (page-turn background): should the foreground stage scroll cadence change to match? | Track 4 |
| D-3 | Side pane close gesture (2-C): swipe-back on the pane, or tap-outside overlay? | 2-C implementation |

---

## Files in Scope

| File | Changes |
|------|---------|
| `frontend/.../WelcomeScreen.tsx` | 1-A, 1-B |
| `frontend/.../ReadingPane.tsx` | 1-C (label), 1-D (gesture), 2-A (icon flash), 2-B (tempo zone), 3-D, 3-E, 3-F, 3-G |
| `frontend/.../HistoryPane.tsx` | 1-D (gesture fix), 3-H, 3-I |
| `frontend/.../index.tsx` | 1-C (playing state), 1-F (prev/next autoplay), 2-B (speed control), 2-C (swipe gestures), 2-D (TopBar tap), 3-B (watermark), 3-E (phraseMode) |
| `frontend/.../NavSheet.tsx` | 1-B (initial testament prop), 2-D (initialBook prop), 2-E (remove close ×) |
| `frontend/.../TopBar.tsx` | 2-D (onClick), 3-A (remove AMSV) |
| `frontend/.../SidePane.tsx` | 2-C (remove close ×, add overlay close) |
| `frontend/.../routes/index.tsx` | 3-C (page title) |
| `backend/scripts/import_bible_text.py` | 1-E (re-run / verify) |

---

*Findings sourced from `2026-05-31-uat-v2.md`. Implementation begins after restore point tag.*
