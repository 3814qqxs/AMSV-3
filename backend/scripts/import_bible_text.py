"""Import Bible text from a plain-text file into the database."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import BibleText

VERSE_PATTERN = re.compile(r"^([1-3]?\s?[A-Za-z]+)\s+(\d+):(\d+)\s+(.*)$")


def parse_line(line: str):
    match = VERSE_PATTERN.match(line.strip())
    if not match:
        return None
    book, chapter, verse, text = match.groups()
    return {
        "book": book.strip(),
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
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                data = parse_line(line)
                if not data:
                    continue
                db.add(BibleText(**data))
                imported += 1
        db.commit()
        print(f"Import complete: {imported} verses loaded.")
    except Exception as exc:
        db.rollback()
        print(f"Import failed after {imported} verses: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "data/asv_og.txt"
    import_text(path)
