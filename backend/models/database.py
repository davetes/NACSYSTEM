import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), '../../data/devices.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS devices (
            mac TEXT PRIMARY KEY,
            username TEXT,
            authorized BOOLEAN DEFAULT TRUE,
            vlan INTEGER
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vlan_profiles (
            username TEXT PRIMARY KEY,
            vlan INTEGER
        )
    ''')
    conn.commit()
    # Migrate from JSON if exists
    devices_json = os.path.join(os.path.dirname(__file__), '../../data/devices.json')
    if os.path.exists(devices_json):
        with open(devices_json, 'r') as f:
            devices = json.load(f)
            for dev in devices:
                cursor.execute('INSERT OR IGNORE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)',
                               (dev['mac'], dev.get('name'), dev['authorized'], dev.get('vlan')))
        conn.commit()
    vlan_json = os.path.join(os.path.dirname(__file__), '../../data/vlan_profiles.json')
    if os.path.exists(vlan_json):
        with open(vlan_json, 'r') as f:
            profiles = json.load(f)
            for user, vlan in profiles.items():
                cursor.execute('INSERT OR IGNORE INTO vlan_profiles (username, vlan) VALUES (?, ?)', (user, vlan))
        conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn