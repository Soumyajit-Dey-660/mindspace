# MindSpace — Architectural TODOs

Ordered roughly by dependency. Update this as decisions are made and tasks completed.

---

## Tier 1 — Frontend (React App, no backend needed)

### [DONE] Build `ChatPage.tsx`
- **Path**: `client/src/pages/ChatPage.tsx`
- **Route**: `/chat` and `/chat/:sessionId`
- **Reference**: `chat.html` in project root (vanilla HTML prototype to port)
- **Requirements**:
  - Message list with AI + user bubbles
  - Typing indicator (animated dots)
  - Input bar with send button (Enter key support)
  - Session ID in URL for bookmarking (generate UUID client-side for now)
  - Match design system from `index.css` (tokens, fonts, dark green palette)
  - Placeholder/mock AI response until backend exists

### [TODO] Extract chat sub-components
- `MessageBubble.tsx` — currently inlined as `MessageRow` in ChatPage.tsx
- `TypingIndicator.tsx` — currently inlined
- When ChatPage grows, extract to `components/chat/`

### [TODO] Shared layout / nav component
- Currently `Nav` is inlined in `LandingPage.tsx`
- Consider whether ChatPage needs its own minimal header or the full nav

---

## Tier 2 — Backend API

### [DONE] Backend: Node.js/Express (`server/`)
- Running on port 3001
- Vite dev server proxies `/api` → `http://localhost:3001`
- `node --watch` for hot reload during dev

### [DONE] Basic chat endpoint
```
POST /api/chat
Body: { sessionId: string, message: string, history: Message[] }
Response: { reply: string }
```

### [TODO] Session management
- Stateless for anonymous users (history passed client-side)
- Stateful (DB-backed) for logged-in users

---

## Tier 3 — LLM Integration

### [DECISION NEEDED] LLM provider
- Claude API (Anthropic) — most likely given project tooling
- Model: `claude-sonnet-4-6` for conversation, potentially `claude-haiku-4-5` for cost at scale

### [TODO] System prompt design
- Establish MindSpace persona: warm, empathetic, non-clinical
- Include crisis escalation instruction (always surface 988/crisis lines when at-risk signals detected)
- Include "not a therapist" framing
- Memory injection pattern when user account exists

### [TODO] Streaming responses
- Use SSE or WebSocket to stream AI reply tokens for real-time feel

### [TODO] Crisis detection
- Either in-system-prompt or a secondary fast classifier
- Trigger: surface crisis resources inline, do not abruptly switch tone

---

## Tier 4 — Auth & Memory

### [TODO] Auth system
- Anonymous-first: no auth required to chat
- Optional account: email/password or OAuth (Google)
- JWT tokens

### [TODO] Memory storage
- Per-user memory: names of people in their life, recurring worries, patterns
- Stored as structured JSON, injected into system prompt on each conversation
- User can view + delete memory at any time (GDPR/trust requirement)

### [TODO] Conversation history
- Anonymous: stored in `localStorage` / `sessionStorage` only
- Logged in: stored in DB, accessible across devices

---

## Tier 5 — Monetization & Growth

### [TODO] Pricing page
- Free: N messages/day, no memory, no history
- Subscription: unlimited, memory, history, priority response

### [TODO] Onboarding flow
- Short 3-question onboarding before first chat (optional, improves personalization)
- "What brings you here today?" → sets initial context

### [TODO] Mobile app
- React Native or PWA wrapping the web app

---

## Architecture Principles

1. **Privacy is non-negotiable** — no logging of message content server-side without explicit user consent
2. **Latency matters emotionally** — a slow response breaks the feeling of presence; streaming is required
3. **Graceful degradation** — if LLM is down, surface a kind error, never a cold 500
4. **Design before engineering** — get the feel right in the UI before wiring up the backend

---

## Open Questions

| Question | Status |
|---|---|
| Backend language? | Undecided |
| DB choice (Postgres / SQLite / Supabase)? | Undecided |
| Hosting (Vercel + Railway / Fly.io / etc.)? | Undecided |
| Do we port `index.html` to React or keep it as static? | Keep as static for now, React version is in `client/` |
| LLM provider confirmed? | Likely Claude API — unconfirmed |
