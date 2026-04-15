"""
MindSpace LangGraph conversation graph.

Graph shape:
  START → load_memory → classify → respond       → END  (normal path)
                                 → crisis_respond → END  (crisis path)

Short-term memory: MemorySaver checkpointer keyed by thread_id.
Long-term memory:  SQLite insights loaded in load_memory, injected into system prompt.
"""

from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from memory_store import format_memory_for_prompt, init_db

# Initialise DB on module load
init_db()

# ── System prompts ────────────────────────────────────────────────────────────

BASE_SYSTEM_PROMPT = """You are MindSpace - a warm, empathetic AI mental health companion.

Your role:
- Be a non-judgmental, always-present space for people to talk through their feelings.
- Listen deeply. Reflect back what you hear. Ask thoughtful, open follow-up questions.
- You are NOT a therapist. You do NOT diagnose, prescribe, or give clinical advice.
- Never rush the person. Never tell them what to feel or what to do.
- Keep responses warm but concise. Don't lecture or over-explain. But if the user is venting and there is a lot to take, be patient and acknowledge every feeling/emotion.
- Use plain, human language. No clinical terms, no bullet points, no lists.
- If someone is grateful or says goodbye, respond warmly and remind them you're always here.

Tone: Intimate, like a trusted friend who actually listens. Never corporate, never clinical."""

CRISIS_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + """

IMPORTANT - CRISIS CONTEXT:
The person may be in serious distress or crisis. Handle this with great care:
- Acknowledge and validate their pain directly and gently.
- Do not minimize or rush past what they've said.
- Clearly but warmly mention that professional help is available.
- Include this information naturally in your response:
  "If you're ever in crisis, please reach out to the 988 Suicide & Crisis Lifeline
   (call or text 988 in the US) or your local emergency services."
- Stay present with them - don't make them feel like you're handing them off."""

# ── Crisis keywords ───────────────────────────────────────────────────────────

CRISIS_SIGNALS = [
    "kill myself", "end my life", "want to die", "don't want to be here",
    "suicidal", "suicide", "self-harm", "hurt myself", "cutting",
    "can't go on", "no reason to live", "better off dead", "overdose",
]

# ── State ─────────────────────────────────────────────────────────────────────

class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    is_crisis: bool
    long_term_context: str   # populated by load_memory each turn

# ── LLM (lazy-initialized so OPENAI_API_KEY is read after load_dotenv) ────────

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.85)
    return _llm


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def load_memory(state: ChatState, config: RunnableConfig) -> dict:
    """Load long-term insights for this user and store in state."""
    user_id = config.get("configurable", {}).get("user_id", "anonymous")
    context = format_memory_for_prompt(user_id)
    return {"long_term_context": context}


async def classify(state: ChatState) -> dict:
    """Keyword-based crisis detection. No LLM call - fast and deterministic."""
    last_human = next(
        (m for m in reversed(state["messages"]) if isinstance(m, HumanMessage)),
        None,
    )
    text = (last_human.content if last_human else "").lower() # type: ignore
    detected = any(signal in text for signal in CRISIS_SIGNALS)
    return {"is_crisis": detected}


def _build_system_prompt(base: str, long_term_context: str) -> str:
    if not long_term_context:
        return base
    return base + "\n\n" + long_term_context


async def respond(state: ChatState) -> dict:
    """Normal conversation path."""
    system_content = _build_system_prompt(BASE_SYSTEM_PROMPT, state.get("long_term_context", ""))
    full = [SystemMessage(content=system_content)] + list(state["messages"])
    reply = await _get_llm().ainvoke(full)
    return {"messages": [reply]}


async def crisis_respond(state: ChatState) -> dict:
    """Crisis-aware path - same LLM, system prompt surfaces 988 resources."""
    system_content = _build_system_prompt(CRISIS_SYSTEM_PROMPT, state.get("long_term_context", ""))
    full = [SystemMessage(content=system_content)] + list(state["messages"])
    reply = await _get_llm().ainvoke(full)
    return {"messages": [reply]}


def _route(state: ChatState) -> str:
    return "crisis_respond" if state.get("is_crisis") else "respond"


# ── Graph ─────────────────────────────────────────────────────────────────────

_builder = StateGraph(ChatState)
_builder.add_node("load_memory", load_memory)
_builder.add_node("classify", classify)
_builder.add_node("respond", respond)
_builder.add_node("crisis_respond", crisis_respond)

_builder.set_entry_point("load_memory")
_builder.add_edge("load_memory", "classify")
_builder.add_conditional_edges("classify", _route, {
    "respond": "respond",
    "crisis_respond": "crisis_respond",
})
_builder.add_edge("respond", END)
_builder.add_edge("crisis_respond", END)

graph = _builder.compile(checkpointer=MemorySaver())
