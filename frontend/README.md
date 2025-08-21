# Network Access Control (NAC) System

**Version**: 1.0  
**Date**: August 19, 2025  

A robust and intelligent Network Access Control (NAC) system designed to enforce access policies, authenticate users and devices, and dynamically segment networks. This project leverages a Flask-based back-end, a React front-end with Material-UI, and a Python-based network scanner to provide a secure and scalable solution for network management.

---

## Project Overview

### Objective
To enhance network security by validating devices and users, assigning VLANs, blocking unauthorized access, and delivering a comprehensive admin dashboard for real-time monitoring and management.

### System Description
The NAC system integrates simulated 802.1X authentication, RADIUS user validation, dynamic VLAN assignment, `iptables` firewall enforcement, and a responsive web dashboard. It addresses critical challenges such as unauthorized access, regulatory compliance, and network visibility, offering a professional-grade solution for enterprise environments.

---

## Key Features
- **802.1X Port Authentication (Simulated)**: Emulates enterprise-level port security protocols.
- **RADIUS User Validation**: Authenticates users against a simulated RADIUS server.
- **MAC Address Filtering & Spoof Detection**: Identifies and blocks unauthorized or spoofed devices.
- **Device Fingerprinting (ARP-Based)**: Detects connected devices using ARP table analysis.
- **Dynamic VLAN Assignment**: Assigns VLANs based on device authorization status.
- **Comprehensive Logging, Alerting, & Firewall Blocking**: Records events, issues alerts, and enforces blocks via `iptables`.
- **Admin Dashboard**: Provides a feature-rich interface to view devices/logs, validate MAC addresses, and manage device registrations.

---

## Skills and Technologies

### Skills Utilized
- **Authentication**: 802.1X, RADIUS
- **Networking**: VLAN configuration, `iptables`, ARP
- **Back-End Development**: Flask, SQLite
- **Front-End Development**: React, Material-UI
- **Scripting**: Python, Bash

### Tools and Technologies
- **FreeRADIUS**: Simulated for user authentication.
- **hostapd**: Simulated access point functionality.
- **iptables/nftables**: Firewall rule enforcement.
- **Python 3.x**: Core scripting and Flask back-end.
- **Flask**: RESTful API and server-side logic.
- **React.js**: Dynamic and responsive front-end interface.
- **Node.js**: JavaScript runtime for front-end development.
- **SQLite**: Lightweight, embedded database for device storage.
- **Wireshark/tcpdump**: Optional tools for network traffic analysis.

---

## Use Cases
- **Corporate LAN**: Secures employee device access in office environments.
- **Campus Networks**: Manages device access for students and staff.
- **IoT Enforcement**: Controls connectivity for IoT devices.
- **Wi-Fi Segmentation**: Isolates guest and internal network traffic.

---

## Team Members
- Mikiyas Sisay Desta
- Tesfahun Kere
- Sebrina Mohammed
- Mekdim Zelalem

---

## Table of Contents
- [Key Features](#key-features)
- [Setup Environment](#setup-environment)
- [Usage](#usage)
  - [System Startup](#system-startup)
  - [System Interaction](#system-interaction)
  - [Scanner Automation](#scanner-automation)
  - [Monitoring and Logging](#monitoring-and-logging)
- [Directory Structure](#directory-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
  - [First-Time Contribution Guide](#first-time-contribution-guide)
- [License](#license)

---

## Setup Environment
- **Development Platform**: Optimized for Linux (validated on Fedora 40). It is recommended to use a Python virtual environment to isolate dependencies:
  ```bash
  python3 -m venv venv
  source venv/bin/activate