"""
Long-term memory store - SQLite-backed, keyed by user_id.

Each insight is a single concise sentence extracted from a conversation.
Insights are retrieved newest-first and injected into the system prompt
so MindSpace can personalise responses across sessions.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "mindspace_memory.db"


# ── Schema ────────────────────────────────────────────────────────────────────

def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS long_term_memory (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    TEXT    NOT NULL,
                insight    TEXT    NOT NULL,
                category   TEXT    NOT NULL DEFAULT 'general',
                created_at TEXT    NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ltm_user ON long_term_memory (user_id)"
        )


# ── Write ─────────────────────────────────────────────────────────────────────

def save_insight(user_id: str, insight: str, category: str = "general") -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO long_term_memory (user_id, insight, category) VALUES (?, ?, ?)",
            (user_id, insight.strip(), category),
        )


# ── Read ──────────────────────────────────────────────────────────────────────

def get_insights(user_id: str, limit: int = 15) -> list[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """SELECT insight, category, created_at
               FROM long_term_memory
               WHERE user_id = ?
               ORDER BY created_at DESC
               LIMIT ?""",
            (user_id, limit),
        ).fetchall()
    return [{"insight": r[0], "category": r[1], "created_at": r[2]} for r in rows]


def format_memory_for_prompt(user_id: str) -> str:
    """Return a block of text ready to be appended to the system prompt."""
    insights = get_insights(user_id)
    if not insights:
        return ""
    lines = "\n".join(f"- {i['insight']}" for i in insights)
    return (
        "MEMORY - What you already know about this person from past conversations "
        "(use naturally to personalise; never quote back verbatim):\n" + lines
    )


def get_insight_count(user_id: str) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        return conn.execute(
            "SELECT COUNT(*) FROM long_term_memory WHERE user_id = ?", (user_id,)
        ).fetchone()[0]
