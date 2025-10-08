from typing import Dict, Optional
import sqlite3
from models.database import get_db_connection
from utils.logging import log
from sdn.factory import get_southbound_driver
from nac_controller import normalize_mac_colon_lower
from models.policy import find_vlan_for_device
from sdn.southbound import nbi


class SDNControlPlane:
    """High-level NAC/SDN control logic: validate, derive policy, program data plane."""

    def _get_device_by_mac(self, mac_hyphen_upper: str) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT mac, username, authorized, vlan FROM devices WHERE mac = ?", (mac_hyphen_upper,))
            row = cur.fetchone()
            if not row:
                # Fallback: some inserts may have stored colon-upper format; try that too
                mac_colon_upper = mac_hyphen_upper.replace("-", ":")
                cur.execute("SELECT mac, username, authorized, vlan FROM devices WHERE mac = ?", (mac_colon_upper,))
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
            # Device not pre-registered: try policy-based authorization using MAC prefix or default policy.
            vlan_policy = find_vlan_for_device(None, mac_hyphen_upper)
            if vlan_policy is not None:
                # Program network to allow on derived VLAN and persist a device record for future lookups
                nbi.permit_mac_on_vlan(mac_colon_lower, vlan_policy)
                try:
                    conn = get_db_connection()
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT OR REPLACE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
                        (mac_hyphen_upper, None, 1, int(vlan_policy)),
                    )
                    conn.commit()
                finally:
                    conn.close()
                log(f"control_plane: policy_allow mac={mac_colon_lower} vlan={vlan_policy} (no prior device)")
                return {
                    "mac": mac_hyphen_upper,
                    "username": None,
                    "authorized": True,
                    "vlan": vlan_policy,
                }
            # No matching policy: quarantine
            nbi.quarantine_mac(mac_colon_lower)
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
        # Final fallback: respect device's configured VLAN if present
        if vlan is None and device.get('vlan') is not None:
            vlan = device.get('vlan')
        authorized = vlan is not None

        if authorized:
            # Program data plane and persist the resolved VLAN/authorization.
            nbi.permit_mac_on_vlan(mac_colon_lower, vlan)
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute(
                    "UPDATE devices SET authorized = ?, vlan = ? WHERE mac = ?",
                    (1, int(vlan), mac_hyphen_upper),
                )
                conn.commit()
            finally:
                conn.close()
            log(f"control_plane: allowed mac={mac_colon_lower} vlan={vlan}")
        else:
            # Quarantine and persist blocked state
            nbi.quarantine_mac(mac_colon_lower)
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute(
                    "UPDATE devices SET authorized = ?, vlan = NULL WHERE mac = ?",
                    (0, mac_hyphen_upper),
                )
                conn.commit()
            finally:
                conn.close()
            log(f"control_plane: no_vlan mac={mac_colon_lower} -> blocked")

        return {
            "mac": mac_hyphen_upper,
            "username": username,
            "authorized": authorized,
            "vlan": vlan,
        }

control = SDNControlPlane()


