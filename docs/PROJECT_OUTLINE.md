# MindSpace — Project Outline

## What It Is

MindSpace is a warm, always-available AI mental health companion. The tagline: **"Your friend who always picks up."**

It is **not** a therapist, not a diagnosis tool, not a crisis service. It is a non-judgmental, emotionally fluent AI companion that fills the space around therapy — the 3AM spirals, the Sunday anxieties, the things you can't say out loud to anyone.

---

## Core Value Props

| Pillar | Description |
|---|---|
| Always available | No appointments, no wait time, 24/7 |
| Zero judgment | Say what you can't say to friends or family |
| Truly private | No data stored, no model training, no accounts required to start |
| Emotionally fluent | Reads between the lines, reflects back, never diagnoses |
| Memory | Optional account enables memory of patterns, names, worries |
| Bridge to real help | Surfaces professional resources when needed |

---

## Stack

| Layer | Tech |
|---|---|
| Landing page | Vanilla HTML/CSS/JS (`index.html`, `style.css`) — static prototype |
| Chat prototype | Vanilla HTML/CSS/JS (`chat.html`) — static prototype |
| Frontend (React app) | React 18 + TypeScript + Vite (`client/`) |
| Routing | React Router v6 (`/` → LandingPage, `/chat` → ChatPage, `/chat/:sessionId`) |
| Styling | Custom CSS (no Tailwind/MUI) — design tokens in `index.css` |
| Backend | FastAPI + uvicorn (`server/`) on port 3001 |
| AI/LLM | OpenAI `gpt-4o-mini` via LangChain + LangGraph |

---

## Current State (as of April 2026)

### Done
- [x] Landing page (React component `LandingPage.tsx`) — full sections: Hero, Features, Clarity, How It Works, Stories, FAQ, CTA, Footer
- [x] Static chat prototype (`chat.html`) for design reference
- [x] React app scaffolded with routing (Vite + React Router)
- [x] Design system established: color tokens (`--cream`, `--g4`), typography (Lora + DM Sans + Caveat), component patterns

### Done (continued)
- [x] `ChatPage.tsx` — full React migration of `chat.html`; sidebar, message grouping, suggestions, search, export
- [x] Backend API — FastAPI (`server/main.py`), `POST /api/chat`, `GET /api/health`, `GET /api/usage/:id`
- [x] LLM integration — OpenAI `gpt-4o-mini` via LangChain `ChatOpenAI`, routed through LangGraph
- [x] Short-term memory — LangGraph `MemorySaver` checkpointer; each conversation keyed by `thread_id`
- [x] Long-term memory — SQLite (`mindspace_memory.db`); insights extracted per turn via background task, injected into system prompt
- [x] Crisis detection + resource surfacing — keyword-based classifier routes to crisis-aware system prompt with 988 Lifeline
- [x] Rate limiting — 5 messages/day for guest users, dual-keyed by `user_id` + hashed IP, resets at 00:00 UTC; loopback IPs exempt
- [x] Conversation persistence — full message history stored in SQLite per `thread_id`; past conversations reopenable from sidebar
- [x] Auto-generated conversation titles — LLM generates a short evocative title from the opening exchange; sidebar groups by Today / Yesterday / This week / Older

### Not Started
- [ ] Auth / user accounts (for persistent identity beyond localStorage)
- [ ] Subscription / pricing flow

---

## Key Design Decisions

- **No Tailwind**: Custom CSS only. Design tokens in `index.css`. Respect this — do not add Tailwind/utility classes.
- **Emotional tone first**: Every copy and UI decision should feel warm, intimate, late-night. Not clinical, not corporate.
- **Privacy by default**: Anonymous-first, account optional. Never imply data is being stored unless user explicitly enables memory.
- **Free tier is real**: Free tier is not a teaser — genuinely useful conversations without account.

---

## Personas / Target User

- Person having 3AM anxiety spiral with no one to call
- Someone who sees a therapist weekly but needs mid-week processing
- Someone who has never talked to a therapist and needs a low-barrier first step
- Person who has things they can't say to friends/family
