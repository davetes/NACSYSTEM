from typing import Optional, Dict

from models.mongo import get_db_and_collections


def get_policies_collection():
    db, _, _ = get_db_and_collections()
    return db['policies']


def upsert_policy(name: str, vlan: int, criteria: Optional[Dict] = None) -> Dict:
    col = get_policies_collection()
    criteria = criteria or {}
    col.update_one({"name": name}, {"$set": {"name": name, "vlan": vlan, "criteria": criteria}}, upsert=True)
    return {"name": name, "vlan": vlan, "criteria": criteria}


def delete_policy(name: str) -> int:
    col = get_policies_collection()
    res = col.delete_one({"name": name})
    return res.deleted_count


def list_policies() -> list:
    col = get_policies_collection()
    return list(col.find({}, {"_id": 0}))


def find_vlan_for_device(username: Optional[str], mac_hyphen_upper: str) -> Optional[int]:
    col = get_policies_collection()
    # Simple policy precedence: username match > MAC prefix match > default policy
    if username:
        p = col.find_one({"criteria.username": username}, {"_id": 0, "vlan": 1})
        if p:
            return p.get('vlan')
    prefix = mac_hyphen_upper[:8]
    p = col.find_one({"criteria.mac_prefix": prefix}, {"_id": 0, "vlan": 1})
    if p:
        return p.get('vlan')
    p = col.find_one({"name": "default"}, {"_id": 0, "vlan": 1})
    if p:
        return p.get('vlan')
    return None


