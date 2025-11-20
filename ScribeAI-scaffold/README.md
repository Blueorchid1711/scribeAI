
# ScribeAI — AI-Powered Audio Scribing & Meeting Transcription (Scaffold)

This repository is a scaffold for the **AttackCapital** assignment: build a real-time meeting scribing app using Next.js, Socket.io, Postgres (Prisma), and Google Gemini API.
The files included form a working skeleton to extend into a full prototype. It demonstrates authentication hooks, a recording UI that streams audio chunks, a Node Socket server for real-time transport, and placeholders for Gemini integration and Postgres storage.

## What's included
- `app/` Next.js App Router skeleton (TypeScript)
- `server/` Node-based Socket.io recording server
- `prisma/` schema and sample migration hints
- `lib/gemini.ts` — placeholder for Gemini streaming/transcription calls
- `README` contains architecture decision table, mermaid pipeline diagram, and a 200-word scalability note
- `docker/` minimal postgres docker-compose snippet
- `scripts/` helper scripts

## Quick start (developer)
1. Copy `.env.example` to `.env.local` and fill credentials (DATABASE_URL, GEMINI_API_KEY).
2. Start Postgres (e.g. `docker compose -f docker/docker-compose.yml up -d`).
3. Install deps: `npm install`
4. Run dev: `npm run dev` (this starts Next.js dev server; run `node server/index.js` in a separate terminal for Socket server or use the included combined script).
5. Open http://localhost:3000

## Architecture comparison (short)
| Approach | Latency | Reliability | Complexity | When to use |
|---|---:|---:|---:|---|
| WebRTC (peer-stream) | Very low | Good for P2P, needs signaling | High | Real-time multi-party, low-latency audio/video |
| MediaRecorder -> Socket.io chunks | Low-medium | High (server-controlled) | Medium | Centralized transcription, easier server processing |
| Full file upload after recording | High | Very high (resumable) | Low | Long recordings where immediate transcript not needed |

## Stream pipeline (Mermaid)
```mermaid
flowchart LR
  UI[Browser: Capture audio (mic / tab)] -->|chunks (~30s)| SocketServer[Socket.io Node server]
  SocketServer -->|forward stream| Gemini[Google Gemini streaming API]
  Gemini -->|partial transcripts| SocketServer -->|emit| UI
  UI -->|show partials| TranscriptStore[(Postgres via Prisma)]
  Stop -->|aggregate| Gemini[final summarize] --> TranscriptStore
```

## 200-word scalability note
The scaffold includes a short, 200-word section explaining strategies for long-session handling and concurrent sessions. See `docs/scalability.md` inside the zip for the full text.

## Deliverable
This archive is a scaffold—focus on wiring the Gemini API and adding production hardening (auth, TLS, quotas) to convert into a full prototype.

