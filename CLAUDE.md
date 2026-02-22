# Learner - PDF-to-Course Web App

## Project Overview
Learner converts PDF textbooks into interactive courses with quizzes and video resource recommendations. Users upload a book, get a navigable roadmap from the Table of Contents, and for each unit the app generates MCQ quizzes and finds relevant YouTube videos using AI.

## Tech Stack
- **Backend**: FastAPI (Python 3.12+), async SQLAlchemy + asyncpg, Alembic, Pydantic v2
- **Frontend**: React 18 + TypeScript, Vite, TanStack Query, React Router v6, Tailwind CSS v4, Axios
- **Database**: PostgreSQL 16 (via Docker)
- **LLM**: Cloudflare Workers AI (default model: @cf/openai/gpt-oss-120b)
- **Video Search**: YouTube Data API v3 (via google-api-python-client)
- **PDF Processing**: PyMuPDF (pymupdf)
- **Auth**: None (single-user mode)

## Architecture
Clean layered architecture:
```
API Routers → Services (business logic) → Repositories (data access) → SQLAlchemy/PostgreSQL
                  ↓
                  Utility Services (PDFService, LLMService, VideoSearchService)
```

### LLM Provider
```
BaseLLMService (abstract)
└── CloudflareLLMService — uses Cloudflare Workers AI REST API with native JSON schema mode
```

Instantiated in `deps.py`. Implements `generate_quiz()` and `generate_search_queries()`.

## Project Structure
```
learner/
├── CLAUDE.md
├── docker-compose.yml          # PostgreSQL 16
├── backend/
│   ├── .env                    # Environment config (not committed)
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                # Migrations (async)
│   └── app/
│       ├── main.py             # FastAPI app factory
│       ├── api/v1/             # Route handlers
│       ├── core/               # Config, database, deps, exceptions
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic v2 schemas
│       ├── services/           # Business logic
│       ├── repositories/       # Data access layer
│       └── utils/              # PDF, LLM, video search utilities
│           ├── llm_service.py              # Base class + shared schemas/prompts
│           ├── cloudflare_llm_service.py  # Cloudflare Workers AI implementation
│           ├── pdf_service.py
│           └── video_search_service.py
├── frontend/
│   └── src/
│       ├── components/         # Reusable components
│       ├── pages/              # Route pages
│       ├── hooks/              # TanStack Query hooks
│       ├── services/           # Axios API client
│       ├── types/              # TypeScript interfaces
│       └── utils/              # Formatters, helpers
└── uploads/                    # PDF storage (git-ignored)
```

## Database Tables
- `books` - Uploaded PDF books with metadata and file hash
- `units` - Hierarchical ToC entries (self-referential FK for parent-child, 1-3 levels)
- `quiz_questions` - Generated MCQ questions per unit (JSONB options)
- `quiz_attempts` - Quiz attempt records with scores
- `quiz_answers` - Individual answers per attempt
- `video_resources` - Cached video search results per unit (source-agnostic)

## Key Commands
```bash
# Database
docker-compose up -d                              # Start PostgreSQL

# Backend
cd backend
pip install -r requirements.txt                    # Install deps
alembic upgrade head                               # Run migrations
uvicorn app.main:app --reload                      # Dev server on :8000

# Frontend
cd frontend
npm install                                        # Install deps
npm run dev                                        # Dev server on :5173

# LLM — Cloudflare Workers AI (no local setup needed)
# Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in backend/.env
```

## API Base URL
All endpoints prefixed with `/api/v1/`. Key groups:
- `POST /api/v1/books/upload` - Upload PDF, extract ToC
- `GET /api/v1/books/{id}` - Book detail with unit tree
- `POST /api/v1/units/{id}/process` - Trigger unit processing (async, returns 202)
- `GET /api/v1/units/{id}/quiz` - Get quiz for a unit
- `GET /api/v1/units/{id}/resources` - Get video resources for a unit

## Design Principles
- Raw PDF text is NEVER stored in DB — only processed outputs (quizzes, video resources)
- Units are processed on-demand (lazy) when first visited, then cached
- Background processing via FastAPI BackgroundTasks with in-memory status tracking
- Rate limiting on LLM and video search APIs via aiolimiter
- LLM powered by Cloudflare Workers AI with native JSON schema mode (free tier: 10K neurons/day)
- UUIDs for all primary keys
- Repository pattern for data access separation

## Environment Variables
Required in `backend/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID (from dashboard)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token (with Workers AI permissions)
- `CLOUDFLARE_MODEL` - Model name (default: @cf/openai/gpt-oss-120b)
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
