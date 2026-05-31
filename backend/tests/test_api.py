import pytest

VERSE_PAYLOAD = {
    "book": "John",
    "chapter": 3,
    "verse": 16,
    "translation": "For God so loved the world.",
}


# ── /verse ────────────────────────────────────────────────────────────────────

def test_create_verse(client):
    res = client.post("/verse", json=VERSE_PAYLOAD)
    assert res.status_code == 201
    body = res.json()
    assert body["book"] == "John"
    assert body["verse"] == 16
    assert "id" in body


def test_read_verse(client):
    client.post("/verse", json=VERSE_PAYLOAD)
    res = client.get("/verse", params={"book": "John", "chapter": 3, "verse": 16})
    assert res.status_code == 200
    assert res.json()["translation"] == VERSE_PAYLOAD["translation"]


def test_read_verse_not_found(client):
    res = client.get("/verse", params={"book": "Revelation", "chapter": 22, "verse": 21})
    assert res.status_code == 404


# ── /chapter ──────────────────────────────────────────────────────────────────

def test_read_chapter_empty_returns_404(client):
    res = client.get("/chapter", params={"book": "Genesis", "chapter": 1})
    assert res.status_code == 404


def test_read_chapter_returns_verses(client):
    client.post("/verse", json=VERSE_PAYLOAD)
    res = client.get("/chapter", params={"book": "John", "chapter": 3})
    assert res.status_code == 200
    verses = res.json()
    assert len(verses) >= 1
    assert verses[0]["text"] == VERSE_PAYLOAD["translation"]


# ── /chapter tempo_hint ───────────────────────────────────────────────────────

def test_chapter_verse_has_tempo_hint_null_by_default(client):
    client.post("/verse", json=VERSE_PAYLOAD)
    res = client.get("/chapter", params={"book": "John", "chapter": 3})
    assert res.status_code == 200
    assert res.json()[0]["tempo_hint"] is None


def test_chapter_verse_returns_tempo_hint_value(client):
    payload = {**VERSE_PAYLOAD, "tempo_hint": 1.3}
    client.post("/verse", json=payload)
    res = client.get("/chapter", params={"book": "John", "chapter": 3})
    assert res.status_code == 200
    assert res.json()[0]["tempo_hint"] == 1.3


def test_chapter_verse_tempo_hint_zero_coerced_to_null(client):
    payload = {**VERSE_PAYLOAD, "tempo_hint": 0.0}
    client.post("/verse", json=payload)
    res = client.get("/chapter", params={"book": "John", "chapter": 3})
    assert res.status_code == 200
    assert res.json()[0]["tempo_hint"] is None


# ── /cross-refs ───────────────────────────────────────────────────────────────

def test_cross_refs_known_verse(client):
    res = client.get("/cross-refs", params={"book": "John", "chapter": 3, "verse": 16})
    assert res.status_code == 200
    refs = res.json()
    assert len(refs) > 0
    assert any(r["ref"] == "Romans 5:8" for r in refs)


def test_cross_refs_unknown_verse_returns_empty(client):
    res = client.get("/cross-refs", params={"book": "Amos", "chapter": 1, "verse": 1})
    assert res.status_code == 200
    assert res.json() == []


# ── /commentary ───────────────────────────────────────────────────────────────

def test_commentary_known_verse(client):
    res = client.get("/commentary", params={"book": "John", "chapter": 3, "verse": 16})
    assert res.status_code == 200
    body = res.json()
    assert body["initials"] == "DBH"
    assert "text" in body


def test_commentary_unknown_verse_returns_null(client):
    res = client.get("/commentary", params={"book": "Amos", "chapter": 1, "verse": 1})
    assert res.status_code == 200
    assert res.json() is None
