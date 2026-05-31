# AMSV-3 V2 Development Plan
**Date:** 2026-05-31
**Source:** UAT findings from `2026-05-30-uat-poc.md`
**Status:** Planning — pending `/brainstorm` Q&A before execution

---

## Overview

V2 closes all UAT failures, upgrades the core interaction model (gesture-first, touch-native), and lays the visual and typographic groundwork for phrase-paced reading. Work is grouped into four tracks that can be parallelized. A fifth track covers content infrastructure gating Phase 2 features that need curated data.

---

## Track 1 — Bug Fixes (Must Ship)

These are regressions or broken behaviors identified as `[F]` in the UAT.

### 1-A · Background scroll fires per word, not per verse
**UAT ref:** 3.2
**File:** [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](../../frontend/scripture-flow/src/components/reader/ReadingPane.tsx)
**Symptom:** Background layer scrolls on every token reveal instead of at verse boundaries.
**Fix:** The `lastScrolledVerse` ref logic was implemented but the effect dependency or guard condition is not working correctly. Inspect the background scroll `useEffect`, confirm `lastScrolledVerse.current` comparison fires only when `last.verse !== lastScrolledVerse.current`.

**Test:** Watch background during playback — it should jump once per verse, not animate continuously.

---

### 1-B · NavSheet drag-to-dismiss has no spring on close
**UAT ref:** 6.2, 12.2
**File:** [frontend/scripture-flow/src/components/reader/NavSheet.tsx](../../frontend/scripture-flow/src/components/reader/NavSheet.tsx)
**Symptom:** Sheet opens with spring animation but the drag-dismiss exit feels abrupt or inconsistent.
**Fix:** Ensure the `exit` variant uses `transition: { type: "spring", stiffness: 300, damping: 32 }` to match the entry. Verify `onDragEnd` velocity threshold is appropriate (currently >600 y-velocity).

**Test:** Drag sheet down past 80px — should spring closed, not cut.

---

### 1-C · Drag pill disappears / non-functional in Chapter Picker
**UAT ref:** 6.3
**File:** [frontend/scripture-flow/src/components/reader/NavSheet.tsx](../../frontend/scripture-flow/src/components/reader/NavSheet.tsx)
**Symptom:** The drag indicator pill at the top of the sheet is missing or does not trigger dismiss when in the chapters view.
**Fix:** The pill lives on the outer sheet `motion.div`, but the inner chapter plane's `drag="x"` with `touchAction: none` is consuming pointer events before they reach the outer drag handler. Move the pill into both inner planes (BookPicker and ChapterPicker headers), or ensure the sheet-level drag handler works on `y` axis regardless of which plane is active.

**Test:** In chapter view, drag downward from pill — sheet should dismiss with spring.

---

### 1-D · HistoryPane "Change" → NavSheet sometimes fails on second navigation
**UAT ref:** 7.9 finding
**File:** [frontend/scripture-flow/src/routes/index.tsx](../../frontend/scripture-flow/src/routes/index.tsx)
**Symptom:** Tapping "Change", selecting a new chapter works on first use; on the second use, the NavSheet does not recess after committing a chapter.
**Fix:** Likely a state ordering issue — `setNavOpen(false)` is called before the `setRef` triggers a re-render. Confirm `handleNavCommit` closes sheet and resets NavSheet internal state (view back to "books", selectedBook back to null) on every invocation by resetting those in a `useEffect` keyed to `open` in `NavSheet.tsx`.

**Test:** Navigate to a new chapter via HistoryPane → Change. Do it again from the same HistoryPane. Sheet should close both times.

---

### 1-E · Animation jank on some state transitions
**UAT ref:** 12.1
**Investigation needed:** Profile which transitions produce jitter. Likely candidates:
- Chapter change while playback is running (setTimeout chain + AnimatePresence simultaneously)
- NavSheet spring while background scroll is firing
**Fix approach:** Pause the setTimeout timer chain during chapter `AnimatePresence` exit/enter, then resume. Add `will-change: transform` to the sheet and pane motion elements if not already present.

---

### 1-F · Psalms (and potentially other long books) fails to load
**UAT ref:** 12.5
**File:** [backend/app/main.py](../../backend/app/main.py)
**Investigation needed:** Check if the `/chapter` endpoint has a query row limit, ORM lazy-loading issues, or a payload size limit. Psalms 119 is the longest chapter in the Bible (176 verses). Test with `curl` directly and inspect the response.

---

## Track 2 — Interaction Model (Gesture-First)

Unified gesture language: swipe-down to reveal, swipe-up to return, tap to pause.

### 2-A · Tap anywhere on reading pane to play / pause
**UAT ref:** 1.3, 4.6
**Files:**
- [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](../../frontend/scripture-flow/src/components/reader/ReadingPane.tsx)
- [frontend/scripture-flow/src/routes/index.tsx](../../frontend/scripture-flow/src/routes/index.tsx)

Add an `onClick` handler on the reading pane's root `div` that calls `onTogglePlay`. Must not fire when the user drags the pull-down handle or interacts with the speed zone.

**Implementation note:** Use `onPointerUp` with a distance guard (`pointerdown → pointerup` < 5px movement = tap, not drag).

---

### 2-B · HistoryPane: replace "Close" button with swipe-up pill
**UAT ref:** 7.6
**File:** [frontend/scripture-flow/src/components/reader/HistoryPane.tsx](../../frontend/scripture-flow/src/components/reader/HistoryPane.tsx)

- Add a drag handle pill at the bottom of the HistoryPane (mirroring the reading pane handle at top)
- `drag="y"` on the HistoryPane with `dragConstraints={{ top: 0, bottom: 0 }}`, `onDragEnd` checks `offset.y < -60` → close
- Remove the "Close" text button from the header (or keep as fallback for keyboard/desktop)
- UX contract: **swipe down to reveal → swipe up to return**

---

### 2-C · HistoryPane: replace "Change" button with swipe-up to NavSheet
**UAT ref:** 7.9
**File:** [frontend/scripture-flow/src/components/reader/HistoryPane.tsx](../../frontend/scripture-flow/src/components/reader/HistoryPane.tsx)

- Remove "Change" button entirely
- The bottom swipe-up gesture from HistoryPane should: if `offset.y < -60` and user is already at scroll top → call `onNavigate` (open NavSheet) rather than close to reading pane
- Or: add a secondary gesture region labeled "Browse" at the very bottom of the pane

**Design decision needed:** A single swipe-up gesture cannot mean both "return to reading" and "open NavSheet" — clarify before implementing.

---

### 2-D · NavSheet: default testament matches current scripture
**UAT ref:** 6.5
**File:** [frontend/scripture-flow/src/components/reader/NavSheet.tsx](../../frontend/scripture-flow/src/components/reader/NavSheet.tsx)

Pass `currentBook: string` prop to `NavSheet`. On open, derive the active testament and set it as the default toggle state. Use `BOOKS.find(b => b.name === currentBook)` with `TESTAMENT_GROUPS` to determine OT/NT.

---

### 2-E · Cross-reference / Commentary: touch gesture triggers
**UAT ref:** 10.1, 10.2
**File:** [frontend/scripture-flow/src/routes/index.tsx](../../frontend/scripture-flow/src/routes/index.tsx)

Keyboard shortcuts exist but touch has no equivalent. Options:
- Left/right swipe on the reading pane opens respective side pane
- Add visible but recessed tap targets on left and right edges of the reading card

**Design decision needed:** Choose gesture vs. tap target before implementing.

---

## Track 3 — Visual & Typographic Improvements

### 3-A · Replace "ASV" label with "AMSV"
**UAT ref:** 1.4, 8.1
**Files:**
- [frontend/scripture-flow/src/components/reader/TopBar.tsx](../../frontend/scripture-flow/src/components/reader/TopBar.tsx)
- [frontend/scripture-flow/src/routes/index.tsx](../../frontend/scripture-flow/src/routes/index.tsx) (watermark)

One-line change in each file. Ship as part of any other commit in this track.

---

### 3-B · TopBar and verse badge recession matches WPM label
**UAT ref:** 5.1, 5.2
**Current behavior:** TopBar and verse badge recede to 20% during playback; WPM stays at 100%.
**Desired:** Unify recession behavior — either all three recede together, or all three stay visible. WPM is the reference: keep it visible, bring TopBar and verse badge up to match.

**Options:**
- Remove `chrome-element` class from TopBar and verse badge → they stay fully visible always
- Or reduce WPM to match `opacity: 0.2` recession during playback (less legible but consistent)

**Recommendation:** Remove TopBar and verse badge from recession — keep all three at full opacity. The reading pane content is the focus, not these labels.

---

### 3-C · "End of chapter" → prev / next chapter arrows
**UAT ref:** 2.7
**File:** [frontend/scripture-flow/src/components/reader/ReadingPane.tsx](../../frontend/scripture-flow/src/components/reader/ReadingPane.tsx)

Replace `— end of chapter — pull down to see the full text` with two tappable arrows:
```
← Prev chapter    Next chapter →
```
Pass `onNext` and `onPrev` callbacks into `ReadingPane` (currently `handleNext` / `handlePrev` exist in `index.tsx`).

---

### 3-D · ← Books button pinned (visible regardless of scroll position)
**UAT ref:** 6.16
**File:** [frontend/scripture-flow/src/components/reader/NavSheet.tsx](../../frontend/scripture-flow/src/components/reader/NavSheet.tsx)

The `ChapterPicker` header containing `← Books` is inside the scrollable area. Move it into the `shrink-0` header zone above `overflow-y-auto` so it stays fixed while the chapter grid scrolls underneath.

---

## Track 4 — Reading Experience Enhancements (Phase 2 Features)

These are larger scope items surfaced in UAT. They need a dedicated `/brainstorm` before planning.

### 4-A · Phrase-based word reveal
**UAT ref:** 2.1
**Concept:** Instead of word-by-word, reveal natural language phrases (2–4 words) as a unit — similar to musical phrasing. Requires NLP-based phrase boundary detection or manual annotation.
**Blocker:** Timing model (`timing.ts`) would need a phrase-interval function. Data pipeline may need phrase boundary markers.
**Next step:** `/brainstorm` — define phrase grouping strategy.

---

### 4-B · Three-line foreground stage with smoother background transition
**UAT ref:** 2.8
**Concept:** Expand the reading stage from 2 lines to 3, with a fade-gradient transition between the bottom of the stage and the blurred background. Currently the cutoff is abrupt.
**Next step:** Measure impact on `lineHeightPx * 3` and adjust foreground clip zone. Add `mask-image: linear-gradient(to bottom, black 60%, transparent)` to the background layer top edge.

---

### 4-C · Cross-reference navigation: cinematic transition
**UAT ref:** 10.1 finding
**Concept:** When a cross-reference is tapped, don't just swap the chapter — animate the user *through* the text to the referenced passage. Reference: Super Smash Bros. ending credits — text flowing past as you travel.
**Next step:** `/brainstorm` — design the transition sequence. Likely: freeze current playback → full-screen text scroll animation toward target verse → snap into reading pane at target → resume.

---

### 4-D · Speed preset labels (Low / Med / High) as alternative to WPM
**UAT ref:** 4.7
**Concept:** Replace or supplement the numeric WPM with named presets mapped to comfortable reading ranges (e.g., Low = 150, Med = 250, High = 400). WPM remains the internal model.
**Next step:** Decide toggle vs. replacement. Could live in a settings panel.

---

### 4-E · Default chapter: splash screen or login-based
**UAT ref:** 1.2
**Concept:** Replace hardcoded John 1 default with either (a) a welcome splash that lets the user pick their starting point, or (b) a persistent last-read position per user.
**Blocker:** Option (b) requires a `users` table and auth. Option (a) is frontend-only.
**Next step:** `/brainstorm` for onboarding flow — pick (a) first, design (b) separately.

---

## Track 5 — Content Infrastructure

### 5-A · Verify all 66 books load correctly
**UAT ref:** 12.5
Systematic test: loop through all books and all chapters, confirm `/chapter` returns data. Identify any books where data is missing or the endpoint fails.

### 5-B · Commentary + cross-reference data pipeline
**UAT ref:** Architecture flag
Separate activity. Will be driven via GitHub. Not blocking any V2 feature work.

---

## V2 Execution Sequence

```
Sprint 1 — Fix the broken (Track 1)
├── 1-A  Background scroll regression
├── 1-B  NavSheet spring-close
├── 1-C  Drag pill in chapter view
├── 1-D  HistoryPane Change → NavSheet state bug
├── 1-E  Animation jank investigation
└── 1-F  Psalms / long book load failure

Sprint 2 — Gesture model + visual polish (Tracks 2 + 3)
├── 2-A  Tap to play/pause
├── 2-B  HistoryPane swipe-up to close
├── 2-C  HistoryPane swipe-up to navigate [design Q first]
├── 2-D  NavSheet defaults to current testament
├── 2-E  Touch triggers for side panes [design Q first]
├── 3-A  ASV → AMSV label
├── 3-B  Unify chrome recession
├── 3-C  End-of-chapter arrows
└── 3-D  Pin ← Books button

Sprint 3 — Phase 2 features (Track 4, one at a time)
├── 4-B  Three-line stage (low risk, self-contained)
├── 4-D  Speed presets (low risk)
├── 4-A  Phrase-based reveal [brainstorm first]
├── 4-C  Cinematic cross-ref transition [brainstorm first]
└── 4-E  Onboarding / default chapter [brainstorm first]
```

---

## Open Design Questions (resolve before Sprint 2)

1. **HistoryPane dismiss vs. navigate gesture** — single swipe-up means two different things depending on context. What is the disambiguation model?
2. **Cross-reference / commentary touch trigger** — swipe gesture (directional) or visible tap target on reading card edge?
3. **Chrome recession unification** — keep TopBar and verse badge visible (match WPM) or recess all three equally?

---

*This plan feeds `2026-05-30-uat-poc.md` V2 Planning Notes and is the input for the next `/plan` session.*
