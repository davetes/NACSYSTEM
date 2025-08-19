from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
import sqlite3

load_dotenv()
app = Flask(__name__)
API_KEY = os.getenv('API_KEY')

def get_db_connection():
    return sqlite3.connect('devices.db')

@app.before_request
def check_api_key():
    if request.path.startswith('/'):
        api_key = request.headers.get('X-API-KEY')
        if api_key != API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401

@app.route('/devices', methods=['GET'])
def get_devices():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT mac, username, authorized, vlan FROM devices')
        devices = [{'mac': row[0], 'username': row[1], 'authorized': row[2], 'vlan': row[3]} for row in cursor.fetchall()]
    return jsonify(devices)

@app.route('/validate/<mac>', methods=['GET'])
def validate_mac(mac):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT authorized FROM devices WHERE mac = ?', (mac,))
        result = cursor.fetchone()
    return jsonify({'mac': mac, 'authorized': bool(result[0]) if result else False, 'vlan': 10 if result else None})

@app.route('/logs', methods=['GET'])
def get_logs():
    with open('../logs/nac.log', 'r') as f:
        logs = f.readlines()
    return jsonify({'logs': logs})

@app.route('/devices', methods=['POST'])
def add_device():
    data = request.json
    mac, username, vlan = data.get('mac'), data.get('username'), data.get('vlan')
    if not all([mac, username, vlan]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT mac FROM devices WHERE mac = ?', (mac,))
            if cursor.fetchone():
                return jsonify({'error': 'MAC address already exists'}), 409
            cursor.execute('INSERT INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)',
                           (mac, username, 1, vlan))
            conn.commit()
        return jsonify({'message': 'Device added successfully'})
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/devices/<mac>', methods=['DELETE'])
def delete_device(mac):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM devices WHERE mac = ?', (mac,))
            conn.commit()
        return jsonify({'message': 'Device deleted successfully'})
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS devices
                          (mac TEXT PRIMARY KEY, username TEXT, authorized INTEGER, vlan INTEGER)''')
        # Insert initial data (only if not exists to avoid duplicates)
        cursor.execute("INSERT OR IGNORE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
                       ('AA-BB-CC-DD-EE-FF', 'Device 1', 1, 10))
        cursor.execute("INSERT OR IGNORE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
                       ('11-22-33-44-55-66', 'Device 2', 1, 20))
        cursor.execute("INSERT OR IGNORE INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
                       ('2C-4F-52-32-38-7F', 'Gateway', 1, 10))
        conn.commit()
    app.run(debug=True, host='0.0.0.0', port=5000)