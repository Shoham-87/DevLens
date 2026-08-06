# DevLens 🔭

I built DevLens because I was tired of jumping between GitHub, documentation tabs, and my IDE just to understand what a codebase does. The idea is simple — connect your GitHub repos, and DevLens gives you an AI layer on top of them. Ask questions about your code in plain English, get smart library recommendations, and have pull requests automatically reviewed before anyone even looks at them.

It's a side project I'm building alongside my day job as a software engineer. Phase 1 (what's in this repo right now) handles the authentication, repository management, and the foundation everything else builds on. The AI features — the chatbot, recommendations, and PR reviewer — are coming in Phase 2.

---

## What it does right now

- **Sign in with GitHub** — full OAuth2 flow, no passwords to manage
- **Connect your repos** — browse your GitHub repositories and bring them into DevLens
- **Dashboard** — see all your connected repos with their current status at a glance
- **Repo detail page** — tracks indexing progress and will unlock AI features once a repo is fully processed
- **JWT authentication** — stateless, with access tokens (15 min) and refresh tokens (7 days) so you stay logged in without re-authenticating constantly

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

**Coming in Phase 2**
- Python FastAPI service for code ingestion
- LangChain + OpenAI for the RAG chatbot
- pgvector for storing code embeddings
- Apache Kafka for event-driven ingestion triggers

---

## Running it locally

You'll need: Java 21, Node 18+, MongoDB running locally, and a GitHub OAuth App.

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

**5. Open the app**

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
└── devlens-frontend/         # React + Vite application
    └── src/
        ├── pages/            # Login, Dashboard, Repos, RepoDetail
        ├── components/       # Navbar, Sidebar, AppLayout
        ├── context/          # Auth state (AuthContext)
        ├── services/         # Axios API calls
        ├── router/           # React Router config, ProtectedRoute
        ├── constants/        # Route paths, status enums
        └── styles/           # CSS variables, Bootstrap overrides
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

---

## A few design decisions worth mentioning

**Why MongoDB?** The data is document-shaped — a user has repos, repos have status and metadata — and MongoDB's flexible schema made it easy to evolve the structure during development. pgvector (PostgreSQL) is coming in Phase 2 specifically for vector embeddings, since that's what it's built for.

**Why not store the JWT in localStorage?** localStorage is readable by any JavaScript on the page, which makes it vulnerable to XSS attacks. The access token lives in React state (gone on page refresh, which is the right behaviour for a security-sensitive tool that accesses private repos) and the refresh token in memory too. It's a deliberate trade-off between convenience and security.

**Why separate access and refresh tokens?** Access tokens expire in 15 minutes — short enough that a leaked token does limited damage. Refresh tokens live 7 days but are stored in MongoDB, which means you can actually revoke them (logout genuinely works, not just "forget the token on the client"). A purely stateless single-token approach can't be truly revoked before expiry.

**Why store the GitHub access token on the User entity?** Spring Security's default `OAuth2AuthorizedClientService` stores tokens in memory — gone on every restart. Since the backend needs the token to call GitHub's API on the user's behalf (for repo listing and metadata), storing it in MongoDB alongside the user record makes it reliable across restarts and deployments.

---

## What's coming in Phase 2

The ingestion pipeline — clone a connected repo, walk every file, chunk the code intelligently, generate embeddings via OpenAI's API, store them in pgvector. Once a repo is indexed, the three locked panels on the repo detail page unlock:

- **Codebase chatbot** — ask "where is authentication handled?" and get an answer with file and line references
- **Library recommender** — AI suggests better libraries based on what you're already using
- **PR auto-reviewer** — a LangGraph agent that posts structured review comments on new pull requests automatically

---

## About

Built by [Shoham Dey Sarkar](https://linkedin.com/in/shoham-dey-sarkar) 