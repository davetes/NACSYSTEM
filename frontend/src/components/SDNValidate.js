import React, { useState } from 'react';
import api from '../api';
import {
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Chip,
  Stack,
  Tabs,
  Tab,
  Alert,
  Divider,
} from '@mui/material';

function SDNValidate() {
  // Tab state: 0=MAC, 1=Intents, 2=Flows, 3=ACLs
  const [tab, setTab] = useState(0);

  // MAC validation state
  const [mac, setMac] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  // JSON validation state
  const [intents, setIntents] = useState('[\n  { "src": "hostA", "dst": "hostB", "allow": true }\n]');
  const [flows, setFlows] = useState('[\n  { "match": { "ipProto": 6, "dstPort": 443 }, "action": "FORWARD" }\n]');
  const [acls, setAcls] = useState('[\n  { "rule": "deny tcp any any eq 23", "description": "Block telnet" }\n]');
  const [jsonResult, setJsonResult] = useState(null);
  const [jsonMessage, setJsonMessage] = useState('');

  const handleValidateMac = async () => {
    setMessage('');
    setResult(null);
    try {
      const res = await api.get(`/sdn/validate/${mac}`);
      setResult(res.data);
    } catch (err) {
      setResult({ ok: false, error: err?.response?.data?.error || 'Request failed' });
    }
  };

  const handleEnforceMac = async () => {
    setMessage('');
    try {
      const res = await api.post(`/sdn/enforce/${mac}`);
      setMessage('Policy enforced successfully');
      setResult(res.data);
    } catch (err) {
      setMessage('Error: ' + (err?.response?.data?.error || 'Request failed'));
    }
  };

  const safeParse = (text) => {
    try { return [JSON.parse(text), null]; } catch (e) { return [null, e.message]; }
  };

  const handleValidateJSON = async (kind) => {
    setJsonMessage('');
    setJsonResult(null);
    const source = kind === 'intents' ? intents : kind === 'flows' ? flows : acls;
    const [parsed, parseErr] = safeParse(source);
    if (parseErr) {
      setJsonMessage(`Invalid JSON: ${parseErr}`);
      setJsonResult({ ok: false });
      return;
    }
    // Try backend validation endpoint per kind; if missing, simulate a pass with basic checks
    try {
      const endpoint = kind === 'intents' ? '/api/validate/intents' : kind === 'flows' ? '/api/validate/flows' : '/api/validate/acls';
      const res = await api.post(endpoint, parsed);
      setJsonResult(res.data || { ok: true });
    } catch (err) {
      // Basic heuristic checks as a fallback
      const issues = [];
      if (!Array.isArray(parsed)) issues.push('Payload should be an array.');
      const arr = Array.isArray(parsed) ? parsed : [];
      if (kind === 'intents') {
        arr.forEach((it, i) => {
          if (!it.src || !it.dst) issues.push(`Intent[${i}]: missing src/dst`);
        });
      } else if (kind === 'flows') {
        arr.forEach((f, i) => {
          if (!f.match || !f.action) issues.push(`Flow[${i}]: missing match/action`);
        });
      } else if (kind === 'acls') {
        arr.forEach((a, i) => {
          if (!a.rule) issues.push(`ACL[${i}]: missing rule`);
        });
      }
      setJsonResult({ ok: issues.length === 0, issues });
      setJsonMessage('Backend validator unavailable. Performed basic client-side checks.');
    }
  };

  const renderMacPanel = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Validate by MAC</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="MAC Address" value={mac} onChange={e => setMac(e.target.value)} fullWidth />
        <Button variant="contained" onClick={handleValidateMac}>Validate</Button>
        <Button variant="outlined" color="secondary" onClick={handleEnforceMac}>Enforce</Button>
      </Stack>
      {message && <Typography sx={{ mt: 2, color: message.startsWith('Error') ? 'error.main' : 'success.main' }}>{message}</Typography>}
      {result && (
        <Box sx={{ mt: 2 }}>
          {result.authorized !== undefined && (
            <Chip label={result.authorized ? 'AUTHORIZED' : 'BLOCKED'} color={result.authorized ? 'success' : 'error'} sx={{ mb: 2 }} />
          )}
          <Typography variant="body2" component="div">
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderJsonPanel = (title, kind, value, setValue, helper) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{title}</Typography>
      <TextField
        value={value}
        onChange={e => setValue(e.target.value)}
        multiline
        minRows={8}
        fullWidth
        placeholder="Paste JSON array..."
        helperText={helper}
      />
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={() => handleValidateJSON(kind)}>Validate</Button>
      </Stack>
      {jsonMessage && <Alert sx={{ mt: 2 }} severity="warning">{jsonMessage}</Alert>}
      {jsonResult && (
        <Box sx={{ mt: 2 }}>
          <Chip label={jsonResult.ok ? 'OK' : 'ISSUES FOUND'} color={jsonResult.ok ? 'success' : 'warning'} sx={{ mb: 2 }} />
          {jsonResult.issues && jsonResult.issues.length > 0 && (
            <Box>
              {jsonResult.issues.map((is, i) => (
                <Typography key={i} variant="body2">- {is}</Typography>
              ))}
            </Box>
          )}
          {!jsonResult.issues && (
            <Typography variant="body2" color="text.secondary">Validator response shown below (if any):</Typography>
          )}
          <Typography variant="body2" component="div">
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(jsonResult, null, 2)}</pre>
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Paper sx={{ p: 4, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>SDN Validate</Typography>
      <Typography variant="body2" color="text.secondary">Validate configuration and policies before applying. Prevent misconfigurations in intents, flows, and ACLs.</Typography>
      <Divider sx={{ my: 2 }} />
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="MAC Policy" />
        <Tab label="Intents" />
        <Tab label="Flows" />
        <Tab label="ACLs" />
      </Tabs>
      {tab === 0 && renderMacPanel()}
      {tab === 1 && renderJsonPanel('Validate Intents JSON', 'intents', intents, setIntents, 'Array of intents, e.g., [{ "src": "hostA", "dst": "hostB", "allow": true }]')}
      {tab === 2 && renderJsonPanel('Validate Flows JSON', 'flows', flows, setFlows, 'Array of flows, e.g., [{ "match": { ... }, "action": "FORWARD" }]')}
      {tab === 3 && renderJsonPanel('Validate ACLs JSON', 'acls', acls, setAcls, 'Array of ACL rules, e.g., [{ "rule": "deny tcp any any eq 23" }]')}
    </Paper>
  );
}

export default SDNValidate;
