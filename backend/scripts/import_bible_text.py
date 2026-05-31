"""Import Bible text from a plain-text file into the database."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import BibleText

# Flexible pattern: matches any book name (including multi-word like "Song of Solomon")
# by capturing everything before the first chapter:verse pattern.
VERSE_PATTERN = re.compile(r"^(.+?)\s+(\d+):(\d+)\s+(.+)$")

# Normalize source book names to match the frontend's canonical names.
# Add entries here whenever a source file uses a non-standard name.
BOOK_NAME_MAP: dict[str, str] = {
    "psalm": "Psalms",
    "psalms": "Psalms",
    "song of songs": "Song of Solomon",
    "song of solomon": "Song of Solomon",
    "canticle of canticles": "Song of Solomon",
    "1st samuel": "1 Samuel",
    "2nd samuel": "2 Samuel",
    "1st kings": "1 Kings",
    "2nd kings": "2 Kings",
    "1st chronicles": "1 Chronicles",
    "2nd chronicles": "2 Chronicles",
    "1st corinthians": "1 Corinthians",
    "2nd corinthians": "2 Corinthians",
    "1st thessalonians": "1 Thessalonians",
    "2nd thessalonians": "2 Thessalonians",
    "1st timothy": "1 Timothy",
    "2nd timothy": "2 Timothy",
    "1st peter": "1 Peter",
    "2nd peter": "2 Peter",
    "1st john": "1 John",
    "2nd john": "2 John",
    "3rd john": "3 John",
}


def normalize_book_name(raw: str) -> str:
    return BOOK_NAME_MAP.get(raw.strip().lower(), raw.strip())


def parse_line(line: str):
    match = VERSE_PATTERN.match(line.strip())
    if not match:
        return None
    raw_book, chapter, verse, text = match.groups()
    book = normalize_book_name(raw_book)
    return {
        "book": book,
        "chapter": int(chapter),
        "verse": int(verse),
        "translation": text.strip(),
    }


def import_text(filepath: str):
    path = Path(filepath)
    if not path.exists():
        print(f"Error: file not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    db: Session = SessionLocal()
    imported = 0
    skipped = 0
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                data = parse_line(line)
                if not data:
                    skipped += 1
                    continue
                db.add(BibleText(**data))
                imported += 1
        db.commit()
        print(f"Import complete: {imported} verses loaded, {skipped} lines skipped.")
    except Exception as exc:
        db.rollback()
        print(f"Import failed after {imported} verses: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "data/asv_og.txt"
    import_text(path)
