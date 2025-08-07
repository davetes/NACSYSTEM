# 🛡️ Windows NAC System (Network Access Control)

A simple Python-based Network Access Control (NAC) tool for **Windows**, which scans connected devices on the local network and blocks unauthorized devices using **Windows Firewall** based on their **MAC address** (via IP mapping).

---

## ✅ Features

- Detects all connected devices via `arp -a`
- Compares MAC addresses against an allowed list
- Automatically blocks unknown devices by **IP**
- Logs all allowed/blocked activity
- Lightweight and works on any Windows machine with Python

---

## 🧱 How It Works

1. Uses `arp -a` to detect connected devices
2. Extracts MAC and IP address mappings
3. Compares MACs to your `allowed_macs.txt` file
4. If unauthorized, blocks the **IP address** using `netsh advfirewall`
5. Logs results to `logs/nac.log`

---

## 🖥️ Requirements

- Windows 10/11
- Python 3.8+
- Admin access (for firewall rules)
- VS Code (optional)

---

## ⚙️ Setup Instructions

### 1. Clone the project or download the files

```bash
git clone https://github.com/yourusername/nac_windows.git
cd nac_windows