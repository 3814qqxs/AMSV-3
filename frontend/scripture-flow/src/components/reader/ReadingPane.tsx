import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { tokenInterval, verseMarkerInterval } from "@/lib/timing";
import { motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Verse } from "@/lib/bible";

type Token =
  | { kind: "verse"; verse: number }
  | { kind: "word"; text: string; verse: number; book: string; chapter: number };

export function ReadingPane({
  verses,
  wpm,
  playing,
  onActiveVerseChange,
  onRevealedChange,
  resetKey,
  highlightPhrase,
  onPullDown,
  onTempo,
  onTogglePlay,
  onNext,
  onPrev,
  phraseMode = false,
}: {
  verses: Verse[];
  wpm: number;
  playing: boolean;
  onActiveVerseChange: (v: number) => void;
  onRevealedChange?: (n: number, total: number) => void;
  resetKey: string;
  highlightPhrase?: string | null;
  onPullDown: () => void;
  onTempo: (delta: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  phraseMode?: boolean;
}) {
  const tokens = useMemo<Token[]>(() => {
    const out: Token[] = [];
    for (const v of verses) {
      out.push({ kind: "verse", verse: v.verse });
      for (const w of v.text.split(/\s+/).filter(Boolean))
        out.push({ kind: "word", text: w, verse: v.verse, book: v.book, chapter: v.chapter });
    }
    return out;
  }, [verses]);

  // phraseEnd[i] = index of the last token in token i's phrase.
  // In phrase mode: groups of ≤3 words, broken at punctuation boundaries.
  // Verse markers are always their own single-token phrase.
  const phraseEnd = useMemo<number[]>(() => {
    const result = new Array(tokens.length);
    if (!phraseMode) {
      return result.map((_, i) => i);
    }
    let phraseStart = 0;
    let wordCount = 0;
    const closePhrase = (end: number) => {
      for (let j = phraseStart; j <= end; j++) result[j] = end;
      phraseStart = end + 1;
      wordCount = 0;
    };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.kind === "verse") {
        if (wordCount > 0) closePhrase(i - 1);
        result[i] = i;
        phraseStart = i + 1;
        continue;
      }
      wordCount++;
      if (/[.?!,;:]/.test(t.text) || wordCount >= 3) {
        closePhrase(i);
      }
    }
    if (wordCount > 0) closePhrase(tokens.length - 1);
    return result;
  }, [tokens, phraseMode]);

  const [revealed, setRevealed] = useState(0);

  // Background scroll: updates once per verse boundary (not per word)
  const [bgScrollVerse, setBgScrollVerse] = useState(0);
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const lastWordRef = useRef<HTMLSpanElement>(null);
  const [lineHeightPx, setLineHeightPx] = useState(0);
  const lineHeightMeasured = useRef(false);

  useLayoutEffect(() => {
    if (revealed < 1 || lineHeightMeasured.current) return;
    const el = lastWordRef.current;
    if (!el) return;
    const lh = parseFloat(window.getComputedStyle(el).lineHeight);
    if (!isNaN(lh) && lh > 0) {
      setLineHeightPx(lh);
      lineHeightMeasured.current = true;
    }
  }, [revealed]);

  // Reset on chapter change
  useEffect(() => {
    setRevealed(0);
    setBgScrollVerse(0);
    lineHeightMeasured.current = false;
    if (fgRef.current) fgRef.current.scrollTop = 0;
    if (bgRef.current) bgRef.current.scrollTop = 0;
  }, [resetKey]);

  // Playback timer — setTimeout chain, advances by phrase in phraseMode
  const revealedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const verseBaseRef = useRef<number>(0);

  const scheduleNext = useCallback((current: number, globalBase: number) => {
    if (current >= tokens.length) return;
    const token = tokens[current];

    if (token.kind === "verse") {
      const hint = verses.find((v) => v.verse === token.verse)?.tempo_hint;
      verseBaseRef.current = hint && hint > 0 ? globalBase / hint : globalBase;
    }

    const base = verseBaseRef.current || globalBase;
    // In phrase mode advance to end of phrase; otherwise advance by 1
    const phraseLastIdx = phraseEnd[current];
    const phraseLastToken = tokens[phraseLastIdx];
    const delay = token.kind === "verse"
      ? verseMarkerInterval(base)
      : tokenInterval(phraseLastToken.kind === "word" ? phraseLastToken.text : "", base);

    timerRef.current = setTimeout(() => {
      const next = phraseLastIdx + 1;
      revealedRef.current = next;
      setRevealed(next);
      scheduleNext(next, globalBase);
    }, Math.max(60, delay));
  }, [tokens, verses, phraseEnd]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!playing || wpm === 0) return;
    const base = 60000 / wpm;
    scheduleNext(revealedRef.current, base);
    return () => clearTimeout(timerRef.current);
  }, [playing, wpm, scheduleNext]);

  useEffect(() => {
    revealedRef.current = 0;
    verseBaseRef.current = 0;
  }, [resetKey]);

  // Active verse + revealed callbacks; also drives background scroll verse state
  useEffect(() => {
    const last = tokens.slice(0, revealed).reverse().find((t) => t.kind === "word") as
      Extract<Token, { kind: "word" }> | undefined;
    if (last) {
      onActiveVerseChange(last.verse);
      setBgScrollVerse((prev) => (prev !== last.verse ? last.verse : prev));
    }
    onRevealedChange?.(revealed, tokens.length);
  }, [revealed, tokens, onActiveVerseChange, onRevealedChange]);

  // Background scroll — only fires when bgScrollVerse changes, not every word
  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    bg.scrollTo({ top: bg.scrollHeight - bg.clientHeight, behavior: "smooth" });
  }, [bgScrollVerse]);

  // Foreground scroll — 3-line window: keep current line and 2 prior visible
  useEffect(() => {
    const fg = fgRef.current;
    const lastWord = lastWordRef.current;
    if (!fg || !lastWord || lineHeightPx <= 0) return;
    const lineIndex = Math.floor(lastWord.offsetTop / lineHeightPx);
    const target = Math.max(0, (lineIndex - 2) * lineHeightPx);
    if (target > fg.scrollTop) {
      fg.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [revealed, lineHeightPx]);

  // Highlight phrase matching
  const phraseWords = useMemo(
    () => highlightPhrase ? highlightPhrase.toLowerCase().split(/\s+/).filter(Boolean) : [],
    [highlightPhrase],
  );

  function isInHighlight(tokenIndex: number): boolean {
    if (phraseWords.length === 0) return false;
    const wordTokens: { i: number; lower: string }[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.kind === "word")
        wordTokens.push({ i, lower: t.text.toLowerCase().replace(/[^a-z]/g, "") });
    }
    for (let s = 0; s <= wordTokens.length - phraseWords.length; s++) {
      let match = true;
      for (let k = 0; k < phraseWords.length; k++) {
        if (!wordTokens[s + k].lower.includes(phraseWords[k].replace(/[^a-z]/g, ""))) {
          match = false; break;
        }
      }
      if (match) {
        const start = wordTokens[s].i;
        const end = wordTokens[s + phraseWords.length - 1].i;
        if (tokenIndex >= start && tokenIndex <= end) return true;
      }
    }
    return false;
  }

  // Pull-down gesture
  function handlePullDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 60 || info.velocity.y > 500) onPullDown();
  }

  // Tempo zone — wheel + swipe
  const lastWheelTime = useRef(0);
  const swipeStartY = useRef<number | null>(null);

  function handleTempoWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    if (now - lastWheelTime.current < 200) return;
    lastWheelTime.current = now;
    onTempo(e.deltaY > 0 ? -50 : 50);
  }

  function handleTempoPointerDown(e: React.PointerEvent) {
    swipeStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleTempoPointerUp(e: React.PointerEvent) {
    if (swipeStartY.current === null) return;
    const dy = e.clientY - swipeStartY.current;
    if (dy < -30) onTempo(50);
    else if (dy > 30) onTempo(-50);
    swipeStartY.current = null;
  }

  // Tap-to-play-pause: only fires on genuine taps (< 5px movement), not drags
  const tapDownPos = useRef<{ x: number; y: number } | null>(null);

  function handlePanePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    tapDownPos.current = { x: e.clientX, y: e.clientY };
  }

  function handlePanePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!tapDownPos.current) return;
    const dx = Math.abs(e.clientX - tapDownPos.current.x);
    const dy = Math.abs(e.clientY - tapDownPos.current.y);
    tapDownPos.current = null;
    if (dx < 5 && dy < 5) onTogglePlay();
  }

  const revealedSlice = tokens.slice(0, revealed);
  const isComplete = revealed >= tokens.length && tokens.length > 0;

  return (
    <div
      className="relative h-full"
      onPointerDown={handlePanePointerDown}
      onPointerUp={handlePanePointerUp}
    >

      {/* ── BACKGROUND LAYER ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          ref={bgRef}
          className="h-full overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div
            className="scripture px-8 pt-12 pb-[60vh] text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.55] tracking-tight md:px-20"
            style={{ filter: "blur(10px)", opacity: 0.15 }}
          >
            <p>
              {revealedSlice.map((t, i) =>
                t.kind === "verse" ? (
                  <sup key={i} className="mx-1 text-[0.42em] text-primary/60">
                    {t.verse}
                  </sup>
                ) : (
                  <span key={i}>{t.text} </span>
                ),
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── PULL-DOWN HANDLE ─────────────────────────────────────── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0}
        onDragEnd={handlePullDragEnd}
        className="chrome-element absolute inset-x-0 top-0 z-30 flex h-12 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        aria-label="Pull down to see full chapter"
        style={{ willChange: "transform" }}
      >
        <div className="h-1.5 w-12 rounded-full bg-primary/30" />
      </motion.div>

      {/* ── FOREGROUND STAGE — 3-line reading zone ───────────────── */}
      <div
        className="absolute inset-x-6 z-10 md:inset-x-16"
        style={{ top: "28%" }}
      >
        <div
          ref={fgRef}
          className="relative overflow-y-scroll"
          style={{
            height: lineHeightPx > 0 ? `${lineHeightPx * 3}px` : "4.65em",
            scrollbarWidth: "none",
            // Fade the bottom of the 3-line window into the blurred background
            maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          }}
        >
          <p
            className="scripture text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.55] tracking-tight"
            style={{ overflowWrap: "break-word" }}
          >
            {revealedSlice.map((t, i) => {
              const isLast = i === revealed - 1;
              const highlighted = t.kind === "word" && isInHighlight(i);

              if (t.kind === "verse") {
                return (
                  <sup
                    key={i}
                    className="mx-1 text-[0.42em] font-sans font-semibold text-primary opacity-90"
                  >
                    {t.verse}
                  </sup>
                );
              }

              return (
                <span
                  key={i}
                  ref={isLast ? lastWordRef : undefined}
                  className="relative"
                >
                  <motion.span
                    initial={{ opacity: 0, y: 10, filter: "blur(3px)", scale: 0.97 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      scale: 1,
                      color: highlighted
                        ? "var(--color-link)"
                        : isLast
                          ? "var(--color-primary)"
                          : "var(--color-foreground)",
                      textShadow: highlighted
                        ? "0 0 14px oklch(0.72 0.17 245 / 0.5)"
                        : isLast
                          ? "0 0 28px oklch(0.82 0.13 80 / 0.45)"
                          : "none",
                    }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
                  >
                    {t.text}
                  </motion.span>{" "}
                </span>
              );
            })}
          </p>
        </div>

        {isComplete && (
          <div className="mt-8 flex items-center justify-center gap-8">
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-primary"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-primary"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── SPEED ZONE ───────────────────────────────────────────── */}
      <div
        onWheel={handleTempoWheel}
        onPointerDown={handleTempoPointerDown}
        onPointerUp={handleTempoPointerUp}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 z-20 flex cursor-ns-resize touch-none flex-col items-center justify-end pb-2.5 pt-6 pointer-events-auto"
        aria-label="Scroll or swipe up/down to change reading speed"
      >
        <span className="mb-1 tabular-nums text-[11px] font-medium text-primary/70">
          {wpm === 0 ? "paused" : `${wpm} wpm`}
        </span>
      </div>
    </div>
  );
}
