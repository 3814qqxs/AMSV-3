from typing import Any
from pydantic import BaseModel


class VerseCreate(BaseModel):
    book: str
    chapter: int
    verse: int
    translation: str
    literal_rendering: str | None = None
    semantic_domains: dict[str, Any] | None = None
    readability_grade: int | None = None
    tempo_hint: float | None = None


class VerseRead(BaseModel):
    id: int
    book: str
    chapter: int
    verse: int
    translation: str
    literal_rendering: str | None = None
    semantic_domains: dict[str, Any] | None = None
    readability_grade: int | None = None
    tempo_hint: float | None = None

    model_config = {"from_attributes": True}


class ChapterVerseRead(BaseModel):
    book: str
    chapter: int
    verse: int
    text: str
    tempo_hint: float | None = None


class HealthRead(BaseModel):
    status: str
    db: str
