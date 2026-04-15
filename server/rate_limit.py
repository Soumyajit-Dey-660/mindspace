"""
Daily usage rate-limiting - SQLite-backed, dual-keyed by user_id AND hashed IP.

A request is allowed only when BOTH the user_id counter and the IP counter are
under the daily limit. This means clearing localStorage (new user_id) or using
a new browser profile doesn't bypass the limit while the IP is exhausted, and
switching IPs doesn't help while the stored user_id is exhausted.

IPs are stored as a short SHA-256 prefix - never in plaintext.

Each sent message counts as one trial. Limit resets at 00:00 UTC.
"""

import hashlib
import ipaddress
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "mindspace_memory.db"

DAILY_LIMIT = 5


# ── Schema ────────────────────────────────────────────────────────────────────

def init_rate_limit_table() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        # New unified table - old `daily_usage` table left as-is (harmless)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                key   TEXT NOT NULL,   -- "user:<id>" or "ip:<hash>"
                date  TEXT NOT NULL,   -- UTC date: YYYY-MM-DD
                count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (key, date)
            )
        """)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def next_utc_midnight() -> str:
    """ISO-8601 timestamp of the next 00:00 UTC."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return tomorrow.isoformat()


def _hash_ip(ip: str) -> str:
    """One-way hash of an IP - never store the raw address."""
    return hashlib.sha256(ip.encode()).hexdigest()[:24]


def _ensure_row(conn: sqlite3.Connection, key: str, date: str) -> None:
    conn.execute("""
        INSERT INTO rate_limits (key, date, count)
        VALUES (?, ?, 0)
        ON CONFLICT (key, date) DO NOTHING
    """, (key, date))


def _get_count(conn: sqlite3.Connection, key: str, date: str) -> int:
    row = conn.execute(
        "SELECT count FROM rate_limits WHERE key = ? AND date = ?",
        (key, date),
    ).fetchone()
    return row[0] if row else 0


# ── Public API ────────────────────────────────────────────────────────────────

def _is_loopback(ip: str) -> bool:
    """True for any loopback address: 127.x.x.x, ::1, ::ffff:127.x.x.x, etc."""
    try:
        addr = ipaddress.ip_address(ip)
        # IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) - unwrap before checking
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return addr.ipv4_mapped.is_loopback
        return addr.is_loopback
    except ValueError:
        return False


def check_and_increment(user_id: str, ip: str) -> tuple[bool, int]:
    """
    Check both the user_id counter and the IP counter, then increment both
    if the request is allowed.

    Blocked if EITHER counter has reached DAILY_LIMIT.
    Requests from DEV_IPS are always allowed and never counted.

    Returns:
        (allowed, remaining) - remaining is the more restrictive of the two
        counters after this call. If not allowed, remaining is 0.
    """
    if _is_loopback(ip):
        return True, DAILY_LIMIT

    today    = _utc_today()
    user_key = f"user:{user_id}"
    ip_key   = f"ip:{_hash_ip(ip)}"

    with sqlite3.connect(DB_PATH) as conn:
        _ensure_row(conn, user_key, today)
        _ensure_row(conn, ip_key,   today)

        user_count = _get_count(conn, user_key, today)
        ip_count   = _get_count(conn, ip_key,   today)

        if user_count >= DAILY_LIMIT or ip_count >= DAILY_LIMIT:
            return False, 0

        conn.execute(
            "UPDATE rate_limits SET count = count + 1 WHERE key = ? AND date = ?",
            (user_key, today),
        )
        conn.execute(
            "UPDATE rate_limits SET count = count + 1 WHERE key = ? AND date = ?",
            (ip_key, today),
        )

        # Report the more restrictive remaining count
        remaining = min(
            DAILY_LIMIT - (user_count + 1),
            DAILY_LIMIT - (ip_count   + 1),
        )
        return True, remaining


def get_remaining(user_id: str, ip: str) -> int:
    """
    How many trials are left today - minimum across user_id and IP counters.
    Does not increment anything. Dev IPs always report full quota.
    """
    if _is_loopback(ip):
        return DAILY_LIMIT

    today    = _utc_today()
    user_key = f"user:{user_id}"
    ip_key   = f"ip:{_hash_ip(ip)}"

    with sqlite3.connect(DB_PATH) as conn:
        user_used = _get_count(conn, user_key, today)
        ip_used   = _get_count(conn, ip_key,   today)

    return max(0, DAILY_LIMIT - max(user_used, ip_used))
