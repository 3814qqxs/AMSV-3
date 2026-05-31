from sqlalchemy import Column, Integer, String, SmallInteger, Float, Text, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class BibleText(Base):
    __tablename__ = "bible_text"

    id = Column(Integer, primary_key=True)
    book = Column(String(64), nullable=False)
    chapter = Column(SmallInteger, nullable=False)
    verse = Column(SmallInteger, nullable=False)
    translation = Column(Text, nullable=False)
    literal_rendering = Column(Text)
    semantic_domains = Column(JSON)
    readability_grade = Column(SmallInteger)
    tempo_hint = Column(Float, nullable=True)

    original_language = relationship("OriginalLanguage", back_populates="verse")
    notes = relationship("TranslationNote", back_populates="verse")
    commentary = relationship("Commentary", back_populates="verse")
    media = relationship("Media", back_populates="verse")

    cross_references_from = relationship(
        "CrossReference",
        foreign_keys="CrossReference.from_verse_id",
        back_populates="from_verse"
    )
    cross_references_to = relationship(
        "CrossReference",
        foreign_keys="CrossReference.to_verse_id",
        back_populates="to_verse"
    )


class OriginalLanguage(Base):
    __tablename__ = "original_language"

    id = Column(Integer, primary_key=True)
    verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    lemma = Column(String(128))
    morphology = Column(String(128))
    gloss = Column(String(256))
    strongs = Column(String(32))
    syntax_tree = Column(JSON)

    verse = relationship("BibleText", back_populates="original_language")


class TranslationNote(Base):
    __tablename__ = "translation_notes"

    id = Column(Integer, primary_key=True)
    verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    note_type = Column(String(32))
    content = Column(Text, nullable=False)
    references = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    verse = relationship("BibleText", back_populates="notes")


class Commentary(Base):
    __tablename__ = "commentary"

    id = Column(Integer, primary_key=True)
    verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    level = Column(String(32))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    verse = relationship("BibleText", back_populates="commentary")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True)
    verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    media_type = Column(String(32))
    file_path = Column(String(512), nullable=False)
    media_metadata = Column("metadata", JSON)
    created_at = Column(DateTime, server_default=func.now())

    verse = relationship("BibleText", back_populates="media")


class CrossReference(Base):
    __tablename__ = "cross_reference"

    id = Column(Integer, primary_key=True)
    from_verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    to_verse_id = Column(Integer, ForeignKey("bible_text.id"), nullable=False)
    ref_type = Column(String(32))  # quotation | thematic | narrative | prophecy
    note = Column(Text)

    from_verse = relationship(
        "BibleText",
        foreign_keys=[from_verse_id],
        back_populates="cross_references_from"
    )
    to_verse = relationship(
        "BibleText",
        foreign_keys=[to_verse_id],
        back_populates="cross_references_to"
    )
