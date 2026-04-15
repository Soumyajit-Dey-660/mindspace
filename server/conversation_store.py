"""
Conversation store - SQLite-backed.

Persists conversation metadata (title, preview) and full message history
so the sidebar can show real titles and old conversations can be reopened.
"""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "mindspace_memory.db"


# ── Schema ────────────────────────────────────────────────────────────────────

def init_conversation_table() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                thread_id  TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL,
                title      TEXT NOT NULL DEFAULT 'New conversation',
                preview    TEXT NOT NULL DEFAULT '',
                messages   TEXT NOT NULL DEFAULT '[]',   -- JSON array
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations (user_id)"
        )


# ── Write ─────────────────────────────────────────────────────────────────────

def upsert_conversation(
    thread_id: str,
    user_id: str,
    title: str,
    preview: str,
    messages: list[dict],
) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO conversations (thread_id, user_id, title, preview, messages, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (thread_id) DO UPDATE SET
                title      = excluded.title,
                preview    = excluded.preview,
                messages   = excluded.messages,
                updated_at = datetime('now')
        """, (thread_id, user_id, title, preview, json.dumps(messages)))


# ── Read ──────────────────────────────────────────────────────────────────────

def get_conversation_title(thread_id: str) -> str | None:
    """Returns the stored title, or None if the conversation doesn't exist yet."""
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT title FROM conversations WHERE thread_id = ?", (thread_id,)
        ).fetchone()
    return row[0] if row else None


def get_conversations(user_id: str, limit: int = 30) -> list[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("""
            SELECT thread_id, title, preview, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ?
        """, (user_id, limit)).fetchall()
    return [
        {"thread_id": r[0], "title": r[1], "preview": r[2], "updated_at": r[3]}
        for r in rows
    ]


def get_conversation_messages(thread_id: str, user_id: str) -> list[dict] | None:
    """Returns the stored messages array, or None if not found / wrong user."""
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT messages FROM conversations WHERE thread_id = ? AND user_id = ?",
            (thread_id, user_id),
        ).fetchone()
    if row is None:
        return None
    return json.loads(row[0])
