# Algo Arena

<p align="center">
  <img src="./public/algo_arena.png" alt="Algo Arena logo" width="120" />
</p>

<p align="center">
  <strong>An interactive platform to practice algorithms, data structures, and complexity.</strong>
</p>

<p align="center">
  Angular 20 + Node.js + MongoDB + C/C++ runner + local AI tutor with Ollama
</p>

---

## 👤 Author

Algo Arena has been developed by Mirko Distefano, Computer Science student at the Department of Mathematics and Computer Science, University of Catania, Italy.

Email: mirko.distefano@live.it

---

## ✨ Why it exists

`Algo Arena` was born to turn classic algorithm exercises into interactive labs:

- build heaps and RB-trees step by step
- fill in DP tables and trace the optimal path
- simulate relaxations on graphs
- solve exercises in C/C++ with real compilation

The goal is not just to "give the right answer", but to understand the procedure.

---

## 🧩 What's included

### Interactive labs

- `Heap Arena`: build max/min heap, extract, heapsort, tree visualisation
- `RB-Tree Arena`: guided insertions, recoloring, rotations, property checks
- `Graph Lab`: shortest path exercises with manual steps
- `Huffman Builder`: tree construction and encodings
- `String DP Lab`: LCS and Edit Distance with matrix and optimal path
- `Hash Open Lab`: open addressing hashing simulation
- `Master Lab`: recurrences and the Master theorem

### Code Arena

- exercises in `C/C++`
- compilation and execution via a dedicated runner
- server-side validation on test cases
- atomic scoring, without trusting the client

### Platform

- dashboard, user profile, and global leaderboard
- AI tutor integrated in the UI

---

## 🔐 Security & anti-cheat

### Main defences

- `server-side` validation of interactive labs
- lab sessions persisted on MongoDB with authoritative server-side state
- step-by-step submission of every significant interaction
- anti-replay with `nonce + sequence` rotated at each step
- atomic point claiming to prevent double assignments
- challenge escalation with `Cloudflare Turnstile` on suspicious flows
- anomaly monitor with security event persistence
- browser/request guard on `Origin`, `Referer`, and `Sec-Fetch-*`
- anti-automation heuristics for non-stealth headless / Puppeteer

---

## 🛠 Tech stack

### Frontend

- `Angular 20`
- `Angular Material`
- `Tailwind CSS`
- `RxJS`
- `Monaco Editor`
- `Joint JS`

### Backend

- `Node.js`
- `Express`
- `MongoDB` + `Mongoose`
- `JWT` on `httpOnly` cookies
- custom security services

### Additional runtimes

- isolated runner for `C/C++`
- `Ollama` for the local AI tutor
- PDF indexing for contextualised answers

---

## 🚀 Quick local start

### Prerequisites

- `Node.js` 20+
- `npm`
- `MongoDB`
- optional: `Docker` and `Docker Compose`

### 1. Install dependencies

```bash
npm install
```

### 2. Create the `.env` file

Start from `.env.example`:

```bash
cp .env.example .env
```

Minimum recommended configuration:

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/algo-arena
JWT_SECRET=change-me-with-a-strong-secret
TOKEN_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:4200,http://localhost:8080
RUNNER_URL=http://localhost:4000

AUTH_COOKIE_NAME=algo_arena_session
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_SECURE=false

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_EXPECTED_ACTION=security_challenge
SECURITY_CLEARANCE_COOKIE_NAME=algo_arena_clearance
SECURITY_CLEARANCE_TTL_MS=900000
```

For all available options, see `server/config.js`.

### 3. Start MongoDB

If you have a local Mongo instance:

```bash
mongod
```

Or just the database container:

```bash
docker compose up -d mongo
```

### 4. Start backend, runner, and frontend

In three separate terminals:

```bash
npm run server
```

```bash
npm run runner
```

```bash
npm start
```

Main endpoints in development:

- frontend: `http://localhost:4200`
- API: `http://localhost:3001/api`
- runner: `http://localhost:4000`

---

## 🐳 Start with Docker Compose

To start the full stack:

```bash
docker compose up --build
```

Exposed services:

- frontend: `http://localhost:8080`
- API: `http://localhost:3001/api`
- MongoDB: `mongodb://localhost:27017/algo-arena`
- runner: `http://localhost:4000`
- Ollama: `http://localhost:11434`

The stack includes:

- `mongo`
- `api`
- `runner`
- `web`
- `ollama`
- `ollama-init` to download the initial models

---

## 🤖 AI Tutor & PDF

The tutor integrated in the bottom right uses a local pipeline:

- embedding of PDFs in `pdfs/`
- contextual retrieval
- response generated with `Ollama`

Useful variables:

- `OLLAMA_URL`
- `OLLAMA_MODEL`
- `OLLAMA_EMBED_MODEL`
- `PDF_DIR`

If you don't need the tutor, you can still use the app without touching this part.

---

## 🔧 Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Angular frontend |
| `npm run build` | Production build |
| `npm run watch` | Watch build in development |
| `npm test` | Angular/Karma tests |
| `npm run server` | Start the Express backend |
| `npm run server:dev` | Backend with `nodemon` |
| `npm run runner` | Start the C/C++ runner |
| `npm run github-build` | Build for GitHub Pages |
| `npm run github-deploy` | Deploy to GitHub Pages |

---

## 📁 Project structure

```text
algo-arena/
├── src/app/
│   ├── core/          # services, guards, interceptors, models
│   ├── features/      # interactive labs
│   ├── pages/         # dashboard, auth, leaderboard, profiles
│   └── shared/        # reusable components, tutor, challenge
├── server/
│   ├── middleware/    # auth, browser guard
│   ├── models/        # User, LabSession, SecurityEvent, ...
│   ├── routes/        # auth, progress, code, chat, security
│   └── services/      # lab engine, scoring, security monitor
├── runner/            # sandboxed execution of C/C++ exercises
├── pdfs/              # documents indexed by the AI tutor
├── public/            # static assets
└── docker-compose.yml
```

## ⚠️ Operational notes

- in `production` you must set a real `JWT_SECRET`: the backend rejects the default
- if you use cross-origin cookies, `CLIENT_ORIGIN` must match the actual frontend
- `Turnstile` is optional: without keys, the hard block on the most aggressive patterns remains active