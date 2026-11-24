# DevLens 🔭

I built DevLens because I was tired of jumping between GitHub, documentation tabs, and my IDE just to understand what a codebase does. The idea is simple — connect your GitHub repos, and DevLens gives you an AI layer on top of them. Ask questions about your code in plain English, get smart library recommendations, and have pull requests automatically reviewed before anyone even looks at them.

It's a side project I'm building alongside my day job as a software engineer. Phase 1 handled the authentication, repository management, and the foundation everything else builds on. Phase 2 is underway: the ingestion pipeline (clone → walk → chunk → embed → store) and the RAG chatbot on top of it are both live, along with a code-browsing chat workspace and the ability to disconnect repos. The library recommender and PR reviewer are still to come, and they're hidden from the UI until they exist.

---

## What it does right now

- **Sign in with GitHub** — full OAuth2 flow, no passwords to manage
- **Connect your repos** — browse your GitHub repositories and bring them into DevLens
- **Automatic indexing** — connecting a repo triggers the ingestion service, which clones it, chunks the code with AST-aware parsing, embeds the chunks, and stores them in pgvector
- **Live indexing progress** — the repo detail page shows files processed, chunks created, and overall status as ingestion runs
- **Chat workspace** — once a repo is `READY`, open a three-pane view: a searchable file tree, a syntax-highlighted code viewer, and the chat panel. Drag the divider to resize the chat; the width is remembered
- **Chat with your codebase** — ask questions in plain English and get a streamed answer with multi-turn conversation history. Citations like `file (lines X-Y)` are clickable and open the file in the code viewer with those lines highlighted
- **Rich answers** — responses render as Markdown: headings, tables, lists, quotes, links and syntax-highlighted code blocks, each with a copy-to-clipboard button
- **Repo-only guardrails** — off-topic requests (e.g. "write a Python script that counts to 100") are declined with a short pointer back to the repo, without spending a retrieval or answer call
- **Disconnect a repo** — removes it from DevLens and deletes its indexed chunks and overview. If indexing is still running, it's stopped and any partial data is cleaned up. Your GitHub repo isn't touched
- **Dashboard** — see all your connected repos with their current status at a glance
- **JWT authentication** — stateless, with access tokens (15 min) and refresh tokens (7 days) so you stay logged in without re-authenticating constantly

---

## How a chat question flows

```
React ChatPanel ──fetch (stream)──▶ Spring /devlens/chat ──HTTP──▶ FastAPI /ai/chat
      ▲                              │ checks JWT, repo ownership,      │ 1. route: rewrite question, pick scope,
      │                              │ and status == READY              │    extract keywords, flag off-topic
      │                              │                                  │ 2. retrieve: vector + keyword search
      │                              │                                  │    (pgvector), fused and reranked (Jina)
      │                              │                                  │ 3. answer: LLM stream (Groq via LangChain)
      └────── SSE tokens ◀───────────┘◀──── streamed text ──────────────┘
```

- **Routing** — a small, fast model (`openai/gpt-oss-20b`) rewrites follow-ups like "what about that function?" into a standalone question. It classifies the scope as `specific` (a function, file or bug) or `global` (architecture, improvements, review), lists likely identifiers, and flags off-topic requests. Off-topic questions get a canned reply right there.
- **Retrieval** — `specific` questions pull code chunks plus a few file summaries. `global` questions also pull the repo overview and file tree generated at ingestion time. Vector and full-text results are merged with reciprocal-rank fusion and then reranked. The whole context is capped by a character budget.
- **Answering** — the main model (`openai/gpt-oss-120b`, temperature 0) answers in Markdown with citations, using only the retrieved context. History and output length are capped too.

---

## Tech stack

**Backend (Spring Boot)**
- Spring Boot 3.x on Java 21 with Spring Security OAuth2
- MongoDB for user data, connected repos, and refresh tokens
- JWT-based stateless authentication (`jjwt` 0.12.x)
- GitHub REST API integration for fetching repo metadata
- `RestClient` calls to the ingestion service: triggers `/ai/ingest` on connect, calls `DELETE /ai/repos/{id}` on disconnect, and relays `/ai/chat` responses to the browser as Server-Sent Events (`SseEmitter`)
- GitHub tree and contents APIs back the file tree and code viewer in the chat workspace

**Frontend (React + Vite)**
- React 18 with React Router v6
- Bootstrap 5 for layout, custom CSS design tokens for the visual style
- Axios with request/response interceptors for automatic token handling
- Chat uses `fetch` with a `ReadableStream` reader and a small SSE parser (Axios can't consume a streaming response body in the browser), with a Stop button that aborts the stream
- A small built-in Markdown renderer for chat answers (instead of a library), so citations can turn into buttons that jump to the code viewer
- `highlight.js` (core build, languages registered on demand) for the code viewer and chat code blocks
- In-memory token storage (no localStorage — intentional security decision)

**AI service (Python + FastAPI)** — `devlens-ai/`
- FastAPI service that runs the ingestion pipeline as a background task and serves the chat endpoint
- GitPython to clone the connected repo over an authenticated HTTPS URL
- A file-system walker that filters by extension, size, and excluded directories, and skips binaries
- `tree-sitter` (with per-language grammars: Java, Python, JS/TS, Go, Rust, C#, Kotlin) to chunk code by function/method boundaries, falling back to a sliding-window line chunker for unsupported file types
- Per-file summaries (imports and symbols) stored alongside code chunks, plus an LLM-generated repository overview and file tree, built from the README and file summaries at the end of ingestion
- Jina AI's `jina-embeddings-v2-base-code` model (via HTTP) to embed chunks during ingestion and to embed the question at chat time, and `jina-reranker-v2-base-multilingual` to rerank retrieved candidates
- `psycopg` (async, pooled) + `pgvector` to store chunks, with an HNSW index for cosine search and a generated `tsvector` column for keyword search
- LangChain + `langchain-groq`: `openai/gpt-oss-20b` routes questions, `openai/gpt-oss-120b` (temperature 0) generates the repo overview and the streamed answers
- `motor` (async MongoDB driver) to write ingestion progress (status, files processed, chunks created) back to the same MongoDB the backend uses

---

## Running it locally

You'll need: Java 21, Node 18+, Python 3.11+, MongoDB running locally, a Postgres instance with the `pgvector` extension, a GitHub OAuth App, a Jina AI API key, and a Groq API key.

Start the services in this order: AI service, backend, frontend. Connecting a repo calls the AI service right away.

**1. Create a GitHub OAuth App**

Go to `github.com/settings/developers` → OAuth Apps → New OAuth App.

Set the callback URL to `http://localhost:8083/login/oauth2/code/github`. Copy the client ID and secret.

**2. Start the AI service**

Create a `.env` file in `devlens-ai/`:

```
DATABASE_URI=postgresql://user:password@localhost:5432/devlens
INCOMING_DATABASE_URI=mongodb://localhost:27017
JINA_API_KEY=your_jina_api_key
GROQ_API_KEY=your_groq_api_key
```

`app.properties` in the same folder configures the file walker (excluded directories, allowed extensions, max file size), which incoming DB to write status updates to, the models, and the chat limits. The checked-in defaults work for local dev:

| Property | Default | What it controls |
|----------|---------|------------------|
| `devlens.app.llm.chat_model` | `openai/gpt-oss-120b` | Model that writes chat answers |
| `devlens.app.llm.router_model` | `openai/gpt-oss-20b` | Model that rewrites, classifies and screens questions |
| `devlens.app.llm.overview_model` | `openai/gpt-oss-120b` | Model that writes the repo overview during ingestion |
| `devlens.app.llm.max_output_tokens` | `2500` | Cap on answer length |
| `devlens.app.rag.rerank_enabled` | `true` | Rerank retrieved candidates with Jina |
| `devlens.app.rag.max_history_messages` | `6` | How many past messages are sent with a question |
| `devlens.app.rag.max_history_chars` | `3000` | Character budget for that history |
| `devlens.app.rag.max_context_chars` | `12000` | Character budget for retrieved code, summaries and overview |
| `devlens.app.rag.guardrails_enabled` | `true` | Short-circuit off-topic questions with a canned reply (the system prompt still keeps answers repo-scoped when this is off) |

```bash
cd devlens-ai
python -m venv venv
venv\Scripts\activate      # on Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Runs on `http://localhost:8000`.

**3. Start the backend**

The Spring Boot app lives at the repository root, so there's no subfolder to `cd` into. Create a `.env` file in the repository root (never commit this):

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET_KEY=your_64_char_random_secret
```

Generate a JWT secret with: `openssl rand -base64 64`

```bash
# from the repository root
./mvnw spring-boot:run       # on Windows: mvnw.cmd spring-boot:run
```

Runs on `http://localhost:8083`. It expects the AI service at `http://127.0.0.1:8000/ai` (`devlens.ingestion.url` in `application.yaml`).

**4. Start the frontend**

```bash
cd devlens-frontend
cp .env.example .env         # sets VITE_API_BASE_URL=http://localhost:8083
npm install
npm run dev
```

Runs on `http://localhost:5173`. Run `npm run dev` from inside `devlens-frontend/`, since the repository root has no `package.json`.

**5. Open the app**

Go to `http://localhost:5173/devlens/login` and sign in with GitHub. Connect a repo, wait for its status to reach `READY`, then click **Open chat** on the repo detail page. To remove a repo, use **Disconnect** on the same page.

---

## Project structure

```
devlens/                      # repository root = Spring Boot backend
├── pom.xml, mvnw, mvnw.cmd
├── src/main/java/com/sds/devlens/
│   ├── controllers/          # Auth, Dashboard, Repo, Chat, Health endpoints
│   ├── entity/               # MongoDB documents
│   ├── repository/           # Spring Data repositories
│   ├── security/             # JWT filter, OAuth success handler, security config
│   ├── services/             # Business logic, GitHub API client, ingestion trigger, chat SSE relay
│   ├── enums/                # Storing the enums used in project
│   ├── dto/                  # Request/response data shapes
│   └── utility/              # JWT utilities
├── src/main/resources/
│   └── application.yaml      # Ports, Mongo, OAuth, JWT lifetimes, AI service URL
│
├── devlens-frontend/         # React + Vite application
│   └── src/
│       ├── pages/            # Login, Dashboard, Repos, RepoDetail (status, disconnect),
│       │                     # RepoChat (FileTree, CodeViewer, ChatPanel + Markdown renderer)
│       ├── components/       # Navbar, Sidebar, AppLayout, ProfileMenu, ThemeToggle
│       ├── context/          # Auth state (AuthContext), theme (ThemeContext)
│       ├── hooks/            # useLogout
│       ├── services/         # Axios API calls
│       ├── router/           # React Router config, ProtectedRoute
│       ├── constants/        # Route paths, status enums
│       └── styles/           # CSS variables, Bootstrap overrides
│
└── devlens-ai/                # Python FastAPI ingestion + chat service
    ├── main.py                # App setup, lifespan (Postgres pool + Mongo client)
    ├── config.py              # Pydantic settings, loaded from .env + app.properties
    ├── requirements.txt       # Pinned direct dependencies
    ├── routers/
    │   ├── ingestion.py       # POST /ai/ingest, DELETE /ai/repos/{id}, GET /ai/health
    │   └── chat.py            # POST /ai/chat (streamed text response)
    ├── services/
    │   ├── cloner.py          # Git clone/cleanup of the target repo
    │   ├── walker.py          # Filesystem walk + file eligibility filtering
    │   ├── chunker.py         # tree-sitter AST chunking, sliding-window fallback, file summaries
    │   ├── embedder.py        # Jina embeddings + reranking
    │   ├── overview.py        # LLM-generated repo overview + file tree
    │   ├── pipeline.py        # Orchestrates clone → walk → chunk → embed → save; handles cancellation
    │   └── rag.py             # Route + guardrail → hybrid search + rerank → prompt → stream LLM answer
    ├── db/
    │   ├── mongo.py           # Ingestion status/progress updates
    │   └── pgvector.py        # Schema, chunk/overview storage, vector + keyword search, repo deletion
    ├── models/                # Pydantic request/response schemas
    └── enums/                 # Status, IncomingDB enums
```

---

## API endpoints

All backend endpoints are prefixed with `/devlens` and require a `Bearer` token except where noted.

| Method | Path | What it does |
|--------|------|-------------|
| `GET` | `/devlens/homepage` | Redirect to frontend (public) |
| `GET` | `/devlens/health/check` | Backend health check |
| `GET` | `/devlens/me` | Current user's profile |
| `POST` | `/devlens/auth/logout` | Revokes the refresh token |
| `GET` | `/devlens/repos` | List user's GitHub repos |
| `GET` | `/devlens/repos/connected` | List repos connected to DevLens |
| `POST` | `/devlens/repos/{repoId}/connect` | Connect a GitHub repo and trigger ingestion |
| `GET` | `/devlens/repos/{repoId}/status` | Indexing status for a repo |
| `GET` | `/devlens/repos/{repoId}` | Full repo detail + GitHub metadata |
| `DELETE` | `/devlens/repos/{repoId}` | Disconnect a repo: deletes its indexed data via the AI service, then the connected-repo record. Returns `204`, `404` if the repo isn't yours, or `502` if the AI service couldn't remove the data (nothing is deleted, so it's safe to retry) |
| `GET` | `/devlens/repos/{repoId}/tree` | Full file tree of the repo from GitHub |
| `GET` | `/devlens/repos/{repoId}/file?path=…` | Contents of one file from GitHub |
| `POST` | `/devlens/chat` | Ask a question about a connected repo; responds with `text/event-stream`. Returns `404` if the repo isn't yours, `409` if it isn't `READY` yet |

Chat request body:

```json
{
  "connectedRepoId": "…",
  "question": "Where is the JWT validated?",
  "conversationHistory": [{ "role": "user", "content": "…" }, { "role": "assistant", "content": "…" }]
}
```

The AI service exposes its own API. It's unauthenticated for now because only the backend calls it:

| Method | Path | What it does |
|--------|------|-------------|
| `GET` | `/ai/health` | Health check |
| `POST` | `/ai/ingest` | Kicks off the ingestion pipeline as a background task for a given repo; returns `202 Accepted` immediately |
| `DELETE` | `/ai/repos/{connectedRepoId}` | Deletes the repo's chunks and overview, and cancels its ingestion if one is running |
| `POST` | `/ai/chat` | Runs the RAG query and streams the answer as plain text |

---

## A few design decisions worth mentioning

**Why MongoDB?** The data is document-shaped — a user has repos, repos have status and metadata — and MongoDB's flexible schema made it easy to evolve the structure during development. pgvector (PostgreSQL) handles vector embeddings specifically, since that's what it's built for.

**Why not store the JWT in localStorage?** localStorage is readable by any JavaScript on the page, which makes it vulnerable to XSS attacks. The access token lives in React state (gone on page refresh, which is the right behaviour for a security-sensitive tool that accesses private repos) and the refresh token in memory too. It's a deliberate trade-off between convenience and security.

**Why separate access and refresh tokens?** Access tokens expire in 15 minutes — short enough that a leaked token does limited damage. Refresh tokens live 7 days but are stored in MongoDB, which means you can actually revoke them (logout genuinely works, not just "forget the token on the client"). A purely stateless single-token approach can't be truly revoked before expiry.

**Why store the GitHub access token on the User entity?** Spring Security's default `OAuth2AuthorizedClientService` stores tokens in memory — gone on every restart. Since the backend needs the token to call GitHub's API on the user's behalf (for repo listing, metadata, and cloning during ingestion), storing it in MongoDB alongside the user record makes it reliable across restarts and deployments.

**Why a separate Python service for the AI work instead of doing it in Spring Boot?** Ingestion and chat lean on the Python ecosystem: `tree-sitter` bindings, embedding clients, LangChain, and the LangGraph stack the PR reviewer will use. A dedicated FastAPI service avoids fighting the JVM for that tooling. The Spring backend stays the source of truth for users and repos and calls this service instead of reimplementing any of it.

**Why does chat go through Spring instead of the browser calling FastAPI directly?** The Spring backend already owns authentication. Proxying chat through it means the JWT, repo ownership, and `READY` status are checked in one place, and the AI service never has to be exposed to the browser. Spring relays the streamed text as SSE so the answer appears token by token.

**Why tree-sitter instead of naive line-based chunking?** Splitting code by function/method boundaries keeps each chunk semantically complete, which improves embedding quality and gives the chatbot coherent units to cite. Files in languages without a configured grammar (or that fail to parse) fall back to a fixed-size sliding window with overlap, so nothing gets dropped from the index.

**How is the chatbot kept honest?** Answers are generated at temperature 0 from only the retrieved context. Each chunk is labelled with its file path, line range, language, and chunk type. The system prompt requires citations in the form `file (lines X-Y)` and tells the model to reply "I couldn't find that in the indexed codebase" instead of guessing. Those citations are also what the frontend turns into clickable links, so a made-up path stays plain text instead of becoming a link.

**Why hybrid search plus a reranker?** Pure vector search is good at "how does auth work?" but weak at exact identifiers like `delete_repo_chunks`. Full-text search covers that. Merging the two with reciprocal-rank fusion and then reranking the top 30 with a cross-encoder gives noticeably better top results than either on its own.

**How are off-topic questions kept out?** In two layers. The router call that already runs on every question also labels it as about the repo or off-topic, and off-topic ones get a canned reply before any retrieval or answer tokens are spent. When it's unsure, the router lets the question through, so real repo questions aren't blocked. The main system prompt also scopes the assistant to the repository and tells it to ignore instructions inside the question, history or retrieved code that try to change its role. That catches anything the router misses.

**How does disconnect stay consistent across two databases?** Spring asks the AI service to delete the Postgres data first, and only removes the Mongo record once that succeeds. A failure leaves everything in place so the user can retry, instead of leaving orphaned embeddings. If ingestion is still running, the AI service flags it as cancelled. The pipeline checks that flag between files and before its final writes, stops, and deletes anything it had already saved.

**Why pgvector over the MongoDB used everywhere else?** Vector similarity search is what pgvector is built for, and it's a mature, well-indexed option on top of Postgres. MongoDB stays as the transactional store for repo/ingestion status — the two databases are used for what each is good at, not as a stylistic choice.

---

## What's coming next in Phase 2

Ingestion and chat are done end to end: connecting a repo triggers indexing, progress shows live on the repo detail page, a `READY` repo can be browsed and queried in the chat workspace, and repos can be disconnected cleanly. What's left (both are hidden from the UI until they ship):

- **Library recommender** — AI suggests better libraries based on what you're already using, built on the same embeddings
- **PR auto-reviewer** — a LangGraph agent that posts structured review comments on new pull requests automatically

---

## About

Built by [Shoham Dey Sarkar](https://linkedin.com/in/shoham-dey-sarkar)
