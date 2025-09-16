from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from models.mongo import get_db_and_collections, init_mongo_with_seed
from sdn.control_plane import control
from models.policy import list_policies, upsert_policy, delete_policy

load_dotenv()
app = Flask(__name__)
API_KEY = os.getenv('API_KEY')

def get_db_connection_legacy():
    # Removed SQLite support; kept only to avoid import errors if referenced elsewhere
    raise RuntimeError('SQLite has been removed. Use MongoDB via models.mongo.')

@app.before_request
def check_api_key():
    if request.path.startswith('/'):
        api_key = request.headers.get('X-API-KEY')
        if api_key != API_KEY:
            return jsonify({'error': 'Unauthorized'}), 401

@app.route('/devices', methods=['GET'])
def get_devices():
    _, devices_col, _ = get_db_and_collections()
    items = list(devices_col.find({}, {"_id": 0, "mac": 1, "username": 1, "authorized": 1, "vlan": 1}))
    return jsonify(items)

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
    data = request.json
    mac, username, vlan = data.get('mac'), data.get('username'), data.get('vlan')
    if not all([mac, username, vlan]):
        return jsonify({'error': 'Missing required fields'}), 400
    try:
        _, devices_col, _ = get_db_and_collections()
        existing = devices_col.find_one({"mac": mac})
        if existing:
                return jsonify({'error': 'MAC address already exists'}), 409
        devices_col.insert_one({"mac": mac, "username": username, "authorized": True, "vlan": int(vlan)})
        return jsonify({'message': 'Device added successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/devices/<mac>', methods=['DELETE'])
def delete_device(mac):
    try:
        _, devices_col, _ = get_db_and_collections()
        devices_col.delete_one({"mac": mac})
        return jsonify({'message': 'Device deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize Mongo (preferred)
    try:
        init_mongo_with_seed()
    except Exception:
        pass
    app.run(debug=True, host='0.0.0.0', port=5000)