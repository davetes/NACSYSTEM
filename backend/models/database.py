import os
import json
import sqlite3
from typing import Optional

DB_FILENAME = 'devices.db'

def _db_path() -> str:
    # Database lives in backend/ next to app.py
    here = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(here, '..', DB_FILENAME))

def get_db_connection() -> sqlite3.Connection:
    """Create a SQLite connection with row factory for dict-like access."""
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Create tables if they do not exist."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Devices table: store MAC in hyphen-upper canonical form, authorized as INTEGER 0/1
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS devices (
                mac TEXT PRIMARY KEY,
                username TEXT,
                authorized INTEGER,
                vlan INTEGER
            )
            """
        )
        # VLAN profiles table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS vlan_profiles (
                username TEXT PRIMARY KEY,
                vlan INTEGER
            )
            """
        )
        # Users table for authentication
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT
            )
            """
        )
        # Runtime migration: ensure email column exists and is uniquely indexed
        cur.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cur.fetchall()]
        if 'email' not in columns:
            # Add email column; uniqueness will be enforced via an index below
            cur.execute("ALTER TABLE users ADD COLUMN email TEXT")
        # Create a unique index on email to prevent duplicates (allows NULLs for legacy rows)
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)"
        )
        # Policies table; criteria stored as JSON string
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS policies (
                name TEXT PRIMARY KEY,
                vlan INTEGER NOT NULL,
                criteria TEXT
            )
            """
        )
        # Password reset tokens table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON reset_tokens(user_id)"
        )
        conn.commit()
    finally:
        conn.close()

def _seed_devices(cur: sqlite3.Cursor) -> None:
    data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/devices.json'))
    if not os.path.exists(data_path):
        return
    with open(data_path, 'r') as f:
        items = json.load(f) or []
    for dev in items:
        mac = dev.get('mac')
        username = dev.get('username') or dev.get('name')
        authorized = 1 if dev.get('authorized', True) else 0
        vlan = dev.get('vlan')
        if not mac:
            continue
        cur.execute(
            "INSERT OR IGNORE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
            (mac, username, authorized, vlan),
        )

def _seed_vlan_profiles(cur: sqlite3.Cursor) -> None:
    profiles_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/vlan_profiles.json'))
    if not os.path.exists(profiles_path):
        return
    with open(profiles_path, 'r') as f:
        profiles = json.load(f) or {}
    for username, vlan in profiles.items():
        cur.execute(
            "INSERT OR IGNORE INTO vlan_profiles (username, vlan) VALUES (?, ?)",
            (username, vlan),
        )

def seed_db() -> None:
    """Seed initial data if tables are empty."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Seed devices if empty
        cur.execute("SELECT COUNT(1) FROM devices")
        if (cur.fetchone()[0] or 0) == 0:
            _seed_devices(cur)
        # Seed vlan profiles if empty
        cur.execute("SELECT COUNT(1) FROM vlan_profiles")
        if (cur.fetchone()[0] or 0) == 0:
            _seed_vlan_profiles(cur)
        # Ensure at least a default admin user exists
        # Safe existence check
        cur.execute("SELECT 1 FROM users WHERE username = ?", ("admin",))
        has_admin = cur.fetchone() is not None
        if not has_admin:
            # Password hash to be created by app layer if needed. Here insert a disabled placeholder.
            cur.execute(
                "INSERT OR IGNORE INTO users (username, password_hash, created_at) VALUES (?, ?, datetime('now'))",
                ("admin", "",),
            )
        conn.commit()
    finally:
        conn.close()