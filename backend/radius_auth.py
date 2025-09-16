from models.mongo import get_db_and_collections

def authenticate_user(username: str, password: str) -> bool:
    if not username.strip():
        return False
    _, _, vlan_profiles = get_db_and_collections()
    user = vlan_profiles.find_one({"username": username})
    return bool(user)  # Password ignored for simulation