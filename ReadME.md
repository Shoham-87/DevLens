# DevLens 🔭

I built DevLens because I was tired of jumping between GitHub, documentation tabs, and my IDE just to understand what a codebase does. The idea is simple — connect your GitHub repos, and DevLens gives you an AI layer on top of them. Ask questions about your code in plain English, get smart library recommendations, and have pull requests automatically reviewed before anyone even looks at them.

It's a side project I'm building alongside my day job as a software engineer. Phase 1 handled the authentication, repository management, and the foundation everything else builds on. Phase 2 is underway — the first half is the ingestion pipeline (clone → walk → chunk → embed → store), now live in a dedicated Python service. The chatbot, recommendations, and PR reviewer that read from this index are still to come.

---

## What it does right now

- **Sign in with GitHub** — full OAuth2 flow, no passwords to manage
- **Connect your repos** — browse your GitHub repositories and bring them into DevLens
- **Dashboard** — see all your connected repos with their current status at a glance
- **Repo detail page** — tracks indexing progress and will unlock AI features once a repo is fully processed
- **JWT authentication** — stateless, with access tokens (15 min) and refresh tokens (7 days) so you stay logged in without re-authenticating constantly
- **Code ingestion pipeline** — a background service clones a connected repo, walks its files, chunks the code with AST-aware parsing, generates embeddings, and stores them in pgvector, updating progress back to MongoDB as it goes

---

## Tech stack

**Backend (Spring Boot)**
- Spring Boot 3.x with Spring Security OAuth2
- MongoDB for user data, connected repos, and refresh tokens
- JWT-based stateless authentication (`jjwt` 0.12.x)
- Async processing with `@Async` for the ingestion pipeline (Phase 2 replaces the stub)
- GitHub REST API integration for fetching repo metadata

**Frontend (React + Vite)**
- React 18 with React Router v6
- Bootstrap 5 for layout, custom CSS design tokens for the visual style
- Axios with request/response interceptors for automatic token handling
- In-memory token storage (no localStorage — intentional security decision)

**Ingestion service (Python + FastAPI)** — `devlens-ai/`
- FastAPI service that runs the ingestion pipeline as a background task
- GitPython to clone the connected repo over an authenticated HTTPS URL
- A file-system walker that filters by extension, size, and excluded directories, and skips binaries
- `tree-sitter` (with per-language grammars: Java, Python, JS/TS, Go, Rust, C#, Kotlin) to chunk code by function/method boundaries, falling back to a sliding-window line chunker for unsupported file types
- Jina AI's `jina-embeddings-v2-base-code` model (via HTTP) to embed each chunk in batches
- `psycopg` (async, pooled) + `pgvector` to store chunks and their embeddings in Postgres
- `motor` (async MongoDB driver) to write ingestion progress (status, files processed, chunks created) back to the same MongoDB the backend uses

**Still coming in Phase 2**
- LangChain + an LLM for the RAG chatbot that queries the pgvector index
- Library recommender built on top of the same embeddings
- LangGraph-based PR auto-reviewer

---

## Running it locally

You'll need: Java 21, Node 18+, Python 3.11+, MongoDB running locally, a Postgres instance with the `pgvector` extension, a GitHub OAuth App, and a Jina AI API key.

**1. Create a GitHub OAuth App**

Go to `github.com/settings/developers` → OAuth Apps → New OAuth App.

Set the callback URL to `http://localhost:8083/login/oauth2/code/github`. Copy the client ID and secret.

**2. Set up environment variables**

Create a `.env` file in the backend root (never commit this):

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET_KEY=your_64_char_random_secret
```

Generate a JWT secret with: `openssl rand -base64 64`

**3. Start the backend**

```bash
cd devlens-backend
./mvnw spring-boot:run
```

Runs on `http://localhost:8083`

**4. Start the frontend**

```bash
cd devlens-frontend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173`

**5. Start the ingestion service**

Create a `.env` file in `devlens-ai/`:

```
DATABASE_URI=postgresql://user:password@localhost:5432/devlens
INCOMING_DATABASE_URI=mongodb://localhost:27017
JINA_API_KEY=your_jina_api_key
```

`app.properties` in the same folder configures the file walker (excluded directories, allowed extensions, max file size) and which incoming DB to write status updates to — defaults are checked in and shouldn't need changes for local dev.

```bash
cd devlens-ai
python -m venv venv
venv\Scripts\activate      # on Windows; use `source venv/bin/activate` on macOS/Linux
pip install fastapi uvicorn pydantic-settings psycopg[pool,binary] pgvector motor gitpython httpx \
    tree-sitter tree-sitter-java tree-sitter-python tree-sitter-javascript tree-sitter-typescript \
    tree-sitter-go tree-sitter-rust tree-sitter-c-sharp tree-sitter-kotlin
uvicorn main:app --reload --port 8000
```

> `requirements.txt` is still empty (a Phase 2 to-do) — the packages above are what the code currently imports.

Runs on `http://localhost:8000`. The backend's ingestion trigger (Phase 2, second half) will call this service's `/ai/ingest` endpoint once a repo is connected.

**6. Open the app**

Go to `http://localhost:5173/devlens/login` and sign in with GitHub.

---

## Project structure

```
devlens/
├── devlens-backend/          # Spring Boot application
│   └── src/main/java/com/sds/devlens/
│       ├── controllers/      # REST endpoints
│       ├── entity/           # MongoDB documents
│       ├── repository/       # Spring Data repositories
│       ├── security/         # JWT filter, OAuth success handler, security config
│       ├── services/         # Business logic, GitHub API client
│       ├── enums/            # Storing the enums used in project
│       ├── dto/              # Request/response data shapes
│       └── utility/          # JWT utilities
│
├── devlens-frontend/         # React + Vite application
│   └── src/
│       ├── pages/            # Login, Dashboard, Repos, RepoDetail
│       ├── components/       # Navbar, Sidebar, AppLayout
│       ├── context/          # Auth state (AuthContext)
│       ├── services/         # Axios API calls
│       ├── router/           # React Router config, ProtectedRoute
│       ├── constants/        # Route paths, status enums
│       └── styles/           # CSS variables, Bootstrap overrides
│
└── devlens-ai/                # Python FastAPI ingestion service
    ├── main.py                # App setup, lifespan (Postgres pool + Mongo client)
    ├── config.py               # Pydantic settings, loaded from .env + app.properties
    ├── routers/
    │   └── ingestion.py         # POST /ai/ingest, GET /ai/health
    ├── services/
    │   ├── cloner.py             # Git clone/cleanup of the target repo
    │   ├── walker.py             # Filesystem walk + file eligibility filtering
    │   ├── chunker.py            # tree-sitter AST chunking + sliding-window fallback
    │   ├── embedder.py           # Batches chunks through the Jina embeddings API
    │   └── pipeline.py           # Orchestrates clone → walk → chunk → embed → save
    ├── db/
    │   ├── mongo.py               # Ingestion status/progress updates
    │   └── pgvector.py            # Bulk insert of chunks + embeddings into Postgres
    ├── models/                  # Pydantic request/response schemas
    └── enums/                   # Status, IncomingDB enums
```

---

## API endpoints

All endpoints are prefixed with `/devlens` and require a `Bearer` token except where noted.

| Method | Path | What it does |
|--------|------|-------------|
| `GET` | `/devlens/homepage` | Redirect to frontend (public) |
| `GET` | `/devlens/me` | Current user's profile |
| `GET` | `/devlens/repos` | List user's GitHub repos |
| `GET` | `/devlens/repos/connected` | List repos connected to DevLens |
| `POST` | `/devlens/repos/{repoId}/connect` | Connect a GitHub repo |
| `GET` | `/devlens/repos/{repoId}/status` | Indexing status for a repo |
| `GET` | `/devlens/repos/{repoId}` | Full repo detail + GitHub metadata |

The ingestion service exposes its own API, unauthenticated for now since it's only called server-to-server:

| Method | Path | What it does |
|--------|------|-------------|
| `GET` | `/ai/health` | Health check |
| `POST` | `/ai/ingest` | Kicks off the ingestion pipeline as a background task for a given repo; returns `202 Accepted` immediately |

---

## A few design decisions worth mentioning

**Why MongoDB?** The data is document-shaped — a user has repos, repos have status and metadata — and MongoDB's flexible schema made it easy to evolve the structure during development. pgvector (PostgreSQL) now handles vector embeddings specifically, since that's what it's built for.

**Why not store the JWT in localStorage?** localStorage is readable by any JavaScript on the page, which makes it vulnerable to XSS attacks. The access token lives in React state (gone on page refresh, which is the right behaviour for a security-sensitive tool that accesses private repos) and the refresh token in memory too. It's a deliberate trade-off between convenience and security.

**Why separate access and refresh tokens?** Access tokens expire in 15 minutes — short enough that a leaked token does limited damage. Refresh tokens live 7 days but are stored in MongoDB, which means you can actually revoke them (logout genuinely works, not just "forget the token on the client"). A purely stateless single-token approach can't be truly revoked before expiry.

**Why store the GitHub access token on the User entity?** Spring Security's default `OAuth2AuthorizedClientService` stores tokens in memory — gone on every restart. Since the backend needs the token to call GitHub's API on the user's behalf (for repo listing and metadata), storing it in MongoDB alongside the user record makes it reliable across restarts and deployments.

**Why a separate Python service for ingestion instead of doing it in Spring Boot?** The ingestion pipeline leans entirely on the Python ecosystem — `tree-sitter` bindings, embedding clients, the eventual LangChain/LangGraph stack — so a dedicated FastAPI service avoided fighting the JVM for that tooling. The Spring backend stays the source of truth for users/repos and will call this service (or hand it a job) rather than reimplement any of it.

**Why tree-sitter instead of naive line-based chunking?** Splitting code by function/method boundaries keeps each chunk semantically complete, which matters a lot for embedding quality and for the chatbot answers Phase 2 is building toward. Files in languages without a configured grammar (or that fail to parse) fall back to a fixed-size sliding window with overlap, so nothing gets dropped from the index.

**Why pgvector over the MongoDB used everywhere else?** Vector similarity search is what pgvector is built for, and it's a mature, well-indexed option on top of Postgres. MongoDB stays as the transactional store for repo/ingestion status — the two databases are used for what each is good at, not as a stylistic choice.

---

## What's coming next in Phase 2

The ingestion pipeline itself is done: clone a connected repo, walk every file, chunk the code with `tree-sitter`, generate embeddings via Jina, and store them in pgvector, with live progress reported back to MongoDB. What's left before a repo's locked panels unlock on the repo detail page:

- **Wiring the trigger** — the Spring backend calling `devlens-ai`'s `/ai/ingest` when a repo is connected, instead of it being invoked manually
- **Codebase chatbot** — ask "where is authentication handled?" and get an answer with file and line references, backed by a RAG query over the pgvector index
- **Library recommender** — AI suggests better libraries based on what you're already using
- **PR auto-reviewer** — a LangGraph agent that posts structured review comments on new pull requests automatically

---

## About

Built by [Shoham Dey Sarkar](https://linkedin.com/in/shoham-dey-sarkar) 