import { motion, AnimatePresence } from "motion/react";
import type { Verse } from "@/lib/api";

/**
 * Cinematic cross-reference transition (4-C).
 * When a cross-ref link is tapped, the current chapter's text flows rapidly
 * upward past the screen — like travelling through the text — then the
 * target reference snaps into focus before the chapter loads.
 */
export function CrossRefTransition({
  active,
  targetRef,
  verses,
}: {
  active: boolean;
  targetRef: string;
  verses: Verse[];
}) {
  const scrollText = verses.map((v) => v.text).join(" ");

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="crossref-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-60 flex items-center justify-center overflow-hidden bg-ink"
        >
          {/* Rapidly scrolling text — travels upward like credits */}
          <motion.div
            initial={{ y: "10%" }}
            animate={{ y: "-110%" }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.6, 1] }}
            className="absolute inset-x-8 scripture text-[clamp(1.1rem,1.8vw,1.4rem)] leading-[1.65] text-muted-foreground/25 pointer-events-none"
          >
            {scrollText} {scrollText}
          </motion.div>

          {/* Target reference reveals at center */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.65, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center"
          >
            <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
              Cross-reference
            </p>
            <p className="font-serif text-3xl text-primary">{targetRef}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
