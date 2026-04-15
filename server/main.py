"""
MindSpace FastAPI server.

Endpoints:
  POST /api/chat       - send a message, get an AI reply
  POST /api/transcribe - speech-to-text (gpt-4o-transcribe)
  POST /api/tts        - text-to-speech (OpenAI TTS-1)
  GET  /api/health     - health check

Run:
  uvicorn main:app --reload --port 3001
"""

import io
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Force UTF-8 stdout/stderr on Windows so Unicode in logs doesn't crash the process
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel

# Resolve .env relative to this file so it works regardless of CWD
load_dotenv(Path(__file__).parent / ".env")

from conversation_store import (  # noqa: E402
    get_conversation_messages,
    get_conversation_title,
    get_conversations,
    init_conversation_table,
    upsert_conversation,
)
from graph import graph  # noqa: E402 - must come after load_dotenv so OPENAI_API_KEY is set
from langchain_core.messages import AIMessage  # noqa: E402
from memory_store import save_insight  # noqa: E402
from rate_limit import (  # noqa: E402
    DAILY_LIMIT,
    check_and_increment,
    get_remaining,
    init_rate_limit_table,
    next_utc_midnight,
)


# -- Helpers -------------------------------------------------------------------

def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# -- Schemas -------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    user_id: str = "anonymous"


class ChatResponse(BaseModel):
    reply: str
    is_crisis: bool = False
    remaining_trials: int | None = None


class InsightList(BaseModel):
    insights: list[str]


class TTSRequest(BaseModel):
    text: str


# -- Insight extractor (lazy) --------------------------------------------------

_extractor: ChatOpenAI | None = None

EXTRACTION_PROMPT = """You are a memory assistant for a mental health companion app.

Given a conversation snippet, extract 0-3 concise, factual insights about the person.

Rules:
- Only extract things clearly stated or strongly implied - do not infer or speculate.
- Each insight must be a single sentence, written in third person (e.g. "User struggles with sleep").
- Focus on: emotions, recurring themes, life circumstances, challenges, goals, relationships.
- Skip pleasantries, greetings, or generic small talk.
- Return an empty list if nothing meaningful is present.

Return a JSON object with an "insights" key containing a list of strings."""


def _get_extractor() -> ChatOpenAI:
    global _extractor
    if _extractor is None:
        _extractor = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
    return _extractor


TITLE_PROMPT = """You are a conversation titler for a mental health companion app.

Given the opening exchange of a conversation, write a short title (3-5 words) that captures the emotional theme.

Rules:
- No quotes, no punctuation at the end
- Sentence case (only first word capitalised)
- Evocative, not clinical - write how the user would describe it to a friend
- Examples: Sunday night dread, Can't stop the spiral, That fight with mum, Feeling lost at work

Reply with the title only - nothing else."""


async def _generate_title(user_msg: str, ai_reply: str) -> str:
    try:
        result = await _get_extractor().ainvoke([
            {"role": "system", "content": TITLE_PROMPT},
            {"role": "user", "content": f"User: {user_msg[:300]}\nAI: {ai_reply[:300]}"},
        ])
        return result.content.strip().strip('"\'').strip()[:60]
    except Exception:
        return user_msg[:40].strip() + ("…" if len(user_msg) > 40 else "")


async def _update_conversation(
    thread_id: str,
    user_id: str,
    user_msg: str,
    ai_reply: str,
    all_messages: list[dict],
) -> None:
    try:
        existing_title = get_conversation_title(thread_id)
        if existing_title is None:
            title = await _generate_title(user_msg, ai_reply)
        else:
            title = existing_title

        preview = user_msg[:60] + ("…" if len(user_msg) > 60 else "")
        upsert_conversation(thread_id, user_id, title, preview, all_messages)
    except Exception as exc:
        print(f"[conv] error: {exc}")


async def _extract_and_save(user_id: str, user_msg: str, ai_reply: str) -> None:
    try:
        prompt = (
            f"User said: {user_msg}\n"
            f"AI replied: {ai_reply}\n\n"
            "Extract insights about the user."
        )
        extractor = _get_extractor().with_structured_output(InsightList)
        result: InsightList = await extractor.ainvoke([
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": prompt},
        ])
        for insight in result.insights:
            if insight.strip():
                save_insight(user_id, insight.strip())
    except Exception as exc:
        print(f"[memory] error: {exc}")


# -- App -----------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_rate_limit_table()
    init_conversation_table()
    if not os.getenv("OPENAI_API_KEY"):
        print("\n[WARNING] OPENAI_API_KEY is not set. Create server/.env with your key.\n")
    yield


app = FastAPI(title="MindSpace API", lifespan=lifespan)

def _allowed_origins() -> list[str]:
    origins = ["http://localhost:5173"]
    # FRONTEND_URL is set in Render's environment variables to the Vercel deployment URL
    if url := os.getenv("FRONTEND_URL"):
        origins.append(url.rstrip("/"))
    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi.responses import JSONResponse
    safe = str(exc).encode("ascii", errors="replace").decode("ascii")
    print(f"[error] {type(exc).__name__}: {safe[:120]}")
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {safe}"})


# -- OpenAI client (lazy) ------------------------------------------------------

_oai_client: AsyncOpenAI | None = None


def _get_oai_client() -> AsyncOpenAI:
    global _oai_client
    if _oai_client is None:
        _oai_client = AsyncOpenAI()
    return _oai_client


# -- Routes --------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "MindSpace server is running"}


@app.get("/api/conversations/{user_id}")
async def list_conversations(user_id: str):
    return get_conversations(user_id)


@app.get("/api/conversations/{user_id}/{thread_id}")
async def load_conversation(user_id: str, thread_id: str):
    messages = get_conversation_messages(thread_id, user_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"messages": messages}


@app.get("/api/usage/{user_id}")
async def usage(user_id: str, request: Request):
    ip = _client_ip(request)
    remaining = get_remaining(user_id, ip)
    return {
        "remaining": remaining,
        "limit": DAILY_LIMIT,
        "resets_at": next_utc_midnight(),
    }


@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...), lang: str = Form(None)):
    """
    Speech-to-text via gpt-4o-transcribe.
    Accepts an audio file and an optional ISO 639-1 language code ("en", "bn", "hi").
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not set.")

    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty audio file.")

    filename = audio.filename or "recording.webm"
    audio_bytes = io.BytesIO(content)
    audio_bytes.name = filename

    try:
        # gpt-4o-transcribe supports Bengali ("bn") natively unlike whisper-1.
        # Language-specific prompts prime the decoder for emotional/personal content.
        LANG_PROMPTS = {
            "bn": "বক্তা তাঁর অনুভূতি ও ব্যক্তিগত অভিজ্ঞতা শেয়ার করছেন।",
            "hi": "वक्ता अपनी भावनाएँ और निजी अनुभव साझा कर रहे हैं।",
            "en": "The speaker is sharing their feelings and personal experiences.",
        }
        prompt = LANG_PROMPTS.get(lang or "en", LANG_PROMPTS["en"])

        result = await _get_oai_client().audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=(filename, audio_bytes, audio.content_type or "audio/webm"),
            prompt=prompt,
            language=lang or None,
        )
        return {"transcript": result.text.strip(), "valid": True}
    except Exception as e:
        safe_msg = str(e).encode("ascii", errors="replace").decode("ascii")
        status = 502 if isinstance(e, OpenAIError) else 500
        raise HTTPException(status_code=status, detail=f"Transcription error: {safe_msg}")


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    """Text-to-speech via OpenAI TTS-1 (nova voice). Returns audio/mpeg."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not set.")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    try:
        from fastapi.responses import Response as FastAPIResponse
        result = await _get_oai_client().audio.speech.create(
            model="tts-1",
            voice="nova",
            input=text[:4096],
        )
        return FastAPIResponse(content=result.content, media_type="audio/mpeg")
    except Exception as e:
        safe_msg = str(e).encode("ascii", errors="replace").decode("ascii")
        status = 502 if isinstance(e, OpenAIError) else 500
        raise HTTPException(status_code=status, detail=f"TTS error: {safe_msg}")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request, background_tasks: BackgroundTasks):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not set. Add it to server/.env and restart the server.",
        )

    ip = _client_ip(request)
    allowed, remaining = check_and_increment(req.user_id, ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "DAILY_LIMIT_REACHED",
                "limit": DAILY_LIMIT,
                "resets_at": next_utc_midnight(),
            },
        )

    config = {
        "configurable": {
            "thread_id": req.thread_id,
            "user_id": req.user_id,
        }
    }

    try:
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=message)],
                "is_crisis": False,
                "long_term_context": "",
            },
            config=config,
        )
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {e}")

    ai_message = result["messages"][-1]
    reply = ai_message.content if hasattr(ai_message, "content") else str(ai_message)
    is_crisis = result.get("is_crisis", False)

    storable = [
        {"role": "user" if isinstance(m, HumanMessage) else "ai", "text": m.content}
        for m in result["messages"]
        if isinstance(m, (HumanMessage, AIMessage)) and m.content
    ]

    background_tasks.add_task(_extract_and_save, req.user_id, message, reply)
    background_tasks.add_task(
        _update_conversation, req.thread_id, req.user_id, message, reply, storable
    )

    return ChatResponse(reply=reply, is_crisis=is_crisis, remaining_trials=remaining)
