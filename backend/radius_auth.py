from models.database import get_db_connection

def authenticate_user(username: str, password: str) -> bool:
    if not username.strip():
        return False
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM vlan_profiles WHERE username = ?', (username,)).fetchone()
    conn.close()
    return bool(user)  # Password ignored for simulation