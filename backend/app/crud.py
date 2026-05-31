from sqlalchemy.orm import Session
from . import models


def get_verse(db: Session, book: str, chapter: int, verse: int):
    return db.query(models.BibleText).filter_by(
        book=book, chapter=chapter, verse=verse
    ).first()


def get_chapter(db: Session, book: str, chapter: int):
    return (
        db.query(models.BibleText)
        .filter_by(book=book, chapter=chapter)
        .order_by(models.BibleText.verse)
        .all()
    )


def create_verse(db: Session, data: dict):
    verse = models.BibleText(**data)
    db.add(verse)
    db.commit()
    db.refresh(verse)
    return verse
