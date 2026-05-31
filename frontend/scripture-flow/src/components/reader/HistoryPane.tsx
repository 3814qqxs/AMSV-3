import { useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import type { Verse } from "@/lib/bible";

export function HistoryPane({
  open,
  verses,
  revealed,
  onClose,
  onNavigate,
  reference,
}: {
  open: boolean;
  verses: Verse[];
  revealed: number;
  onClose: () => void;
  onNavigate: () => void;
  reference: string;
}) {
  const groups: { verse: number; words: { text: string; done: boolean }[] }[] = [];
  let idx = 0;
  for (const v of verses) {
    idx++;
    const words = (v.text as string).split(/\s+/).filter(Boolean).map((w: string) => {
      const done = idx < revealed;
      idx++;
      return { text: w, done };
    });
    groups.push({ verse: v.verse, words });
  }

  // Swipe UP on the top handle → close and return to reading pane (2-B)
  function handleTopDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y < -60 || info.velocity.y < -400) onClose();
  }

  // Swipe UP on the bottom strip → open NavSheet to browse (2-C)
  const navSwipeStartY = useRef<number | null>(null);

  function handleNavPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    navSwipeStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleNavPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (navSwipeStartY.current === null) return;
    const dy = navSwipeStartY.current - e.clientY;
    if (dy > 40) onNavigate();
    navSwipeStartY.current = null;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 34 }}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-ink/90 backdrop-blur-md"
          style={{ willChange: "transform" }}
        >
          {/* Top drag handle — swipe UP to return to reading pane */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.25, bottom: 0 }}
            onDragEnd={handleTopDragEnd}
            className="shrink-0 flex cursor-s-resize touch-none flex-col items-center pt-3 pb-2"
            aria-label="Swipe up to return to reading pane"
          >
            <div className="h-1 w-10 rounded-full bg-primary/30" />
          </motion.div>

          {/* Header */}
          <div className="shrink-0 px-6 pb-4 md:px-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Full chapter
            </p>
            <h2 className="font-serif text-3xl text-primary">{reference}</h2>
          </div>

          {/* Scrollable text */}
          <div
            className="flex-1 overflow-y-auto px-6 pb-4 md:px-12"
            style={{ scrollbarWidth: "none" }}
          >
            {groups.length === 0 ? (
              <p className="text-muted-foreground">Loading chapter…</p>
            ) : (
              <article className="scripture text-[clamp(1.1rem,1.8vw,1.35rem)] leading-[1.7]">
                {groups.map((g) => (
                  <p key={g.verse} className="mb-5">
                    <sup className="mr-1.5 text-primary">{g.verse}</sup>
                    {g.words.map((w, wi) => (
                      <span
                        key={wi}
                        className={w.done ? "text-foreground/90" : "text-muted-foreground/30"}
                      >
                        {w.text}{" "}
                      </span>
                    ))}
                  </p>
                ))}
              </article>
            )}
          </div>

          {/* Bottom strip — swipe UP to open NavSheet for browsing */}
          <div
            onPointerDown={handleNavPointerDown}
            onPointerUp={handleNavPointerUp}
            className="shrink-0 flex h-8 cursor-n-resize touch-none items-center justify-center"
            aria-label="Swipe up to browse books and chapters"
          >
            <div className="h-1 w-10 rounded-full bg-primary/25" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
