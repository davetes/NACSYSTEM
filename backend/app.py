from flask import Flask, request, jsonify, send_from_directory
import os
from datetime import datetime, timedelta
import re
import secrets
import smtplib
import ssl
from email.message import EmailMessage
from dotenv import load_dotenv
from flask_cors import CORS
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from models.database import get_db_connection, init_db, seed_db
from werkzeug.utils import secure_filename
from sdn.control_plane import control
from models.policy import list_policies, upsert_policy, delete_policy

load_dotenv()
app = Flask(__name__)
CORS(app)
API_KEY = os.getenv('API_KEY')
JWT_SECRET = os.getenv('JWT_SECRET', 'change_this_dev_secret')
JWT_ALG = 'HS256'
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads')))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
BACKEND_BASE_URL = os.getenv('BACKEND_BASE_URL', 'http://localhost:5000')

def _generate_token(user_id: int, username: str) -> str:
    payload = {
        'sub': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=8)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def _verify_token(token: str):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data
    except Exception:
        return None

def get_db_connection_legacy():
    # Legacy shim retained for compatibility
    return get_db_connection()

@app.before_request
def check_api_key():
    # Allow unauthenticated access to auth endpoints and health/static assets
    open_paths = (
        '/auth/login', '/auth/register', '/auth/me',
        '/auth/forgot-password', '/auth/reset-password',
        '/api/health', '/api/alerts', '/api/topology', '/api/flows'
    )
    # Allow GET validation without auth for ease of integration (non-mutating)
    open_prefixes = (
        '/sdn/validate/', '/validate/', '/uploads/'
    )
    if (
        request.path in open_paths
        or request.method == 'OPTIONS'
        or (request.method == 'GET' and any(request.path.startswith(p) for p in open_prefixes))
    ):
        return None
    # Prefer Bearer token (sets auth.user) and then fall back to X-API-KEY
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1].strip()
        data = _verify_token(token)
        if data:
            request.environ['auth.user'] = data
            return None
    api_key = request.headers.get('X-API-KEY')
    if api_key == API_KEY and api_key is not None:
        return None
    return jsonify({'error': 'Unauthorized'}), 401

# --- Authentication Endpoints ---
@app.route('/auth/register', methods=['POST'])
def auth_register():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not username or not password or not email:
        return jsonify({'error': 'username, email and password are required'}), 400
    # Very basic email validation
    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({'error': 'invalid email'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cur.fetchone():
            return jsonify({'error': 'username already exists'}), 409
        # Ensure email uniqueness
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            return jsonify({'error': 'email already exists'}), 409
        pwd_hash = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, datetime('now'))",
            (username, email, pwd_hash)
        )
        conn.commit()
        user_id = cur.lastrowid
        token = _generate_token(user_id, username)
        return jsonify({'token': token, 'user': {'id': user_id, 'username': username, 'email': email}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

def _send_email(to_email: str, subject: str, body_text: str) -> None:
    """Send an email using Gmail SMTP. Requires env GMAIL_USER and GMAIL_APP_PASSWORD."""
    gmail_user = os.getenv('GMAIL_USER')
    gmail_pass = os.getenv('GMAIL_APP_PASSWORD')
    if not gmail_user or not gmail_pass:
        raise RuntimeError('Email not configured: set GMAIL_USER and GMAIL_APP_PASSWORD')
    msg = EmailMessage()
    msg['From'] = gmail_user
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(body_text)
    context = ssl.create_default_context()
    last_err = None
    # Try SSL first (465)
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context, timeout=15) as server:
            server.login(gmail_user, gmail_pass)
            server.send_message(msg)
            return
    except Exception as e:
        last_err = e
    # Fallback to STARTTLS on 587
    try:
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(gmail_user, gmail_pass)
            server.send_message(msg)
            return
    except Exception as e2:
        raise RuntimeError(f"SMTP send failed (SSL and STARTTLS). SSL error: {last_err}; STARTTLS error: {e2}")

def _generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def _is_strong_password(pwd: str) -> bool:
    return bool(re.search(r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^\w\s]).{6,}$", pwd or ''))

@app.route('/auth/forgot-password', methods=['POST'])
def auth_forgot_password():
    data = request.json or {}
    identifier = (data.get('identifier') or '').strip().lower()
    if not identifier:
        # Always respond generic
        return jsonify({'message': 'If an account exists, a reset link has been sent.'})
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Look up by email first, then username
        cur.execute("SELECT id, username, email FROM users WHERE lower(email) = ?", (identifier,))
        row = cur.fetchone()
        if not row:
            cur.execute("SELECT id, username, email FROM users WHERE lower(username) = ?", (identifier,))
            row = cur.fetchone()
        if row and row['email']:
            user_id = row['id']
            email = row['email']
            token = _generate_reset_token()
            expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + 'Z'
            cur.execute(
                "INSERT INTO reset_tokens (user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, datetime('now'))",
                (user_id, token, expires_at)
            )
            conn.commit()
            # Build reset URL
            base_url = os.getenv('FRONTEND_BASE_URL', 'http://localhost:3000')
            reset_link = f"{base_url}/reset-password?token={token}"
            dev_mode = os.getenv('EMAIL_DEV_MODE', '0') == '1'
            if dev_mode:
                # In dev mode, include the link in response for easier testing
                try:
                    print(f"[DEV] Password reset link for {email}: {reset_link}")
                except Exception:
                    pass
                return jsonify({'message': 'If an account exists, a reset link has been sent.', 'dev_reset_link': reset_link})
            else:
                try:
                    _send_email(
                        to_email=email,
                        subject='PulseNet password reset',
                        body_text=(
                            f"Hello {row['username']},\n\n"
                            f"We received a request to reset your PulseNet password.\n"
                            f"Use the link below to set a new password. This link expires in 1 hour.\n\n"
                            f"{reset_link}\n\n"
                            f"If you did not request this, you can safely ignore this email.\n"
                        ),
                    )
                except Exception as e:
                    # Log link and error message to server logs if email sending fails
                    try:
                        print(f"[WARN] Email send failed: {e}. Password reset link for {email}: {reset_link}")
                    except Exception:
                        pass
        # Always respond generic
        return jsonify({'message': 'If an account exists, a reset link has been sent.'})
    except Exception as e:
        # Still keep response generic
        return jsonify({'message': 'If an account exists, a reset link has been sent.'})
    finally:
        conn.close()

@app.route('/auth/reset-password', methods=['POST'])
def auth_reset_password():
    data = request.json or {}
    token = (data.get('token') or '').strip()
    password = data.get('password') or ''
    if not token or not password:
        return jsonify({'error': 'invalid request'}), 400
    if not _is_strong_password(password):
        return jsonify({'error': 'weak password'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id, expires_at, used FROM reset_tokens WHERE token = ?", (token,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'invalid token'}), 400
        # Check expiry and used
        try:
            exp = datetime.fromisoformat(row['expires_at'].replace('Z', ''))
        except Exception:
            exp = datetime.utcnow() - timedelta(seconds=1)
        if row['used'] or datetime.utcnow() > exp:
            return jsonify({'error': 'token expired'}), 400
        user_id = row['user_id']
        pwd_hash = generate_password_hash(password)
        cur.execute("UPDATE users SET password_hash = ? WHERE id = ?", (pwd_hash, user_id))
        cur.execute("UPDATE reset_tokens SET used = 1 WHERE token = ?", (token,))
        conn.commit()
        return jsonify({'message': 'password updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/auth/change-password', methods=['POST'])
def auth_change_password():
    # Requires Authorization: Bearer token (enforced by before_request)
    auth_user = request.environ.get('auth.user') or {}
    user_id = auth_user.get('sub')
    data = request.json or {}
    # Accept multiple common field names from various UIs
    old_password = (
        data.get('oldPassword')
        or data.get('old_password')
        or data.get('currentPassword')
        or data.get('current_password')
        or ''
    )
    new_password = (
        data.get('newPassword')
        or data.get('new_password')
        or data.get('password')  # some forms reuse 'password' for new value
        or ''
    )
    if not new_password:
        return jsonify({'error': 'new password is required', 'hint': "use 'newPassword' or 'password'"}), 400
    if not _is_strong_password(new_password):
        return jsonify({'error': 'weak password'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Preferred path: JWT present -> use user_id from token
        if user_id:
            cur.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'user not found'}), 404
            current_hash = row['password_hash'] if 'password_hash' in row.keys() else row[0]
            if current_hash:
                try:
                    if not old_password or not check_password_hash(current_hash, old_password):
                        return jsonify({'error': 'invalid current password', 'hint': "include 'currentPassword' or 'oldPassword'"}), 400
                except Exception:
                    return jsonify({'error': 'password verification failed'}), 400
            new_hash = generate_password_hash(new_password)
            cur.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
            try:
                print(f"[INFO] Password changed via JWT for user_id={user_id}")
            except Exception:
                pass
        else:
            # Fallback path: allow change with explicit username + oldPassword (for API-key based UIs)
            username = (data.get('username') or data.get('user') or '').strip()
            if not username:
                return jsonify({'error': 'Unauthorized', 'hint': 'send Bearer token or include username + oldPassword'}), 401
            cur.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'user not found'}), 404
            uid = row['id'] if 'id' in row.keys() else row[0]
            current_hash = row['password_hash'] if 'password_hash' in row.keys() else row[1]
            if not old_password or not current_hash or not check_password_hash(current_hash, old_password):
                return jsonify({'error': 'invalid current password'}), 400
            new_hash = generate_password_hash(new_password)
            cur.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, uid))
            try:
                print(f"[INFO] Password changed via fallback for username={username} (id={uid})")
            except Exception:
                pass
        conn.commit()
        return jsonify({'message': 'password updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return jsonify({'error': 'username and password are required'}), 400
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, password_hash, email FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        if not row or not check_password_hash(row['password_hash'], password):
            return jsonify({'error': 'invalid credentials'}), 401
        token = _generate_token(row['id'], username)
        return jsonify({'token': token, 'user': {'id': row['id'], 'username': username, 'email': row['email']}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/auth/me', methods=['GET'])
def auth_me():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
    token = auth_header.split(' ', 1)[1].strip()
    data = _verify_token(token)
    if not data:
        return jsonify({'error': 'Unauthorized'}), 401
    # Optionally hydrate email by querying DB
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT email FROM users WHERE id = ?", (data.get('sub'),))
        row = cur.fetchone()
        email = row['email'] if row and 'email' in row.keys() else None
    except Exception:
        email = None
    finally:
        try:
            conn.close()
        except Exception:
            pass
    return jsonify({'user': {'id': data.get('sub'), 'username': data.get('username'), 'email': email}})

# --- Profile Endpoints ---
@app.route('/profile/me', methods=['GET'])
def profile_me():
    auth_user = request.environ.get('auth.user') or {}
    user_id = auth_user.get('sub')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT username, email, display_name, avatar_url FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'user not found'}), 404
        # Normalize avatar URL to absolute
        raw_avatar = row['avatar_url'] if 'avatar_url' in row.keys() else None
        if raw_avatar and raw_avatar.startswith('/'):
            avatar_url = f"{BACKEND_BASE_URL}{raw_avatar}"
        else:
            avatar_url = raw_avatar
        return jsonify({
            'username': row['username'],
            'email': row['email'],
            'displayName': row['display_name'] if 'display_name' in row.keys() else None,
            'avatarUrl': avatar_url,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/profile/update', methods=['POST'])
def profile_update():
    auth_user = request.environ.get('auth.user') or {}
    user_id = auth_user.get('sub')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    display_name = (data.get('displayName') or '').strip()
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET display_name = ? WHERE id = ?", (display_name, user_id))
        conn.commit()
        return jsonify({'message': 'profile updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/profile/avatar', methods=['POST'])
def profile_avatar():
    auth_user = request.environ.get('auth.user') or {}
    user_id = auth_user.get('sub')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    if 'avatar' not in request.files:
        return jsonify({'error': 'avatar file required'}), 400
    f = request.files['avatar']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400
    filename = secure_filename(f"u{user_id}_" + f.filename)
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    f.save(save_path)
    # Store relative path in DB but return absolute URL in response
    relative_path = f"/uploads/{filename}"
    avatar_url = f"{BACKEND_BASE_URL}{relative_path}"
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (relative_path, user_id))
        conn.commit()
    finally:
        conn.close()
    return jsonify({'avatarUrl': avatar_url})

@app.route('/uploads/<path:filename>', methods=['GET'])
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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