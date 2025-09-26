# API Documentation

## Endpoints

- **GET /devices**: List authorized devices.
  - Response: [{mac, username, vlan}]

- **POST /devices**: Add device.
  - Body: {mac, username, vlan}

- **DELETE /devices/<mac>**: Delete device.

- **GET /logs**: Get logs.

- **GET /validate/<mac>**: Validate MAC and assign VLAN.
  - Response: {mac, username, authorized, vlan}

- **GET /sdn/validate/<mac>**: SDN control-plane validation and programming.
  - Response: {mac, username, authorized, vlan}
  
- **POST /sdn/enforce/<mac>**: Re-apply policy/programming for MAC.
  - Response: {mac, username, authorized, vlan}

- **GET /sdn/policies**: List policies.
- **POST /sdn/policies**: Upsert a policy.
  - Body: {name, vlan, criteria?}
- **DELETE /sdn/policies/<name>**: Delete a policy by name.

Headers: X-API-KEY (required for auth, e.g., `admin_api_key`).

Authentication: Simple API key; extend to JWT for production.