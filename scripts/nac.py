import subprocess
import re
import os
from datetime import datetime

ALLOWED_MACS_FILE = "allowed_macs.txt"
LOG_FILE = "logs/nac.log"

def load_allowed_macs():
    with open(ALLOWED_MACS_FILE) as f:
        return [line.strip().upper() for line in f.readlines()]

def log(message):
    os.makedirs("logs", exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(f"{datetime.now()} - {message}\n")
    print(message)

def get_mac_ip_mapping():
    """Returns a list of (MAC, IP) from arp -a"""
    output = subprocess.check_output("arp -a", shell=True).decode()
    entries = re.findall(r"(\d+\.\d+\.\d+\.\d+)\s+([\w-]+)\s+([0-9a-fA-F\-]{17})", output)
    return [(mac.upper(), ip) for ip, _, mac in entries]

def block_ip_with_firewall(ip):
    rule_name = f"Block_IP_{ip.replace('.', '_')}"
    cmd = f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=block remoteip={ip}'
    subprocess.run(cmd, shell=True)
    log(f"[X] Blocked IP: {ip}")

def main():
    allowed_macs = load_allowed_macs()
    mac_ip_list = get_mac_ip_mapping()

    log("=== NAC Scan Started ===")
    for mac, ip in mac_ip_list:
        if mac in allowed_macs:
            log(f"[✔] Allowed: {mac} ({ip})")
        else:
            block_ip_with_firewall(ip)

if __name__ == "__main__":
    main()
