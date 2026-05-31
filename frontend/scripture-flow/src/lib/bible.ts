// Client-side Bible helpers: book index, navigation, reference parsing.
// Data fetching lives in @/lib/api.ts (served by the AMSV FastAPI backend).

export const BOOKS: { name: string; chapters: number }[] = [
  { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 }, { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 }, { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 }, { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 }, { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 }, { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 }, { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 }, { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 }, { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 }, { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 }, { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 }, { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 }, { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 },
];

export type TestamentGroup = {
  testament: "Old Testament" | "New Testament";
  section: string;
  books: string[];
};

export const TESTAMENT_GROUPS: TestamentGroup[] = [
  { testament: "Old Testament", section: "Law",            books: ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy"] },
  { testament: "Old Testament", section: "History",        books: ["Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther"] },
  { testament: "Old Testament", section: "Poetry",         books: ["Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon"] },
  { testament: "Old Testament", section: "Major Prophets", books: ["Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel"] },
  { testament: "Old Testament", section: "Minor Prophets", books: ["Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"] },
  { testament: "New Testament", section: "Gospels",        books: ["Matthew","Mark","Luke","John"] },
  { testament: "New Testament", section: "Acts",           books: ["Acts"] },
  { testament: "New Testament", section: "Paul's Letters", books: ["Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon"] },
  { testament: "New Testament", section: "General Letters",books: ["Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude"] },
  { testament: "New Testament", section: "Revelation",     books: ["Revelation"] },
];

export type Reference = { book: string; chapter: number };

export function nextChapter(ref: Reference): Reference {
  const i = BOOKS.findIndex((b) => b.name === ref.book);
  if (i < 0) return ref;
  if (ref.chapter < BOOKS[i].chapters) return { book: ref.book, chapter: ref.chapter + 1 };
  const ni = (i + 1) % BOOKS.length;
  return { book: BOOKS[ni].name, chapter: 1 };
}

export function prevChapter(ref: Reference): Reference {
  const i = BOOKS.findIndex((b) => b.name === ref.book);
  if (i < 0) return ref;
  if (ref.chapter > 1) return { book: ref.book, chapter: ref.chapter - 1 };
  const ni = (i - 1 + BOOKS.length) % BOOKS.length;
  return { book: BOOKS[ni].name, chapter: BOOKS[ni].chapters };
}

export function refKey(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}

// Parse "John 3:16" or "1 John 4:9" -> { book, chapter, verse }
export function parseRef(input: string): { book: string; chapter: number; verse?: number } | null {
  const m = input.trim().match(/^((?:\d\s)?[A-Za-z][A-Za-z ]+?)\s+(\d+)(?::(\d+))?$/);
  if (!m) return null;
  const book = BOOKS.find((b) => b.name.toLowerCase() === m[1].toLowerCase().trim());
  if (!book) return null;
  const chapter = Math.min(Number(m[2]), book.chapters);
  const verse = m[3] ? Number(m[3]) : undefined;
  return { book: book.name, chapter, verse };
}
