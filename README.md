RiftApp

Fast · Clean · Yours
Real-time communication, built for clarity and control.

Chat · Voice · DMs · Self-host or Cloud

What is RiftApp?

RiftApp is a modern communication platform that brings together chat, voice, DMs, and shared spaces into one fast, minimal experience.

Self-host it for full control
Or use Rift Cloud for a managed setup

Software should feel fast, stay out of your way, and belong to you.

Run Rift your way
Self-Hosted (Free)

Run Rift on your own infrastructure using Docker.

Full control over your data
No subscriptions
Simple deployment with Docker Compose
Ideal for homelabs, private teams, and custom setups

Your servers. Your rules.

Rift Cloud

Let us handle everything.

No setup required
Global infrastructure
Automatic updates and scaling
Access from anywhere instantly
Rift Pro

Upgrade your experience with Rift Pro (available on Rift Cloud).

Free (Cloud)
Standard chat and voice
Global entrance sound
Base streaming quality
Core features
Rift Pro
Higher video quality and FPS streaming
Per-hub entrance sounds (custom join sounds per community)
More customization options
Priority performance
Future premium features

Rift Pro enhances quality and customization — it doesn’t lock core features.

Why teams choose Rift
Blazing fast — no laggy UI or slow switching
Clean structure — hubs, streams, and voice that make sense
Flexible hosting — self-host or cloud
Privacy-first — your data stays where you choose
Built to scale — from small groups to large communities
Everything in one place

Structured communities
Create hubs, organize streams, and jump into voice instantly

Real conversations
Public chats, threads, and DMs side by side

Express yourself
Profiles, avatars, and shared media

Control & moderation
Invites, ranks, and permissions

Clear voice
Low-latency voice when text isn’t enough

Terminology
Common term	RiftApp
Server	Hub
Channel	Stream
Voice channel	Voice stream
Roles	Ranks
Under the hood
Self-hostable with Docker
Cloud-ready architecture
Extensible design
Technical details in ARCHITECTURE.md
Quick start (Self-hosted)
cp backend/.env.example backend/.env
docker compose -f backend/compose.yml --env-file backend/.env up --build

Once running, Rift will be available locally.

Project structure
Path	Description
backend/	API, auth, realtime systems, Docker
frontend/	Web client
app/	Desktop app (Electron)
ARCHITECTURE.md	Technical deep dive
Philosophy
No clutter
No lock-in
No bloat

Just fast, clean communication — on your terms.

License

Private. All rights reserved.
