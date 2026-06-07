import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NavSheet } from "./NavSheet";

const WELCOMED_KEY = "amsv-welcomed";

function readWelcomed(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(WELCOMED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeWelcomed(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(WELCOMED_KEY, "1");
  } catch { /* storage blocked or private mode */ }
}

export function useWelcomed() {
  const [welcomed, setWelcomed] = useState(readWelcomed);
  function markWelcomed() {
    writeWelcomed();
    setWelcomed(true);
  }
  return { welcomed, markWelcomed };
}

export function WelcomeScreen({
  onBegin,
}: {
  onBegin: (book: string, chapter: number) => void;
}) {
  const [showNav, setShowNav] = useState(false);
  const [navTestament, setNavTestament] = useState<"Old Testament" | "New Testament">("New Testament");

  function handleTestamentTap(t: "Old Testament" | "New Testament") {
    setNavTestament(t);
    setShowNav(true);
  }

  function handleNavCommit(book: string, chapter: number) {
    setShowNav(false);
    // Brief delay lets NavSheet begin its exit animation before the
    // welcome screen itself exits — prevents NavSheet flashing through.
    setTimeout(() => onBegin(book, chapter), 180);
  }

  return (
    <>
      <AnimatePresence>
      {!showNav && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink px-8 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Welcome to
          </p>
          <h1 className="mb-1 font-serif text-5xl text-primary">AMSV</h1>
          <p className="mb-10 text-sm text-muted-foreground">
            AMSV {/* TODO: welcome subtitle */}
          </p>

          <p className="mb-4 text-xs text-muted-foreground/60 uppercase tracking-[0.25em]">
            Where would you like to begin?
          </p>

          <div className="flex flex-col items-center gap-3">
            {(["Old Testament", "New Testament"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTestamentTap(t)}
                className="w-56 rounded-full border border-border px-6 py-3 font-serif text-base text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              >
                {t}
              </button>
            ))}
          </div>

          <p className="mt-12 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40">
            AMSV · Public domain
          </p>
        </motion.div>
      </motion.div>
      )}
      </AnimatePresence>

      <NavSheet
        open={showNav}
        onCommit={handleNavCommit}
        onClose={() => setShowNav(false)}
        currentBook="John"
        initialTestament={navTestament}
      />
    </>
  );
}
