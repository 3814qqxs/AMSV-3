import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function SidePane({
  open,
  side,
  title,
  onClose,
  children,
}: {
  open: boolean;
  side: "left" | "right";
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={`pane-surface fixed top-0 z-50 h-full w-[88vw] max-w-md overflow-y-auto p-6 ${
              side === "left" ? "left-0 rounded-r-3xl" : "right-0 rounded-l-3xl"
            }`}
          >
            <header className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
