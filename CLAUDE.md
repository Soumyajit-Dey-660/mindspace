# MindSpace — Claude Code Context

Auto-loaded every session. Keep this updated as the project evolves.

---

## Project Summary

**MindSpace** is an AI mental health companion app ("Your friend who always picks up").
Not a therapist — a warm, private, always-available space to talk.

Full outline → `docs/PROJECT_OUTLINE.md`
Architectural TODOs → `docs/ARCH_TODOS.md`

---

## Repo Layout

```
mindspace/
├── index.html          # Static landing page prototype (vanilla)
├── style.css           # Static landing page styles
├── chat.html           # Static chat UI prototype (vanilla) — reference for ChatPage.tsx
├── client/             # React + TypeScript + Vite app (the real frontend)
│   ├── src/
│   │   ├── App.tsx          # Router: / → LandingPage, /chat → ChatPage
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx   # Full landing page (complete)
│   │   │   └── ChatPage.tsx      # DOES NOT EXIST YET — priority build
│   │   ├── components/
│   │   │   ├── chat/             # Chat-specific components (empty — to be built)
│   │   │   └── LandingPage.tsx   # (appears to be duplicate — verify)
│   │   └── index.css        # Design system: CSS variables, global styles
│   └── package.json
└── docs/
    ├── PROJECT_OUTLINE.md  # Product vision, stack, current state
    └── ARCH_TODOS.md       # Ordered technical todos + open decisions
```

---

## Design System Rules

- **No Tailwind, no utility-class frameworks** — custom CSS only
- **CSS tokens**: `--cream`, `--g4`, `--g3`, `--g2` etc. defined in `client/src/index.css`
- **Fonts**: Lora (serif, headings/AI voice), DM Sans (body), Caveat (handwritten accents)
- **Palette**: Dark forest green backgrounds, warm cream text — intimate, late-night feel
- **Tone**: Warm, empathetic, intimate. Never clinical, never corporate.

---

## Coding Conventions

- React functional components with TypeScript
- No class components
- CSS Modules or plain CSS — match existing file patterns
- Keep components small and focused
- `chat.html` is the design reference for `ChatPage.tsx` — port its design, not its structure

---

## What's Built vs What's Not

| Feature | Status |
|---|---|
| Landing page (React) | Done — `LandingPage.tsx` |
| Static prototypes | Done — `index.html`, `chat.html` |
| ChatPage.tsx | NOT BUILT — highest priority |
| Chat components | NOT BUILT |
| Backend API | NOT STARTED |
| LLM integration | NOT STARTED |
| Auth / memory | NOT STARTED |

---

## Key Decisions Already Made

- Anonymous-first: no account needed to start a conversation
- Privacy by design: no server-side message logging (for anonymous users)
- Open AI is the likely LLM choice
- Free tier is genuinely useful, not a teaser
- Streaming AI responses required (latency = emotional presence)

---

## Things to Always Remember

- Check `docs/ARCH_TODOS.md` before starting any new feature — the decision may already be documented
- The `chat.html` file is the visual/UX reference for the chat UI — read it before building `ChatPage.tsx`
- Do not add Tailwind or any CSS framework
- Privacy and emotional tone are non-negotiable product values
