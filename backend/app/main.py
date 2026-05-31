from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, TimeoutError as SATimeoutError
from sqlalchemy.orm import Session
from .config import ALLOWED_ORIGINS
from .db import engine, SessionLocal
from .crud import get_verse, create_verse, get_chapter
from .seeds import CROSS_REFS, COMMENTARY
from .schemas import VerseCreate, VerseRead, ChapterVerseRead, HealthRead

# Schema is managed by Alembic migrations — do NOT call Base.metadata.create_all() here.

app = FastAPI(title="AMSV Bible API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", response_model=HealthRead)
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except (OperationalError, SATimeoutError):
        db_status = "unavailable"
    return {"status": "ok", "db": db_status}


@app.get("/verse", response_model=VerseRead)
def read_verse(book: str, chapter: int, verse: int, db: Session = Depends(get_db)):
    result = get_verse(db, book, chapter, verse)
    if not result:
        raise HTTPException(status_code=404, detail="Verse not found.")
    return result


@app.post("/verse", response_model=VerseRead, status_code=201)
def add_verse(data: VerseCreate, db: Session = Depends(get_db)):
    return create_verse(db, data.model_dump())


@app.get("/chapter", response_model=list[ChapterVerseRead])
def read_chapter(book: str, chapter: int, db: Session = Depends(get_db)):
    verses = get_chapter(db, book, chapter)
    if not verses:
        raise HTTPException(
            status_code=404,
            detail=f"No verses found for {book} {chapter}. Run: python scripts/import_bible_text.py",
        )
    return [
        {
            "book": v.book,
            "chapter": v.chapter,
            "verse": v.verse,
            "text": v.translation,
            "tempo_hint": v.tempo_hint if v.tempo_hint and v.tempo_hint > 0 else None,
        }
        for v in verses
    ]


@app.get("/cross-refs")
def read_cross_refs(book: str, chapter: int, verse: int):
    key = f"{book} {chapter}:{verse}"
    return CROSS_REFS.get(key, [])


@app.get("/commentary")
def read_commentary(book: str, chapter: int, verse: int):
    key = f"{book} {chapter}:{verse}"
    return COMMENTARY.get(key)
