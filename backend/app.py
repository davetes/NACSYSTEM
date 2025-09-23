from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from models.database import get_db_connection, init_db, seed_db
from sdn.control_plane import control
from models.policy import list_policies, upsert_policy, delete_policy

load_dotenv()
app = Flask(__name__)
API_KEY = os.getenv('API_KEY')

def get_db_connection_legacy():
    # Legacy shim retained for compatibility
    return get_db_connection()

@app.before_request
def check_api_key():
    if request.path.startswith('/'):
        api_key = request.headers.get('X-API-KEY')
        if api_key != API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401

@app.route('/devices', methods=['GET'])
def get_devices():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT mac, username, authorized, vlan FROM devices")
        rows = [dict(r) for r in cur.fetchall()]
        # normalize authorized int to bool for JSON
        for r in rows:
            r['authorized'] = bool(r.get('authorized', 0))
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/validate/<mac>', methods=['GET'])
def validate_mac(mac):
    # Route validation via SDN control plane
    result = control.validate_and_program(mac)
    return jsonify(result)

@app.route('/sdn/validate/<mac>', methods=['GET'])
def sdn_validate(mac):
    result = control.validate_and_program(mac)
    return jsonify(result)

@app.route('/sdn/enforce/<mac>', methods=['POST'])
def sdn_enforce(mac):
    # Re-apply policy/programming for the given MAC (idempotent)
    result = control.validate_and_program(mac)
    return jsonify(result)

@app.route('/sdn/policies', methods=['GET'])
def sdn_list_policies():
    return jsonify(list_policies())

@app.route('/sdn/policies', methods=['POST'])
def sdn_upsert_policy():
    data = request.json or {}
    name = data.get('name')
    vlan = data.get('vlan')
    criteria = data.get('criteria')
    if not name or vlan is None:
        return jsonify({'error': 'name and vlan are required'}), 400
    try:
        vlan = int(vlan)
    except Exception:
        return jsonify({'error': 'vlan must be integer'}), 400
    return jsonify(upsert_policy(name, vlan, criteria))

@app.route('/sdn/policies/<name>', methods=['DELETE'])
def sdn_delete_policy(name):
    deleted = delete_policy(name)
    return jsonify({'deleted': deleted})

@app.route('/logs', methods=['GET'])
def get_logs():
    with open('../logs/nac.log', 'r') as f:
        logs = f.readlines()
    return jsonify({'logs': logs})

@app.route('/devices', methods=['POST'])
def add_device():
    data = request.json or {}
    mac, username, vlan = data.get('mac'), data.get('username'), data.get('vlan')
    if not all([mac, username, vlan]):
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        vlan_int = int(vlan)
    except Exception:
        return jsonify({'error': 'vlan must be integer'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # authorized defaults to 1 on create
        cur.execute(
            "INSERT INTO devices (mac, username, authorized, vlan) VALUES (?, ?, ?, ?)",
            (mac, username, 1, vlan_int),
        )
        conn.commit()
        return jsonify({'message': 'Device added successfully'})
    except Exception as e:
        # Detect unique constraint violation
        if 'UNIQUE' in str(e).upper() or 'unique constraint' in str(e).lower():
            return jsonify({'error': 'MAC address already exists'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/devices/<mac>', methods=['DELETE'])
def delete_device(mac):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM devices WHERE mac = ?", (mac,))
        conn.commit()
        return jsonify({'message': 'Device deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    # Initialize SQLite and seed data
    try:
        init_db()
        seed_db()
    except Exception:
        pass
    app.run(debug=True, host='0.0.0.0', port=5000)