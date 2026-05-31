# AMSV — Multi-Agent Development Brief

**Last updated:** 2026-05-29
**Status:** Active — POC phase (reading experience)

---

## What This Project Is

AMSV is an open-source Bible reading app built around a paced, cinematic reading experience. The American Standard Version (public domain) is the initial translation. The reader opens the app and the experience begins — no account, no login, no onboarding.

The immediate goal is a **proof of concept focused entirely on the reading experience**: words that arrive like spoken thoughts, a background that quietly accumulates completed verses, and chrome that recedes during active reading.

---

## Agent Roles

### Claude Code — UX & Frontend

**Scope:** Everything in `frontend/scripture-flow/`

Responsibilities:
- React components, routes, and state
- Animation and motion (Framer Motion / `motion` package, `motion/react` import)
- Reading experience: word animation, verse-paced background, chrome recession
- Tailwind CSS styling and design tokens
- TanStack Start (SSR), TanStack Router, TanStack Query integration
- Frontend build config (`vite.config.ts`)
- Prototype HTML files in `frontend/scripture-flow/public/`

**How to work with Claude Code:**
- Use `/brainstorm` for design questions before writing code
- Use `/plan` to produce a task-by-task implementation plan before building
- Use `/build` to execute: RED (failing test) → GREEN (minimal code) → REFACTOR
- Use `/audit` to verify the build matches the spec
- Every design decision goes in `.agent/decisions.log` with what was rejected and why
- Reference the approved atmosphere PRD at `docs/archive/2026-05-23-atmosphere-animation-design.md`

**Working constraints:**
- Plugin order in `vite.config.ts` is load-bearing: `tanstackStart` MUST precede `react()` (TanStack Router plugin must run before JSX transform)
- Bun is the package manager: `bun install`, `bun run dev` — not npm or yarn
- Dev server runs on port 5173; backend proxy at `/api` → `http://localhost:8000`
- Motion library import: `motion/react` (not `framer-motion`)

---

### GitHub Copilot — Data Engineer & Infrastructure

**Scope:** Everything in `backend/`, `docker-compose.yml`, `launch.ps1`, database migrations

Responsibilities:
- FastAPI endpoints (`backend/app/main.py`, `backend/app/crud.py`)
- SQLAlchemy models (`backend/app/models.py`)
- PostgreSQL schema and migrations (Alembic or raw SQL scripts)
- Docker Compose config and service health
- Bible text import scripts (`backend/scripts/`)
- Environment configuration (`.env`, `backend/app/config.py`)

**How to work with Copilot:**
- Inline completions for Python/SQL within backend files
- Ask Copilot Chat for migration SQL, endpoint boilerplate, and test fixtures
- Keep migrations as versioned SQL files in `backend/migrations/` (create this directory)
- All new schema changes require a corresponding migration script before merging

**Working constraints:**
- Python runtime via `.venv` in `backend/`
- Database URL set in `backend/.env` (copy from `.env.example`)
- API available at `http://localhost:8000`; Swagger docs at `/docs`
- The `tempo_hint` column on `bible_text` is the next required schema change (see POC scope below)

---

## Project Stack

| Layer | Technology |
|---|---|
| Frontend framework | TanStack Start v1.167 (SSR React) |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Animation | Motion (`motion/react`) |
| Styling | Tailwind CSS v4 |
| Build | Vite 7 + `@vitejs/plugin-react` |
| Package manager | Bun |
| Backend | FastAPI + SQLAlchemy |
| Database | PostgreSQL (Docker) |
| Deployment target | Cloudflare Workers (future) |

---

## Data Model (current)

`BIBLE_TEXT` is the central entity. All features attach to a verse ID.

```
BIBLE_TEXT { id, book, chapter, verse, translation, literal_rendering, semantic_domains, readability_grade }
ORIGINAL_LANGUAGE { id, verse_id → BIBLE_TEXT, lemma, morphology, gloss, strongs, syntax_tree }
TRANSLATION_NOTES { id, verse_id → BIBLE_TEXT, note_type, content, references }
COMMENTARY { id, verse_id → BIBLE_TEXT, level, content }
CROSS_REFERENCE { id, from_verse_id → BIBLE_TEXT, to_verse_id → BIBLE_TEXT, ref_type, note }
MEDIA { id, verse_id → BIBLE_TEXT, media_type, file_path, metadata }
```

Full ER diagram: `backend/docs/erDiagram.md`

---

## POC Scope — Reading Experience

The POC is complete when these five things work end-to-end:

### 1. Breath Word Animation
Replace 3D zoom with a soft breath arrival:
```
initial: { opacity: 0, y: 10, filter: "blur(3px)", scale: 0.97 }
animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
```
No 3D transforms. No `rotateX`. No `z` depth.

### 2. Verse-Paced Background Scroll
Background text scrolls **only when a verse completes** — not on every word reveal.
```js
// fires on verse change, not word change
bg.scrollTo({ top: bg.scrollHeight - bg.clientHeight, behavior: "smooth" })
```

### 3. Chrome Recession During Playback
Chrome elements (TopBar, verse badge, watermark, pull-handle, speed hint) fade to ~20% opacity while reading is active, return to full opacity on pause or tap.
```css
[data-reading="true"] .chrome-element { opacity: 0.2; transition: opacity 0.8s ease; }
```

### 4. Punctuation-Aware Timing
Base WPM interval multiplied based on trailing token character:

| Trailing character | Multiplier |
|---|---|
| `.` `?` `!` | 2.5× |
| `,` `;` `:` | 1.5× |
| `—` `-` | 1.3× |
| Verse marker | 1.8× |
| Default | 1.0× |

### 5. `tempo_hint` Backend Schema
```python
# backend/app/models.py — BibleText
tempo_hint: Optional[float] = None  # multiplier: 0.7 = slower, 1.3 = faster
```
```sql
-- migration
ALTER TABLE bible_text ADD COLUMN tempo_hint FLOAT;
```
Returned in API response. Frontend respects it as a per-verse interval multiplier. Default `null` = punctuation rules only. Guard: `tempo_hint > 0` (treat 0 as null).

---

## Key Design Decisions (rationale)

| Decision | Rejected alternative | Reason |
|---|---|---|
| Breath animation (opacity + translateY + scale) | 3D zoom (rotateX, z-depth) | 3D feels mechanical; target is iOS "Hello" screen warmth |
| Background scrolls at verse breaks only | Scroll on every word reveal | Per-word scroll competes with foreground; background is a quiet record |
| Chrome recession via `data-reading` attribute + CSS | Hide chrome entirely during playback | User needs grounding elements (book, chapter, verse) to stay oriented |
| Punctuation multipliers per token | Fixed WPM for all tokens | Flat interval is a metronome, not a voice |
| `tempo_hint` field now, authoring UI later | Wait until UI exists | Schema change is cheap now, expensive later |
| Navigation (verse picker, chapter browser) deferred | Include in POC | Mixing navigation and atmosphere work dilutes both |

---

## Prototype Reference

A working static prototype lives at `frontend/scripture-flow/public/prototype_atmosphere.html`. Open it directly in a browser to validate animation feel without running the full stack. This is the approved design reference for the POC build.

---

## Local Development

```powershell
# One-command startup (Docker + backend + frontend + browser)
.\launch.ps1

# Manual steps if launch.ps1 fails:
docker compose up -d                        # start PostgreSQL
cd backend && uvicorn app.main:app --reload # backend on :8000
cd frontend/scripture-flow && bun run dev   # frontend on :5173
```

API docs: `http://localhost:8000/docs`
Frontend: `http://localhost:5173`

---

## Backlog (not in POC)

These are logged and intentionally deferred:

- Verse picker — tap to jump to any book/chapter/verse
- Chapter browser — swipe to browse chapters within a book
- Book/chapter navigation improvements for mobile
- Original language layer (Hebrew/Greek word data)
- Parallel translation view
- Per-reader speed preferences
- Tempo hint authoring UI
- Community annotations / shared notes
- Mobile app / PWA
- Cloudflare Workers deployment

---

## Archived History

Prior session notes, design docs, and decisions are preserved in `docs/archive/`:
- `2026-05-23-atmosphere-animation-design.md` — approved PRD for the atmosphere POC
- `decisions.log` — six key design decisions with rejected alternatives
- `PROJECT_HISTORY.md` — session log through 2026-05-15
- `PROJECT_ROADMAP.md` — roadmap snapshot at 2026-05-23
