import subprocess
import re
import os
import sys
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.nac_controller import block_device, normalize_mac_hyphen_upper
from backend.models.database import get_db_connection

LOG_FILE = os.path.join(os.path.dirname(__file__), '..', 'logs', 'nac.log')

def log(message):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(f"{datetime.now()} - {message}\n")
    print(message)

def get_allowed_macs():
    conn = get_db_connection()
    macs = conn.execute('SELECT mac FROM devices WHERE authorized = 1').fetchall()
    conn.close()
    return [normalize_mac_hyphen_upper(row['mac']) for row in macs]

def get_mac_ip_mapping():
    try:
        output = subprocess.check_output("arp -a", shell=True).decode()
        log(f"ARP output: {output}")
        # Match IP and MAC in format: ? (10.2.71.117) at 28:39:26:aa:f3:d5 [ether] on wlp2s0
        entries = re.findall(r"\?\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]{17})\s+\[ether\]\s+on\s+\w+", output)
        if not entries:
            log("No devices found in ARP table")
        else:
            log(f"Found {len(entries)} devices in ARP table")
        return [(mac.upper().replace(":", "-"), ip) for ip, mac in entries]
    except subprocess.CalledProcessError as e:
        log(f"Error running arp -a: {e}")
        return []

def block_ip_with_firewall(ip):
    rule_name = f"Block_IP_{ip.replace('.', '_')}"
    cmd = f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=block remoteip={ip}'
    subprocess.run(cmd, shell=True)
    log(f"[X] Blocked IP: {ip}")

def main():
    allowed_macs = get_allowed_macs()
    mac_ip_list = get_mac_ip_mapping()
    log("=== NAC Scan Started ===")
    for mac, ip in mac_ip_list:
        if mac in allowed_macs:
            log(f"[✔] Allowed: {mac} ({ip})")
        else:
            block_device(mac)
            # block_ip_with_firewall(ip)  # Disabled for Linux; uses iptables instead

if __name__ == "__main__":
    main()