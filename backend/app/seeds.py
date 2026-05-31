"""Seed cross-reference and commentary data.

Keys follow the "Book Chapter:Verse" format (e.g. "John 3:16").
These are served directly until the CrossReference / Commentary DB tables are populated.
"""

CROSS_REFS: dict[str, list[dict]] = {
    "John 3:16": [
        {"ref": "Romans 5:8", "phrase": "loved"},
        {"ref": "1 John 4:9", "phrase": "only begotten Son"},
        {"ref": "John 3:36", "phrase": "eternal life"},
    ],
    "John 1:1": [
        {"ref": "Genesis 1:1", "phrase": "In the beginning"},
        {"ref": "Colossians 1:16", "phrase": "Word"},
        {"ref": "Revelation 19:13", "phrase": "Word"},
    ],
    "Genesis 1:1": [
        {"ref": "John 1:1", "phrase": "In the beginning"},
        {"ref": "Hebrews 11:3", "phrase": "created"},
        {"ref": "Psalms 33:6", "phrase": "heavens"},
    ],
    "Romans 8:28": [
        {"ref": "Genesis 50:20", "phrase": "good"},
        {"ref": "Ephesians 1:11", "phrase": "purpose"},
    ],
    "Psalms 23:1": [
        {"ref": "John 10:11", "phrase": "shepherd"},
        {"ref": "Isaiah 40:11", "phrase": "shepherd"},
        {"ref": "Ezekiel 34:23", "phrase": "shepherd"},
    ],
}

COMMENTARY: dict[str, dict] = {
    "John 3:16": {
        "initials": "DBH",
        "text": (
            "The hinge of the gospel: divine love expressed not in sentiment but in "
            "self-gift. 'World' (kosmos) here means humanity in its rebellion — loved "
            "while still hostile."
        ),
        "links": [
            {"ref": "Romans 5:8", "phrase": "loved"},
            {"ref": "1 John 4:9", "phrase": "only begotten Son"},
        ],
    },
    "John 1:1": {
        "initials": "NTW",
        "text": (
            "John's prologue rewrites Genesis 1. The Logos is both with God (distinct) "
            "and is God (identical in nature) — the foundation of trinitarian Christology."
        ),
        "links": [
            {"ref": "Genesis 1:1", "phrase": "In the beginning"},
            {"ref": "Colossians 1:16", "phrase": "Word"},
        ],
    },
    "Genesis 1:1": {
        "initials": "WB",
        "text": (
            "Bereshit. A cosmic overture: time, matter, and order arise from a free "
            "divine word. Not a scientific account but a confession that creation is "
            "gift, not accident."
        ),
        "links": [
            {"ref": "John 1:1", "phrase": "beginning"},
            {"ref": "Hebrews 11:3", "phrase": "created"},
        ],
    },
    "Romans 8:28": {
        "initials": "JRWS",
        "text": (
            "Not a promise that all things ARE good, but that all things — even "
            "suffering — are woven by God toward the good of those conformed to Christ."
        ),
        "links": [{"ref": "Genesis 50:20", "phrase": "good"}],
    },
    "Psalms 23:1": {
        "initials": "EP",
        "text": (
            "The psalmist trades a list of needs for a single confession of trust. "
            "Shepherd imagery would have evoked both tenderness and royal authority in the ANE."
        ),
        "links": [{"ref": "John 10:11", "phrase": "shepherd"}],
    },
}
