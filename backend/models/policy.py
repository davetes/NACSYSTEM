from typing import Optional, Dict
import json
import sqlite3
from models.database import get_db_connection


def _row_to_policy(row: sqlite3.Row) -> Dict:
     criteria = row["criteria"]
     try:
         criteria_obj = json.loads(criteria) if criteria else {}
     except Exception:
         criteria_obj = {}
     return {"name": row["name"], "vlan": row["vlan"], "criteria": criteria_obj}


def upsert_policy(name: str, vlan: int, criteria: Optional[Dict] = None) -> Dict:
     criteria = criteria or {}
     conn = get_db_connection()
     try:

        
         cur = conn.cursor()
         cur.execute(
             "INSERT INTO policies (name, vlan, criteria) VALUES (?, ?, ?)\n"
             "ON CONFLICT(name) DO UPDATE SET vlan=excluded.vlan, criteria=excluded.criteria",
             (name, vlan, json.dumps(criteria)),
         )
         conn.commit()
         return {"name": name, "vlan": vlan, "criteria": criteria}
     finally:
         conn.close()


def delete_policy(name: str) -> int:
     conn = get_db_connection()
     try:
         cur = conn.cursor()
         cur.execute("DELETE FROM policies WHERE name = ?", (name,))
         conn.commit()
         return cur.rowcount
     finally:
         conn.close()


def list_policies() -> list:
     conn = get_db_connection()
     try:
         cur = conn.cursor()
         cur.execute("SELECT name, vlan, criteria FROM policies")
         rows = cur.fetchall()
         return [_row_to_policy(r) for r in rows]
     finally:
         conn.close()


def find_vlan_for_device(username: Optional[str], mac_hyphen_upper: str) -> Optional[int]:
     conn = get_db_connection()
     try:
         cur = conn.cursor()
         # Username match
         if username:
             cur.execute("SELECT vlan, criteria FROM policies")
             for r in cur.fetchall():
                 try:
                     crit = json.loads(r["criteria"]) if r["criteria"] else {}
                 except Exception:
                     crit = {}
                 if crit.get("username") == username:
                     return r["vlan"]
         # MAC prefix match
         prefix = mac_hyphen_upper[:8]
         cur.execute("SELECT vlan, criteria FROM policies")
         for r in cur.fetchall():
             try:
                 crit = json.loads(r["criteria"]) if r["criteria"] else {}
             except Exception:
                 crit = {}
             if crit.get("mac_prefix") == prefix:
                 return r["vlan"]
         # Default policy
         cur.execute("SELECT vlan FROM policies WHERE name = ?", ("default",))
         row = cur.fetchone()
         return row["vlan"] if row else None
     finally:
         conn.close()


