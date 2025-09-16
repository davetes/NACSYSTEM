import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
import re
import subprocess
from typing import Dict, Optional
from models.database import get_db_connection
from models.mongo import get_db_and_collections
from utils.logging import log
from sdn.southbound import driver as southbound_driver

def normalize_mac_colon_lower(mac_address: str) -> str:
    if mac_address is None:
        raise ValueError("MAC address is required")
    mac_clean = mac_address.strip().lower().replace("-", ":")
    pattern = r"^[0-9a-f]{2}(:[0-9a-f]{2}){5}$"
    if not re.match(pattern, mac_clean):
        raise ValueError("Invalid MAC address format")
    return mac_clean

def normalize_mac_hyphen_upper(mac_address: str) -> str:
    mac_clean = mac_address.strip().upper().replace(":", "-")
    pattern = r"^[0-9A-F]{2}(-[0-9A-F]{2}){5}$"
    if not re.match(pattern, mac_clean):
        raise ValueError("Invalid MAC address format")
    return mac_clean

def get_device_by_mac(mac: str) -> Optional[Dict]:
    mac_norm = normalize_mac_colon_lower(mac)
    _, devices_col, _ = get_db_and_collections()
    doc = devices_col.find_one({"mac": mac_norm.upper().replace(":", "-")}, {"_id": 0})
    return doc if doc else None

def validate_device(mac: str) -> Optional[str]:
    mac_norm = normalize_mac_colon_lower(mac)
    device = get_device_by_mac(mac_norm)
    if not device:
        log(f"validate_device: not_found mac={mac_norm}")
        return None
    username = device['username']
    log(f"validate_device: found mac={mac_norm} username={username}")
    return username

def get_vlan(username: str) -> Optional[int]:
    _, _, vlan_profiles = get_db_and_collections()
    row = vlan_profiles.find_one({"username": username}, {"_id": 0, "vlan": 1})
    vlan = row.get('vlan') if row else None
    log(f"get_vlan: user={username} vlan={vlan}")
    return vlan

def block_device(mac: str) -> bool:
    mac_norm = normalize_mac_colon_lower(mac)
    success = southbound_driver.block_mac(mac_norm)
    print(f"Alert: Unauthorized device {mac_norm} blocked!")
    return success

def validate_and_assign(mac: str) -> Dict:
    mac_norm = normalize_mac_colon_lower(mac)
    username = validate_device(mac_norm)
    vlan = get_vlan(username) if username else None
    authorized = username is not None and vlan is not None
    if not authorized:
        block_device(mac_norm)
    response = {
        "mac": mac_norm.upper().replace(":", "-"),
        "username": username,
        "authorized": authorized,
        "vlan": vlan,
    }
    log(f"validate_and_assign: mac={mac_norm} authorized={authorized}")
    return response