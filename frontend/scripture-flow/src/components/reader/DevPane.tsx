import { motion, AnimatePresence } from "motion/react";
import { X, Wrench, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

export type DevNote = {
  initials: string;
  note: string;
  edit: string;
};

export function DevButton({ onClick, hasNote }: { onClick: () => void; hasNote: boolean }) {
  return (
    <button
      onClick={onClick}
      className="chrome-element pane-surface fixed bottom-32 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-primary md:bottom-36 md:right-8"
      aria-label="Developer notes"
    >
      <Wrench size={16} />
      {hasNote && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />}
    </button>
  );
}

export function DevPane({
  open,
  reference,
  originalText,
  note,
  onClose,
  onSave,
  onClear,
}: {
  open: boolean;
  reference: string;
  originalText: string;
  note: DevNote | undefined;
  onClose: () => void;
  onSave: (n: DevNote) => void;
  onClear: () => void;
}) {
  const [initials, setInitials] = useState("");
  const [text, setText] = useState("");
  const [edit, setEdit] = useState("");

  useEffect(() => {
    setInitials(note?.initials ?? "");
    setText(note?.note ?? "");
    setEdit(note?.edit ?? originalText);
  }, [note, originalText, reference]);

  function save() {
    onSave({ initials: initials.trim(), note: text.trim(), edit: edit.trim() });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="pane-surface fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl p-6"
          >
            <header className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Developer · annotate
                </p>
                <h2 className="font-serif text-2xl text-primary">{reference}</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Commentator initials
                </span>
                <input
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.slice(0, 6))}
                  placeholder="e.g. NTW"
                  className="w-32 rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-sm uppercase tracking-widest text-primary outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Note
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Exegetical note, observation, or question…"
                  className="scripture w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 text-base leading-relaxed text-foreground outline-none focus:border-primary"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Textual edit (overrides displayed verse)
                </span>
                <textarea
                  value={edit}
                  onChange={(e) => setEdit(e.target.value)}
                  rows={4}
                  className="scripture w-full resize-y rounded-xl border border-border bg-secondary/40 p-3 text-base leading-relaxed text-foreground outline-none focus:border-primary"
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Original: {originalText}
                </span>
              </label>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} /> Clear
                </button>
                <button
                  onClick={save}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Save size={14} /> Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
