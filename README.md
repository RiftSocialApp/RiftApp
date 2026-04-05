# RiftApp

<div align="center">

**Fast. Clean. Yours.**

*Real-time communication, built for clarity and control.*

</div>

---

## ⟨ What is RiftApp? ⟩

**RiftApp** is a communication home for teams and communities: **chat**, **voice**, **DMs**, and **shared spaces** in one calm, fast experience. Host it yourself so **your conversations and files stay on your terms**—not someone else’s product roadmap.

We believe great software should feel **light**, **responsive**, and **yours**. RiftApp is built for people who want the energy of a modern community app without the noise, lock-in, or clutter.

---

## ⟨ Why teams choose it ⟩

- **Speed that keeps up** — Typing, sending, and switching contexts stay snappy so the room never feels sluggish.
- **Spaces that make sense** — Organize people around **hubs**, **streams**, and **voice** without drowning in nested menus.
- **Privacy by placement** — Run it on infrastructure you control; you decide who has access and where data lives.
- **Room to grow** — From a tight friend group to a growing community, invites, friends, and moderation tools scale with you.

Whether you’re coordinating a **creative crew**, a **gaming circle**, or an **internal squad**, RiftApp is meant to feel like **your** place on the internet.

---

## ⟨ Everything in one place ⟩

**Your community, structured** — Create hubs for each group; split topics into streams; hop into voice when text isn’t enough.

**Talk the way you want** — Public streams, side threads, and private DMs side by side—so nothing important gets lost in the shuffle.

**Show up fully** — Profiles, avatars, and shared media help people recognize each other and celebrate the group’s personality.

**Stay in control** — Invites you can share or limit, friend connections you manage, and ranks so trusted members can help keep things healthy.

**Hear each other clearly** — Drop into voice streams when you need nuance, speed, or just human tone.

---

## ⟨ Words we use ⟩

We use clear names so the app feels intentional, not borrowed:

| You might say… | In RiftApp |
|----------------|------------|
| Server | **Hub** |
| Channel | **Stream** |
| Voice channel | **Voice stream** |
| Roles | **Ranks** |

---

## ⟨ Under the hood ⟩

RiftApp is **self-hostable** and **ready to extend** if your team ships software. For diagrams, data model, and implementation detail, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## ⟨ Try it locally ⟩

### What you’ll need

Go, Node.js, and Docker are enough to run a full local stack—see `backend/go.mod` and your environment for exact versions.

### First-time setup

```bash
cp backend/.env.example backend/.env
```

Adjust `backend/.env` for secrets, URLs, and storage before you bring services up.

### Full stack (Compose)

```bash
docker compose -f backend/compose.yml --env-file backend/.env up --build
```

### Day-to-day development

Infra in the background:

```bash
docker compose -f backend/compose.yml --env-file backend/.env up postgres redis minio -d
```

API:

```bash
cd backend
go mod tidy
go run ./cmd/riftapp
```

App shell:

```bash
cd frontend
npm install
npm run dev
```

The dev UI is typically at **http://localhost:5173** with the API proxied from the frontend config.

---

## ⟨ Project layout ⟩

**`backend/`** — API, auth, real-time messaging, migrations, and `compose.yml` for local dependencies.  
**`frontend/`** — Web client.  
**`ARCHITECTURE.md`** — Technical deep dive for builders.

---

## ⟨ License ⟩

Private — all rights reserved.
