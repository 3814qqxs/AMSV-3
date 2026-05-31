import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
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
  revealed: number; // total token count revealed (verse markers + words)
  onClose: () => void;
  onNavigate: () => void;
  reference: string;
}) {
  // Build verse groups with a revealed flag per word.
  // Token layout mirrors ReadingPane: [verse_marker, word, word, ..., verse_marker, ...]
  // A token at index i is revealed when i < revealed.
  const groups: { verse: number; words: { text: string; done: boolean }[] }[] = [];
  let idx = 0;
  for (const v of verses) {
    idx++; // consume verse marker token
    const words = v.text.split(/\s+/).filter(Boolean).map((text) => {
      const done = idx < revealed;
      idx++;
      return { text, done };
    });
    groups.push({ verse: v.verse, words });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 34 }}
          className="fixed inset-0 z-40 overflow-y-auto bg-ink/90 backdrop-blur-md"
        >
          <div className="mx-auto max-w-3xl px-6 py-12 md:px-12 md:py-20">
            <header className="mb-8 flex items-baseline justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Full chapter
                </p>
                <h2 className="font-serif text-3xl text-primary">{reference}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigate}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  Change
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                >
                  <X size={14} /> Close
                </button>
              </div>
            </header>

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
                        className={
                          w.done
                            ? "text-foreground/90"
                            : "text-muted-foreground/30"
                        }
                      >
                        {w.text}{" "}
                      </span>
                    ))}
                  </p>
                ))}
              </article>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
