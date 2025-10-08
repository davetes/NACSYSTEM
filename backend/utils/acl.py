import re
from typing import List, Dict, Tuple


_RULE_RE = re.compile(
    r"^(permit|deny)\s+"  # action
    r"(ip|tcp|udp|icmp)\s+"  # protocol
    r"([^\s]+)\s+"  # src
    r"([^\s]+)"      # dst
    r"(?:\s+eq\s+(\d+))?\s*$",  # optional port for tcp/udp
    re.IGNORECASE,
)


def _normalize_addr(addr: str) -> str:
    addr = addr.strip().lower()
    if addr in ("any", "*"):
        return "any"
    return addr


def validate_acls(acls: List[Dict]) -> Dict:
    issues: List[str] = []
    normalized: List[Dict] = []
    if not isinstance(acls, list):
        return {"ok": False, "issues": ["Payload should be an array of ACL objects"]}
    for i, item in enumerate(acls):
        if not isinstance(item, dict):
            issues.append(f"ACL[{i}]: must be an object")
            continue
        rule = (item.get("rule") or "").strip()
        if not rule:
            issues.append(f"ACL[{i}]: missing 'rule'")
            continue
        m = _RULE_RE.match(rule)
        if not m:
            issues.append(f"ACL[{i}]: unsupported rule syntax: '{rule}'")
            continue
        action, proto, src, dst, port = m.groups()
        proto = proto.lower()
        if port and proto not in ("tcp", "udp"):
            issues.append(f"ACL[{i}]: 'eq <port>' only valid for tcp/udp")
            continue
        normalized.append({
            "action": action.lower(),
            "protocol": proto,
            "src": _normalize_addr(src),
            "dst": _normalize_addr(dst),
            "port": int(port) if port else None,
            "raw": rule,
            "description": item.get("description"),
        })
    return {"ok": len(issues) == 0, "issues": issues, "rules": normalized}


