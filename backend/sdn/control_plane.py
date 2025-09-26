from typing import Dict, Optional
import sqlite3
from models.database import get_db_connection
from utils.logging import log
from sdn.factory import get_southbound_driver
from nac_controller import normalize_mac_colon_lower
from models.policy import find_vlan_for_device


class SDNControlPlane:
    """High-level NAC/SDN control logic: validate, derive policy, program data plane."""

    def _get_device_by_mac(self, mac_hyphen_upper: str) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT mac, username, authorized, vlan FROM devices WHERE mac = ?", (mac_hyphen_upper,))
            row = cur.fetchone()
            if not row:
                return None
            return {
                "mac": row["mac"],
                "username": row["username"],
                "authorized": bool(row["authorized"]),
                "vlan": row["vlan"],
            }
        finally:
            conn.close()

    def _get_vlan_for_user(self, username: str) -> Optional[int]:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT vlan FROM vlan_profiles WHERE username = ?", (username,))
            row = cur.fetchone()
            return row["vlan"] if row else None
        finally:
            conn.close()

    def __init__(self) -> None:
        self.driver = get_southbound_driver()

    def validate_and_program(self, mac: str) -> Dict:
        mac_colon_lower = normalize_mac_colon_lower(mac)
        mac_hyphen_upper = mac_colon_lower.upper().replace(":", "-")

        device = self._get_device_by_mac(mac_hyphen_upper)
        if not device:
            self.driver.block_mac(mac_colon_lower)
            log(f"control_plane: not_found mac={mac_colon_lower} -> blocked")
            return {
                "mac": mac_hyphen_upper,
                "username": None,
                "authorized": False,
                "vlan": None,
            }

        username = device.get('username')
        # Policy-derived VLAN takes precedence; fall back to user->vlan mapping
        vlan = find_vlan_for_device(username, mac_hyphen_upper)
        if vlan is None and username:
            vlan = self._get_vlan_for_user(username)
        authorized = vlan is not None

        if authorized:
            self.driver.allow_mac_on_vlan(mac_colon_lower, vlan)
            log(f"control_plane: allowed mac={mac_colon_lower} vlan={vlan}")
        else:
            self.driver.block_mac(mac_colon_lower)
            log(f"control_plane: no_vlan mac={mac_colon_lower} -> blocked")

        return {
            "mac": mac_hyphen_upper,
            "username": username,
            "authorized": authorized,
            "vlan": vlan,
        }

control = SDNControlPlane()


