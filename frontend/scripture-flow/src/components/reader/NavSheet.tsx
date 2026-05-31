import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { BOOKS, TESTAMENT_GROUPS } from "@/lib/bible";

type View = "books" | "chapters";
type Testament = "Old Testament" | "New Testament";

export function NavSheet({
  open,
  onCommit,
  onClose,
  currentBook,
}: {
  open: boolean;
  onCommit: (book: string, chapter: number) => void;
  onClose: () => void;
  currentBook: string;
}) {
  // Derive which testament the currently-reading book belongs to
  const defaultTestament = useMemo<Testament>(() => {
    const isNT = TESTAMENT_GROUPS
      .filter((g) => g.testament === "New Testament")
      .some((g) => g.books.includes(currentBook));
    return isNT ? "New Testament" : "Old Testament";
  }, [currentBook]);

  const [view, setView] = useState<View>("books");
  const [testament, setTestament] = useState<Testament>(defaultTestament);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // Reset internal state each time the sheet opens; set testament to match reader (1-D, 2-D)
  useEffect(() => {
    if (open) {
      setView("books");
      setSelectedBook(null);
      setTestament(defaultTestament);
    }
  }, [open, defaultTestament]);

  function handleSelectBook(book: string) {
    setSelectedBook(book);
    setView("chapters");
  }

  function handleSelectChapter(chapter: number) {
    if (!selectedBook) return;
    onCommit(selectedBook, chapter);
  }

  function handleBack() {
    setView("books");
  }

  // Dismiss sheet on y-drag regardless of which inner view is active (1-B, 1-C)
  function handleSheetDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 600) {
      onClose();
    }
  }

  const bookChapters = selectedBook
    ? (BOOKS.find((b) => b.name === selectedBook)?.chapters ?? 1)
    : 1;

  const groups = TESTAMENT_GROUPS.filter((g) => g.testament === testament);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="nav-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.25 }}
          onDragEnd={handleSheetDragEnd}
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-md"
          style={{ touchAction: "none", willChange: "transform" }}
        >
          {/* Drag indicator — always visible, always draggable for y-dismiss (1-C) */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-primary/30" />
          </div>

          {/* Inner planes — horizontal slide between books and chapters */}
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {view === "books" ? (
                <motion.div
                  key="books"
                  initial={{ x: "-30%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-30%", opacity: 0 }}
                  transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <BookPicker
                    testament={testament}
                    groups={groups}
                    onSelectTestament={setTestament}
                    onSelectBook={handleSelectBook}
                    onClose={onClose}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="chapters"
                  initial={{ x: "100%", opacity: 1 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ChapterPicker
                    book={selectedBook ?? ""}
                    chapters={bookChapters}
                    onSelectChapter={handleSelectChapter}
                    onBack={handleBack}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BookPicker({
  testament,
  groups,
  onSelectTestament,
  onSelectBook,
  onClose,
}: {
  testament: Testament;
  groups: typeof TESTAMENT_GROUPS;
  onSelectTestament: (t: Testament) => void;
  onSelectBook: (book: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header — pinned, never scrolls */}
      <div className="shrink-0 px-6 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Select book</p>
          <button
            onClick={onClose}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-muted-foreground"
          >
            close ×
          </button>
        </div>

        {/* OT / NT toggle */}
        <div className="mt-3 flex gap-2">
          {(["Old Testament", "New Testament"] as Testament[]).map((t) => (
            <button
              key={t}
              onClick={() => onSelectTestament(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                testament === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "Old Testament" ? "Old" : "New"}
            </button>
          ))}
        </div>
      </div>

      {/* Book list — scrolls */}
      <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ scrollbarWidth: "none" }}>
        {groups.map((g) => (
          <div key={g.section} className="mb-6">
            <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60">
              {g.section}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {g.books.map((book) => (
                <button
                  key={book}
                  onClick={() => onSelectBook(book)}
                  className="rounded-xl bg-secondary/40 px-3 py-2.5 text-left font-serif text-sm text-foreground hover:bg-primary/20 hover:text-primary transition"
                >
                  {book}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ChapterPicker({
  book,
  chapters,
  onSelectChapter,
  onBack,
}: {
  book: string;
  chapters: number;
  onSelectChapter: (n: number) => void;
  onBack: () => void;
}) {
  return (
    <>
      {/* Header — shrink-0 so it stays pinned above the scrollable grid (3-D) */}
      <div className="shrink-0 px-6 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-muted-foreground"
          >
            ← Books
          </button>
        </div>
        <h2 className="mt-2 font-serif text-2xl text-primary">{book}</h2>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {chapters} {chapters === 1 ? "chapter" : "chapters"}
        </p>
      </div>

      {/* Chapter grid — scrolls independently; header stays fixed above */}
      <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {Array.from({ length: chapters }, (_, i) => i + 1).map((c) => (
            <button
              key={c}
              onClick={() => onSelectChapter(c)}
              className="aspect-square rounded-xl bg-secondary/40 text-sm tabular-nums text-foreground hover:bg-primary hover:text-primary-foreground transition"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
