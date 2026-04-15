# MindSpace

Your friend who always picks up.

An AI mental health companion — warm, private, and always available. Not a therapist; a space to talk.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | FastAPI (Python) |
| AI | OpenAI (gpt-4o, gpt-4o-transcribe, TTS-1) |
| Memory | LangGraph + SQLite |

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- An OpenAI API key

### Frontend

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`.

### Backend

```bash
cd server
pip install -r requirements.txt
cp .env.example .env   # then add your OPENAI_API_KEY
uvicorn main:app --reload --port 3001
```

---

## Features

- **Multilingual** — English, Bengali (বাংলা), and Hindi (हिंदी)
- **Voice input** — speech-to-text via gpt-4o-transcribe with native Bengali and Hindi support
- **Read aloud** — text-to-speech via OpenAI TTS-1
- **Conversation memory** — insights extracted and stored across sessions
- **Anonymous-first** — no account needed to start talking
- **Rate limited** — 5 free messages per day for anonymous users

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Powers chat, transcription, and TTS |
