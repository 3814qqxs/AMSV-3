import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NavSheet } from "./NavSheet";

const WELCOMED_KEY = "amsv-welcomed";

export function useWelcomed() {
  const [welcomed, setWelcomed] = useState(() => {
    try { return localStorage.getItem(WELCOMED_KEY) === "1"; } catch { return false; }
  });
  function markWelcomed() {
    try { localStorage.setItem(WELCOMED_KEY, "1"); } catch { /* storage blocked */ }
    setWelcomed(true);
  }
  return { welcomed, markWelcomed };
}

/**
 * Welcome splash screen (4-E).
 * Shown on first visit. User can "Begin with John 1" or open the book picker
 * to choose a different starting point.
 */
export function WelcomeScreen({
  onBegin,
}: {
  onBegin: (book: string, chapter: number) => void;
}) {
  const [showNav, setShowNav] = useState(false);

  function handleBeginDefault() {
    onBegin("John", 1);
  }

  function handleNavCommit(book: string, chapter: number) {
    setShowNav(false);
    onBegin(book, chapter);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-ink px-8 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Welcome to
          </p>
          <h1 className="mb-1 font-serif text-5xl text-primary">Lectio</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Paced reading · American Majority Standard Version
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleBeginDefault}
              className="w-56 rounded-full bg-primary px-6 py-3 font-serif text-base text-primary-foreground transition hover:opacity-90"
            >
              Begin with John 1
            </button>
            <button
              onClick={() => setShowNav(true)}
              className="w-56 rounded-full border border-border px-6 py-3 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Choose where to start
            </button>
          </div>

          <p className="mt-12 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40">
            AMSV · Public domain
          </p>
        </motion.div>
      </motion.div>

      <NavSheet
        open={showNav}
        onCommit={handleNavCommit}
        onClose={() => setShowNav(false)}
        currentBook="John"
      />
    </>
  );
}
