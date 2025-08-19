import json
import os
import re
import subprocess
from typing import Dict, List, Optional, Union


DEVICES_JSON_PATH = os.path.join("data", "devices.json")
VLAN_PROFILES_JSON_PATH = os.path.join("data", "vlan_profiles.json")
ALLOWED_MACS_PATH = "allowed_macs.txt"
LOGS_DIR = "logs"
LOG_FILE = os.path.join(LOGS_DIR, "nac.log")


def _log(message: str) -> None:
	os.makedirs(LOGS_DIR, exist_ok=True)
	with open(LOG_FILE, "a", encoding="utf-8") as log_file:
		log_file.write(f"{message}\n")


def _ensure_devices_store_exists() -> None:
	"""Create `data/devices.json` if missing, seeding from `allowed_macs.txt` when present."""
	os.makedirs("data", exist_ok=True)
	if os.path.exists(DEVICES_JSON_PATH):
		return

	seed_devices: List[Dict] = []
	if os.path.exists(ALLOWED_MACS_PATH):
		with open(ALLOWED_MACS_PATH, "r", encoding="utf-8") as allowed:
			for index, line in enumerate(allowed.readlines(), start=1):
				mac_raw = line.strip()
				if not mac_raw:
					continue
				try:
					mac_hyphen_upper = normalize_mac_hyphen_upper(mac_raw)
				except ValueError:
					# Skip invalid entries in seed file
					continue
				seed_devices.append({
					"mac": mac_hyphen_upper,
					"username": f"user{index}",
					"authorized": True
				})

	with open(DEVICES_JSON_PATH, "w", encoding="utf-8") as f:
		json.dump(seed_devices, f, indent=2)


def normalize_mac_colon_lower(mac_address: str) -> str:
	"""Normalize a MAC address to colon-separated lowercase form (aa:bb:cc:dd:ee:ff)."""
	if mac_address is None:
		raise ValueError("MAC address is required")
	mac_clean = mac_address.strip().lower().replace("-", ":")
	pattern = r"^[0-9a-f]{2}(:[0-9a-f]{2}){5}$"
	if not re.match(pattern, mac_clean):
		raise ValueError("Invalid MAC address format. Expected AA-BB-CC-DD-EE-FF or AA:BB:CC:DD:EE:FF")
	return mac_clean


def normalize_mac_hyphen_upper(mac_address: str) -> str:
	"""Normalize a MAC address to hyphen-separated uppercase form (AA-BB-CC-DD-EE-FF)."""
	if mac_address is None:
		raise ValueError("MAC address is required")
	mac_clean = mac_address.strip().upper().replace(":", "-")
	pattern = r"^[0-9A-F]{2}(-[0-9A-F]{2}){5}$"
	if not re.match(pattern, mac_clean):
		raise ValueError("Invalid MAC address format. Expected AA-BB-CC-DD-EE-FF or AA:BB:CC:DD:EE:FF")
	return mac_clean


def _macs_equal(a: str, b: str) -> bool:
	"""Compare two MAC addresses irrespective of separator/case."""
	return normalize_mac_colon_lower(a) == normalize_mac_colon_lower(b)


def _load_json_file(path: str, default: Union[List, Dict]) -> Union[List, Dict]:
	if not os.path.exists(path):
		return default
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)


def load_devices_from_json() -> List[Dict]:
	"""Load devices from the JSON store, creating it if missing."""
	_ensure_devices_store_exists()
	devices = _load_json_file(DEVICES_JSON_PATH, default=[])
	return devices


def list_authorized_devices() -> List[Dict]:
	"""Return authorized devices from the JSON store."""
	devices = load_devices_from_json()
	# If 'authorized' flag missing, treat as authorized
	return [device for device in devices if device.get("authorized", True)]


def get_device_by_mac(mac_address: str) -> Optional[Dict]:
	mac_norm_colon = normalize_mac_colon_lower(mac_address)
	for device in load_devices_from_json():
		mac_in_file = device.get("mac")
		if mac_in_file and _macs_equal(mac_in_file, mac_norm_colon):
			return device
	return None


# New required API
def validate_device(mac: str) -> Optional[str]:
	"""Check MAC in devices.json and return the associated username if found.

	Logs the lookup and outcome to logs/nac.log.
	"""
	try:
		mac_norm_colon = normalize_mac_colon_lower(mac)
	except ValueError as exc:
		_log(f"validate_device: invalid_mac mac={mac} error={exc}")
		raise

	device = get_device_by_mac(mac_norm_colon)
	if not device:
		_log(f"validate_device: not_found mac={mac_norm_colon}")
		return None

	username = device.get("username") or device.get("name")
	_log(f"validate_device: found mac={mac_norm_colon} username={username}")
	return username


def get_vlan(user: str) -> Optional[int]:
	"""Return VLAN from vlan_profiles.json for the given user.

	Supports either a mapping {"user": vlan} or a list of {"user": "..", "vlan": N}.
	Logs the lookup and outcome.
	"""
	profiles = _load_json_file(VLAN_PROFILES_JSON_PATH, default={})
	result: Optional[int] = None
	if isinstance(profiles, dict):
		value = profiles.get(user)
		if isinstance(value, int):
			result = value
	elif isinstance(profiles, list):
		for entry in profiles:
			if isinstance(entry, dict) and entry.get("user") == user and isinstance(entry.get("vlan"), int):
				result = entry.get("vlan")
				break

	_log(f"get_vlan: user={user} vlan={result}")
	return result


def block_device(mac: str) -> bool:
	"""Apply iptables DROP rules for an unauthorized MAC.

	Attempts to add DROP rules to INPUT and FORWARD chains using the mac match module.
	Returns True if at least one rule was applied successfully. Logs actions and errors.
	"""
	try:
		mac_norm = normalize_mac_colon_lower(mac)
	except ValueError as exc:
		_log(f"block_device: invalid_mac mac={mac} error={exc}")
		raise

	commands = [
		["iptables", "-A", "INPUT", "-m", "mac", "--mac-source", mac_norm, "-j", "DROP"],
		["iptables", "-A", "FORWARD", "-m", "mac", "--mac-source", mac_norm, "-j", "DROP"],
	]

	success_any = False
	for cmd in commands:
		try:
			proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
			if proc.returncode == 0:
				_log(f"block_device: rule_added cmd={' '.join(cmd)}")
				success_any = True
			else:
				_log(f"block_device: rule_failed cmd={' '.join(cmd)} rc={proc.returncode} stderr={proc.stderr.strip()}")
		except Exception as exc:  # noqa: BLE001
			_log(f"block_device: exception cmd={' '.join(cmd)} error={exc}")

	return success_any


# Compatibility helper for the Flask app endpoint used earlier
def validate_and_assign(mac_address: str) -> Dict:
	"""Return a combined response for validation and VLAN assignment for the API layer."""
	mac_norm = normalize_mac_colon_lower(mac_address)
	username = validate_device(mac_norm)
	vlan_value = get_vlan(username) if username else None
	response = {
		"mac": mac_norm.upper().replace(":", "-"),
		"username": username,
		"authorized": username is not None and vlan_value is not None,
		"vlan": vlan_value,
	}
	_log(f"validate_and_assign: mac={mac_norm} username={username} vlan={vlan_value}")
	return response

