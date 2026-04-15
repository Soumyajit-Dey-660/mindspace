# MindSpace

> Your friend who always picks up.

An AI mental health companion — warm, private, and always available. Not a therapist; a space to talk through whatever's on your mind.

---

## Overview

MindSpace is a full-stack web app built around a single idea: sometimes you just need someone (or something) to listen without judgement, without rushing you, and without making you feel like a burden. It's anonymous by default, works in English, Bengali, and Hindi, and keeps a gentle memory of what you've shared so it can be more present over time.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI (Python 3.11+) |
| AI — Chat | OpenAI `gpt-4o` via LangGraph |
| AI — Speech-to-text | OpenAI `gpt-4o-transcribe` |
| AI — Text-to-speech | OpenAI `tts-1` (nova) |
| Memory | LangGraph + SQLite |
| Rate limiting | SQLite (5 messages/day for anonymous users) |

---

## Project structure

```
mindspace/
├── client/          # React + TypeScript frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   └── ChatPage.tsx
│       └── index.css       # Design tokens and global styles
└── server/          # FastAPI backend
    ├── main.py             # API routes (chat, transcribe, tts)
    ├── graph.py            # LangGraph conversation graph
    ├── conversation_store.py
    ├── memory_store.py
    ├── rate_limit.py
    └── requirements.txt
```

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- An OpenAI API key

### 1. Clone

```bash
git clone https://github.com/Soumyajit-Dey-660/mindspace.git
cd mindspace
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`.

### 3. Backend

```bash
cd server
pip install -r requirements.txt
```

Create a `.env` file in `server/`:

```env
OPENAI_API_KEY=sk-...
```

Then start the server:

```bash
uvicorn main:app --reload --port 3001
```

---

## Features

- **Multilingual** — English, Bengali (বাংলা), and Hindi (हिंदी) across the entire UI, voice input, and conversation starters
- **Voice input** — speech-to-text via `gpt-4o-transcribe` with native Bengali and Hindi support
- **Read aloud** — text-to-speech via OpenAI TTS-1
- **Conversation memory** — key insights extracted per session and carried forward
- **Anonymous-first** — no account or sign-up needed to start talking
- **Rate limited** — 5 free messages per day for anonymous users, resets at UTC midnight
- **Crisis detection** — flags high-risk messages and surfaces emergency resources

---

## Design principles

- No Tailwind — custom CSS only, built around a dark forest green / warm cream palette
- Fonts: Lora (headings, AI voice), DM Sans (body), Caveat (handwritten accents)
- Tone: warm and intimate, never clinical or corporate
- Privacy by design: no server-side message logging for anonymous users

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Powers chat, transcription, and TTS |

## Try it out

https://mindspace-gray.vercel.app/
