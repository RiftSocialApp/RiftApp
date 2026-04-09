# RiftApp

RiftApp is a real-time chat, voice, and DM platform with web and desktop clients.

This repository contains the product code. It does not contain every production dependency in one place, and that is intentional.

## Repo At A Glance

- `backend/` - Go API, WebSocket server, auth, messaging, permissions, uploads
- `frontend/` - React + Vite web client
- `app/` - Electron desktop client
- `.github/workflows/` - CI and release workflows
- `ARCHITECTURE.md` - deeper system design notes

## Production Topology

The most useful mental model for contributors is this:

```text
Web client / Desktop client
            |
            v
    Rift backend (Docker)
      |       |       |
      |       |       +--> LiveKit on a separate VPS
      |       |
      |       +----------> Redis Cloud
      |
      +------------------> Neon Postgres
      +------------------> Cloudflare R2 or another S3-compatible store
```

Important implications:

- `backend/compose.yml` is an example deployment file, not a full copy of production
- LiveKit can be hosted completely separately from the backend
- Postgres and Redis can be managed services
- this repo is best understood as `clients + backend`, with infra dependencies connected from outside

## Repository Map

### `backend/`

- `cmd/riftapp/` - main entrypoint
- `internal/api/` - HTTP and WebSocket handlers
- `internal/service/` - business logic
- `internal/repository/` - data access layer
- `internal/database/migrations/` - schema migrations
- `internal/models/` - models and permission constants
- `Dockerfile` - backend container image
- `compose.yml` - example Docker Compose setup
- `.env.example` - backend environment template

### `frontend/`

- `src/` - React application code
- `components/` - major UI surfaces
- `stores/` - client state and syncing logic
- `api/` - HTTP client
- `functions/` - optional edge proxy functions, including `/api` proxy support for deployments such as Cloudflare Pages

### `app/`

- `src/main.ts` - Electron main process
- `src/preload.ts` - Electron preload bridge
- `scripts/` - packaging and Windows metadata helpers

## Local Development

### Prerequisites

- Go `1.25`
- Node.js `20+`
- npm
- credentials for Postgres, Redis, object storage, and LiveKit

### Backend

1. Copy the env template:

```bash
cp backend/.env.example backend/.env
```

2. Fill in at least these values in `backend/.env`:

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

3. Run the backend directly:

```bash
cd backend
go run ./cmd/riftapp
```

4. Or run the backend service from the example Compose file:

```bash
cd backend
docker compose up -d backend
```

If you already run LiveKit elsewhere, keep `LIVEKIT_URL` pointed at that external host and do not treat the bundled `livekit` service in `backend/compose.yml` as required.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend API client uses `VITE_API_URL` and defaults to `/api`. If you deploy the web app behind a proxy or Pages Function, see `frontend/functions/api/[[path]].js`.

### Desktop App

```bash
cd app
npm install
npm run dev
```

The desktop app wraps the frontend and adds native desktop behavior such as the updater and screen-capture integration.

## Useful Commands

Backend tests:

```bash
cd backend
go test ./...
```

Frontend tests:

```bash
cd frontend
npm test -- --run
```

Frontend production build:

```bash
cd frontend
npm run build
```

Desktop package smoke test:

```bash
cd app
npm run pack
```

## Suggested Reading Order

If you are new to the codebase, this is the fastest route:

1. Read this README for the repo map and deployment model.
2. Read `ARCHITECTURE.md` for the system design.
3. Read `backend/internal/api/` and `backend/internal/service/` for backend request flow.
4. Read `frontend/src/App.tsx`, `frontend/src/components/`, and `frontend/src/stores/` for client flow.
5. Read `app/src/main.ts` only for desktop-specific behavior.

## Naming Map

Rift uses a few app-specific names:

- Server -> Hub
- Channel -> Stream
- Voice Channel -> Voice Stream
- Role -> Rank

## Keeping The Repo Easy To Understand

The cleanest rule is to separate product code from environment-specific deployment details:

- keep application code in `backend/`, `frontend/`, and `app/`
- keep the root README focused on orientation, startup, and the current deployment mental model
- keep `ARCHITECTURE.md` as the deeper technical reference
- clearly label deployment files as examples when they do not match production exactly

If you want to make the repo even easier for outsiders later, the next good step is adding a `docs/` folder for deployment guides and moving environment-specific examples there.

## License

Private. All rights reserved.
