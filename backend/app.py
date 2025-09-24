from flask import Flask, request, jsonify
import os
from datetime import datetime
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

@app.route('/api/intents', methods=['POST'])
def api_intents():
    data = request.json or {}
    src = data.get('src')
    dst = data.get('dst')
    constraints = data.get('constraints') or {}
    tenant = data.get('tenant') or 'default'
    if not src or not dst:
        return jsonify({'error': 'src and dst are required'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Ensure intents table exists
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS intents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              src TEXT NOT NULL,
              dst TEXT NOT NULL,
              constraints TEXT,
              tenant TEXT,
              status TEXT,
              created_at TEXT
            )
            """
        )
        cur.execute(
            "INSERT INTO intents (src, dst, constraints, tenant, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (src, dst, str(constraints), tenant, 'ACCEPTED', datetime.utcnow().isoformat() + 'Z')
        )
        conn.commit()
        intent_id = cur.lastrowid
        # Minimal compiledFlows count; in a real system this would be produced by the compiler
        compiled_flows = 1
        return jsonify({'id': intent_id, 'status': 'ACCEPTED', 'compiledFlows': compiled_flows})
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

# --- SDN health and alerts (for frontend HealthPanel) ---
@app.route('/api/health', methods=['GET'])
def api_health():
    # Basic health payload; extend with real checks as needed
    services = [
        { 'name': 'topology-service', 'status': 'UP' },
        { 'name': 'intent-service', 'status': 'UP' },
        { 'name': 'flow-programmer', 'status': 'UP' },
    ]
    payload = {
        'controller': {
            'status': 'UP',
            'version': os.getenv('APP_VERSION', '0.1.0')
        },
        'services': services,
        'updatedAt': datetime.utcnow().isoformat() + 'Z'
    }
    return jsonify(payload)


@app.route('/api/alerts', methods=['GET'])
def api_alerts():
    # Parse recent lines in the NAC log to surface warnings/errors
    results = []
    try:
        with open('../logs/nac.log', 'r') as f:
            lines = f.readlines()[-200:]
        for line in lines:
            text = line.strip()
            low = text.lower()
            severity = 'info'
            if 'error' in low or 'failed' in low or 'exception' in low:
                severity = 'error'
            elif 'warn' in low or 'unauthorized' in low or 'degraded' in low or 'denied' in low:
                severity = 'warning'
            # naive timestamp extraction: assume logs like "YYYY-mm-dd ... - message"
            ts_part = text.split(' - ')[0].strip()
            try:
                # If ts_part parses, use it; else fallback to now
                ts = ts_part if ts_part else datetime.utcnow().isoformat() + 'Z'
            except Exception:
                ts = datetime.utcnow().isoformat() + 'Z'
            results.append({ 'severity': severity, 'message': text, 'ts': ts })
    except Exception:
        # If logs file not present, return empty list
        results = []
    return jsonify(results)

# --- Minimal SDN topology and flows for frontend panels ---
@app.route('/api/topology', methods=['GET'])
def api_topology():
    # Basic static spine-leaf with DB devices as leaves
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT mac FROM devices")
        device_rows = cur.fetchall() or []
        devices = [{'id': r['mac'], 'name': r['mac'], 'role': 'leaf'} for r in device_rows]
        # Add one spine node
        spine_id = 'SPINE-1'
        devices.append({'id': spine_id, 'name': 'Spine-1', 'role': 'spine'})
        links = [{'src': d['id'], 'dst': spine_id, 'utilization': 0} for d in devices if d['role'] == 'leaf']
        payload = {
            'devices': devices,
            'links': links,
            'updatedAt': datetime.utcnow().isoformat() + 'Z'
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()


@app.route('/api/flows', methods=['GET'])
def api_flows():
    device_id = request.args.get('deviceId')
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        if device_id:
            cur.execute("SELECT mac, authorized, vlan FROM devices WHERE mac = ?", (device_id,))
        else:
            cur.execute("SELECT mac, authorized, vlan FROM devices")
        rows = cur.fetchall() or []
        flows = []
        for idx, r in enumerate(rows, start=1):
            mac = (r['mac'] or '').replace('-', ':').lower()
            if r['authorized'] and r['vlan'] is not None:
                flows.append({
                    'id': f'f{idx}',
                    'deviceId': r['mac'],
                    'match': f"ether,dl_src={mac}",
                    'action': f"ALLOW:VLAN={r['vlan']}",
                    'priority': 100
                })
            else:
                flows.append({
                    'id': f'f{idx}',
                    'deviceId': r['mac'],
                    'match': f"ether,dl_src={mac}",
                    'action': "DROP",
                    'priority': 90
                })
        return jsonify(flows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

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