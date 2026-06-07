import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  nextChapter,
  prevChapter,
  parseRef,
  refKey,
  type Reference,
} from "@/lib/bible";
import {
  fetchChapter,
  fetchCrossRefs,
  fetchCommentary,
  type LinkedRef,
  type CommentaryEntry,
} from "@/lib/api";
import { BackgroundPane } from "@/components/reader/BackgroundPane";
import { ReadingPane } from "@/components/reader/ReadingPane";
import { SidePane } from "@/components/reader/SidePane";
import { TopBar } from "@/components/reader/TopBar";
import { HistoryPane } from "@/components/reader/HistoryPane";
import { NavSheet } from "@/components/reader/NavSheet";
import { CrossRefTransition } from "@/components/reader/CrossRefTransition";
import { WelcomeScreen, useWelcomed } from "@/components/reader/WelcomeScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lectio — paced AMSV Bible reader" },
      {
        name: "description",
        content:
          "A paced reader for the American Majority Standard Version. Words approach in tempo, with cross-references, commentary, and annotation a swipe away.",
      },
    ],
  }),
  component: ReaderPage,
});

// Speed presets for 4-D
const SPEED_PRESETS = [150, 250, 400];
function nextPreset(current: number): number {
  const idx = SPEED_PRESETS.indexOf(current);
  return SPEED_PRESETS[(idx + 1) % SPEED_PRESETS.length];
}
function presetLabel(wpm: number): string {
  const labels: Record<number, string> = { 150: "Low", 250: "Med", 400: "High" };
  return labels[wpm] ?? `${wpm}`;
}

function ReaderPage() {
  const { welcomed, markWelcomed } = useWelcomed();

  const [refData, setRef] = useState<Reference>({ book: "John", chapter: 1 });
  const [wpm, setWpm] = useState(250);
  const [playing, setPlaying] = useState(false);
  const [activeVerse, setActiveVerse] = useState(1);
  const [revealedCount, setRevealedCount] = useState(0);
  const [side, setSide] = useState<null | "left" | "right">(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const wasPlayingRef = useRef(false);
  const navSwipeStartY = useRef<number | null>(null);
  const [highlight, setHighlight] = useState<{ phrase: string; targetRef?: string } | null>(null);

  const [xrefTransition, setXrefTransition] = useState<{ active: boolean; targetRef: string }>({
    active: false,
    targetRef: "",
  });

  const { data: verses = [], isLoading, error } = useQuery({
    queryKey: ["chapter", refData.book, refData.chapter],
    queryFn: ({ signal }) => fetchChapter(refData.book, refData.chapter, signal),
    staleTime: 10 * 60 * 1000,
  });

  const { data: refs = [] } = useQuery<LinkedRef[]>({
    queryKey: ["cross-refs", refData.book, refData.chapter, activeVerse],
    queryFn: () => fetchCrossRefs(refData.book, refData.chapter, activeVerse),
    staleTime: 60 * 60 * 1000,
    enabled: side === "left",
  });

  const { data: note } = useQuery<CommentaryEntry | null>({
    queryKey: ["commentary", refData.book, refData.chapter, activeVerse],
    queryFn: () => fetchCommentary(refData.book, refData.chapter, activeVerse),
    staleTime: 60 * 60 * 1000,
    enabled: side === "right",
  });

  function handleNavCommit(book: string, chapter: number) {
    setRef({ book, chapter });
    setNavOpen(false);
    setPlaying(true);
  }

  function handleWelcomeBegin(book: string, chapter: number) {
    setRef({ book, chapter });
    markWelcomed();
    setPlaying(true);
  }

  function handleNavHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    navSwipeStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleNavHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (navSwipeStartY.current === null) return;
    const dy = navSwipeStartY.current - e.clientY;
    if (dy > 40) setNavOpen(true);
    navSwipeStartY.current = null;
  }

  const handleTempo = useCallback((d: number) => {
    setWpm((w) => {
      const next = Math.round((w + d) / 50) * 50;
      return Math.max(0, Math.min(500, next));
    });
  }, []);
  const handleNext = useCallback(() => { setRef((r) => nextChapter(r)); setPlaying(true); }, []);
  const handlePrev = useCallback(() => { setRef((r) => prevChapter(r)); setPlaying(true); }, []);
  const openRefs = useCallback(() => setSide("left"), []);
  const openNotes = useCallback(() => setSide("right"), []);
  const handleTogglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "ArrowUp") handleTempo(50);
      else if (e.key === "ArrowDown") handleTempo(-50);
      else if (e.key === "ArrowLeft") openRefs();
      else if (e.key === "ArrowRight") openNotes();
      else if (e.key === "PageDown") handleNext();
      else if (e.key === "PageUp") handlePrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleTempo, handleNext, handlePrev, openRefs, openNotes]);

  const activeKey = refKey(refData.book, refData.chapter, activeVerse);
  const chapterKey = `${refData.book}-${refData.chapter}`;

  // Cross-ref navigation with cinematic transition (4-C)
  function jumpToRef(targetRef: string, phrase?: string) {
    const parsed = parseRef(targetRef);
    if (!parsed) return;
    setSide(null);
    setXrefTransition({ active: true, targetRef });
    setTimeout(() => {
      setRef({ book: parsed.book, chapter: parsed.chapter });
      if (phrase) setHighlight({ phrase, targetRef });
      setTimeout(() => setXrefTransition({ active: false, targetRef: "" }), 300);
    }, 1100);
  }

  function highlightInSource(phrase: string) {
    setHighlight({ phrase });
  }

  return (
    <>
      <main
        className="relative h-screen w-screen overflow-hidden"
        data-reading={playing ? "true" : undefined}
      >
        {/* Background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chapterKey + "-bg"}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <BackgroundPane verses={verses} />
          </motion.div>
        </AnimatePresence>

        {/* Foreground reading card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={chapterKey + "-fg"}
            initial={{ opacity: 0, y: 30, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-2 top-20 bottom-6 md:inset-x-10 md:top-24 md:bottom-8"
          >
            <div className="pane-surface relative h-full overflow-hidden rounded-[28px]">
              {isLoading && (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Loading scripture…
                </div>
              )}
              {error && (
                <div className="flex h-full items-center justify-center px-6 text-center text-destructive">
                  Couldn't load this chapter. Check your connection and try again.
                </div>
              )}
              {!isLoading && !error && (
                <ReadingPane
                  verses={verses}
                  wpm={wpm}
                  playing={playing}
                  onActiveVerseChange={setActiveVerse}
                  onRevealedChange={(n) => setRevealedCount(n)}
                  resetKey={chapterKey}
                  highlightPhrase={highlight?.phrase ?? null}
                  onPullDown={() => { wasPlayingRef.current = playing; setHistoryOpen(true); setPlaying(false); }}
                  onTempo={handleTempo}
                  onTogglePlay={handleTogglePlay}
                  onNext={handleNext}
                  onPrev={handlePrev}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
              {/* Verse badge — not recessed during playback (3-B) */}
              <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-ink/60 px-3 py-1 font-serif text-xs text-primary backdrop-blur">
                v. {activeVerse}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <TopBar refData={refData} />

        {/* Touch tap targets for side panes — recessed edge bars (2-E) */}
        <button
          onClick={openRefs}
          className="chrome-element absolute left-0 top-[28%] bottom-[18%] z-10 flex w-7 items-center justify-start pl-1"
          aria-label="Open cross-references"
        >
          <div className="h-10 w-1 rounded-full bg-primary/30" />
        </button>
        <button
          onClick={openNotes}
          className="chrome-element absolute right-0 top-[28%] bottom-[18%] z-10 flex w-7 items-center justify-end pr-1"
          aria-label="Open commentary"
        >
          <div className="h-10 w-1 rounded-full bg-primary/30" />
        </button>

        {/* Cross-references */}
        <SidePane
          open={side === "left"}
          side="left"
          title="Cross-references"
          onClose={() => setSide(null)}
        >
          <p className="mb-4 font-serif text-sm text-muted-foreground">
            Companion passages to {activeKey}
          </p>
          {refs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No curated references for this verse yet. Try John 3:16, John 1:1, Genesis 1:1, Romans 8:28, or Psalms 23:1.
            </p>
          ) : (
            <ul className="space-y-3">
              {refs.map((r) => (
                <li
                  key={r.ref}
                  className="rounded-xl border border-border bg-secondary/40 px-4 py-3"
                >
                  <button
                    onClick={() => jumpToRef(r.ref, r.phrase)}
                    className="w-full text-left"
                  >
                    <div className="font-serif text-base text-foreground hover:text-primary">
                      {r.ref}
                    </div>
                    {r.phrase && (
                      <div className="mt-1 font-serif text-sm">
                        shared phrase: <span className="link-word">{r.phrase}</span>
                      </div>
                    )}
                  </button>
                  {r.phrase && (
                    <button
                      onClick={() => highlightInSource(r.phrase!)}
                      className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                    >
                      Highlight in source
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {highlight?.targetRef && (
            <p className="mt-4 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              Match from <span className="link-word">{highlight.phrase}</span> highlighted in the reading pane.
            </p>
          )}
        </SidePane>

        {/* Commentary */}
        <SidePane
          open={side === "right"}
          side="right"
          title="Commentary"
          onClose={() => setSide(null)}
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-serif text-sm text-muted-foreground">{activeKey}</p>
            {note?.initials && (
              <span className="rounded-full border border-primary/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                {note.initials}
              </span>
            )}
          </div>
          {note ? (
            <CommentaryBody
              text={note.text}
              links={note.links ?? []}
              onLinkClick={(l) => jumpToRef(l.ref, l.phrase)}
              onHover={(phrase) => phrase && highlightInSource(phrase)}
            />
          ) : (
            <p className="scripture text-base leading-relaxed text-muted-foreground">
              No editorial note for this verse yet.
            </p>
          )}
        </SidePane>

        {/* Swipe-up handle below reading card */}
        <div
          onPointerDown={handleNavHandlePointerDown}
          onPointerUp={handleNavHandlePointerUp}
          className="chrome-element absolute inset-x-0 bottom-0 z-20 flex h-6 cursor-n-resize touch-none items-center justify-center"
          aria-label="Swipe up to select book and chapter"
        >
          <div className="h-1 w-10 rounded-full bg-primary/25" />
        </div>

        {/* Speed preset cycle button (4-D) */}
        <button
          onClick={() => setWpm(nextPreset(wpm))}
          className="absolute bottom-8 right-4 z-20 rounded-full border border-border/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-muted-foreground transition"
          aria-label="Cycle reading speed preset"
        >
          {presetLabel(wpm)}
        </button>

        {/* Navigation sheet */}
        <NavSheet
          open={navOpen}
          onCommit={handleNavCommit}
          onClose={() => setNavOpen(false)}
          currentBook={refData.book}
        />

        {/* History overlay */}
        <HistoryPane
          open={historyOpen}
          verses={verses}
          revealed={revealedCount}
          onClose={() => { setHistoryOpen(false); if (wasPlayingRef.current) setPlaying(true); }}
          onNavigate={() => { setHistoryOpen(false); setNavOpen(true); }}
          reference={`${refData.book} ${refData.chapter}`}
        />

        {/* Watermark — AMSV (3-A) */}
        <div className="chrome-element pointer-events-none absolute bottom-2 left-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          Lectio · AMSV
        </div>
      </main>

      {/* Cinematic cross-ref transition overlay (4-C) */}
      <CrossRefTransition
        active={xrefTransition.active}
        targetRef={xrefTransition.targetRef}
        verses={verses}
      />

      {/* Welcome splash (4-E) */}
      <AnimatePresence>
        {!welcomed && (
          <WelcomeScreen onBegin={handleWelcomeBegin} />
        )}
      </AnimatePresence>
    </>
  );
}

function CommentaryBody({
  text,
  links,
  onLinkClick,
  onHover,
}: {
  text: string;
  links: LinkedRef[];
  onLinkClick: (l: LinkedRef) => void;
  onHover: (phrase: string | null) => void;
}) {
  if (!links.length) {
    return <p className="scripture text-lg leading-relaxed text-foreground">{text}</p>;
  }
  const escaped = links
    .map((l) => l.phrase ?? l.ref)
    .filter(Boolean)
    .map((s) => s!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);

  return (
    <p className="scripture text-lg leading-relaxed text-foreground">
      {parts.map((p, i) => {
        const match = links.find(
          (l) => (l.phrase ?? l.ref).toLowerCase() === p.toLowerCase(),
        );
        if (!match) return <span key={i}>{p}</span>;
        return (
          <button
            key={i}
            onClick={() => onLinkClick(match)}
            onMouseEnter={() => onHover(match.phrase ?? null)}
            onFocus={() => onHover(match.phrase ?? null)}
            className="link-word underline decoration-dotted underline-offset-4 hover:opacity-80"
            title={`Open ${match.ref}`}
          >
            {p}
          </button>
        );
      })}
      {" "}
      <span className="mt-2 block text-[11px] text-muted-foreground">
        Tap a blue phrase to jump · matching words highlight in the source.
      </span>
    </p>
  );
}
