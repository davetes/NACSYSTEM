import json
import os
from typing import Iterable, List, Set, Union


USERS_JSON_PATH = os.path.join("data", "users.json")
DEVICES_JSON_PATH = os.path.join("data", "devices.json")


def _load_json(path: str) -> Union[List, dict, None]:
	if not os.path.exists(path):
		return None
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)


def _collect_usernames_from_devices() -> Set[str]:
	data = _load_json(DEVICES_JSON_PATH)
	if not isinstance(data, list):
		return set()
	usernames: Set[str] = set()
	for entry in data:
		if isinstance(entry, dict):
			username = entry.get("username") or entry.get("name")
			if isinstance(username, str) and username.strip():
				usernames.add(username.strip())
	return usernames


def _collect_usernames_from_users_json() -> Set[str]:
	data = _load_json(USERS_JSON_PATH)
	if data is None:
		return set()
	usernames: Set[str] = set()
	# Support either ["user1", "user2"] or [{"username": "user1"}, ...]
	if isinstance(data, list):
		for item in data:
			if isinstance(item, str) and item.strip():
				usernames.add(item.strip())
			elif isinstance(item, dict):
				name = item.get("username") or item.get("user") or item.get("name")
				if isinstance(name, str) and name.strip():
					usernames.add(name.strip())
	elif isinstance(data, dict):
		# Support {"users": [..]}
		maybe_list = data.get("users")
		if isinstance(maybe_list, list):
			for item in maybe_list:
				if isinstance(item, str) and item.strip():
					usernames.add(item.strip())
				elif isinstance(item, dict):
					name = item.get("username") or item.get("user") or item.get("name")
					if isinstance(name, str) and name.strip():
						usernames.add(name.strip())
	return usernames


def _load_all_known_usernames() -> Set[str]:
	usernames = _collect_usernames_from_users_json()
	if usernames:
		return usernames
	# Fallback to devices.json if no users.json
	return _collect_usernames_from_devices()


def authenticate_user(username: str, password: str) -> bool:
	"""Simulate RADIUS authentication.

	Returns True if the given username exists in the local store. The password is
	accepted but not verified in this simulation.
	"""
	if not isinstance(username, str) or not username.strip():
		return False
	known_users = _load_all_known_usernames()
	return username.strip() in known_users

