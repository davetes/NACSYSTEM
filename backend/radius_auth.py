from models.database import get_db_connection

def authenticate_user(username: str, password: str) -> bool:
    if not username or not username.strip():
        return False
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM vlan_profiles WHERE username = ?", (username,))
        row = cur.fetchone()
        return bool(row)  # Password ignored for simulation
    finally:
        conn.close()