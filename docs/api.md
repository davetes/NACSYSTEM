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

Headers: X-API-KEY (required for auth, e.g., `admin_api_key`).

Authentication: Simple API key; extend to JWT for production.