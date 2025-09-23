// Simple mock SDN API for local development
// Run on port 5000 so CRA proxy forwards /api requests

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();

// In-memory demo state
let topology = {
  devices: [
    { id: 's1', name: 'Leaf-1', role: 'leaf' },
    { id: 's2', name: 'Leaf-2', role: 'leaf' },
    { id: 'sp', name: 'Spine-1', role: 'spine' },
  ],
  links: [
    { src: 's1', dst: 'sp', utilization: 23 },
    { src: 's2', dst: 'sp', utilization: 11 },
  ],
  updatedAt: now(),
};

let flows = [
  { id: 'f1', deviceId: 's1', match: 'ip,nw_src=10.0.0.1,nw_dst=10.0.0.2', action: 'OUTPUT:2', priority: 100 },
  { id: 'f2', deviceId: 's2', match: 'arp', action: 'NORMAL', priority: 10 },
];

let intents = [];

let health = {
  controller: { status: 'DEGRADED', version: '0.1.0' },
  services: [
    { name: 'topology-service', status: 'UP' },
    { name: 'intent-service', status: 'UP' },
    { name: 'flow-programmer', status: 'DOWN' },
  ],
  updatedAt: now(),
};

let alerts = [
  { severity: 'warning', message: 'High utilization on s1-sp link', ts: now() },
  { severity: 'error', message: 'flow-programmer unreachable', ts: now() },
];

// MAC registry
let macs = [
  { mac: 'AA:BB:CC:DD:EE:01', desc: 'Demo device', tenant: 'default', createdAt: now() }
];

// Routes
app.get('/api/topology', (req, res) => {
  topology.updatedAt = now();
  res.json(topology);
});

app.post('/api/intents', (req, res) => {
  const { src, dst, constraints = {}, tenant = 'default' } = req.body || {};
  if (!src || !dst) {
    return res.status(400).json({ error: 'src and dst are required' });
  }
  const id = `intent-${intents.length + 1}`;
  const intent = { id, src, dst, constraints, tenant, status: 'ACCEPTED', createdAt: now() };
  intents.push(intent);
  // naive: add a flow as a side effect
  flows.push({ id: `f${flows.length + 1}`, deviceId: 's1', match: `ip,nw_src=${src},nw_dst=${dst}`, action: 'OUTPUT:2', priority: 100 });
  res.json({ id, status: 'ACCEPTED', compiledFlows: 1 });
});

app.get('/api/flows', (req, res) => {
  const { deviceId } = req.query || {};
  const data = deviceId ? flows.filter(f => f.deviceId === deviceId) : flows;
  res.json(data);
});

app.get('/api/health', (req, res) => {
  health.updatedAt = now();
  res.json(health);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

// MAC endpoints
app.get('/api/mac', (req, res) => {
  res.json(macs);
});

app.post('/api/mac', (req, res) => {
  const { mac, desc = '', tenant = 'default' } = req.body || {};
  if (!mac) return res.status(400).json({ error: 'mac is required' });
  const macNorm = String(mac).trim();
  if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(macNorm)) {
    return res.status(400).json({ error: 'Invalid MAC format. Use XX:XX:XX:XX:XX:XX' });
  }
  if (macs.find(m => m.mac.toLowerCase() === macNorm.toLowerCase())) {
    return res.status(409).json({ error: 'MAC already exists' });
  }
  const entry = { mac: macNorm.toUpperCase(), desc, tenant, createdAt: now() };
  macs.push(entry);
  return res.json({ ok: true, mac: entry });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock SDN API listening on http://localhost:${PORT}`);
});
