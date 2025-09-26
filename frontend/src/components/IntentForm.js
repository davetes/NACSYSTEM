import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Typography,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Box,
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import api from '../api';

// POST /api/intents { src, dst, constraints, tenant }
export default function IntentForm() {
  const [form, setForm] = useState({ src: '', dst: '', constraints: '', tenant: 'default' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Constraint builder fields (optional, serialize into constraints JSON)
  const [allow, setAllow] = useState(true);
  const [bandwidth, setBandwidth] = useState(''); // Mbps
  const [latency, setLatency] = useState(''); // e.g., <5ms or 5ms
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    // Keep constraints JSON synced if builder is used
    const c = {};
    if (allow === false) c.allow = false; // default true
    if (bandwidth) c.bandwidth = Number(bandwidth);
    if (latency) c.latency = latency; // free text like "<5ms"
    if (priority && priority !== 'normal') c.priority = priority;
    const hasAny = Object.keys(c).length > 0;
    setForm(prev => ({ ...prev, constraints: hasAny ? JSON.stringify(c) : prev.constraints }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allow, bandwidth, latency, priority]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const payload = useMemo(() => {
    let constraints = {};
    try { constraints = form.constraints ? JSON.parse(form.constraints) : {}; } catch {}
    return { src: form.src, dst: form.dst, constraints, tenant: form.tenant };
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payloadToSend = { ...payload };
      const res = await api.post('/api/intents', payloadToSend);
      setResult(res.data);
    } catch (err) {
      // demo fallback
      setError('Live controller not reachable. Returning demo intent result.');
      setResult({ id: 'demo-intent-1', status: 'ACCEPTED', compiledFlows: 5 });
    } finally {
      setLoading(false);
    }
  };

  const setExample = (src, dst) => setForm(f => ({ ...f, src, dst }));

  return (
    <Card>
      <CardHeader
        title="Create Intent"
        subheader="High-level policy: e.g., Allow traffic between Host A and Host B. Controller compiles flows automatically."
      />
      <CardContent>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="warning">{error}</Alert>}

            <Typography variant="subtitle2" color="text.secondary">Quick examples</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="hostA ⇄ hostB" onClick={() => setExample('hostA','hostB')} icon={<SwapHorizIcon />} variant="outlined" />
              <Chip label="web-tier → db-tier" onClick={() => setExample('web-tier','db-tier')} icon={<RouteIcon />} variant="outlined" />
              <Chip label="client → api-gateway" onClick={() => setExample('client','api-gateway')} icon={<RouteIcon />} variant="outlined" />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Source"
                name="src"
                value={form.src}
                onChange={onChange}
                placeholder="e.g., hostA"
                required
                InputProps={{ startAdornment: (<InputAdornment position="start"><RouteIcon fontSize="small" /></InputAdornment>) }}
              />
              <TextField
                fullWidth
                label="Destination"
                name="dst"
                value={form.dst}
                onChange={onChange}
                placeholder="e.g., hostB"
                required
                InputProps={{ startAdornment: (<InputAdornment position="start"><RouteIcon fontSize="small" /></InputAdornment>) }}
              />
            </Stack>

            <Divider textAlign="left">Constraint builder (optional)</Divider>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel control={<Switch checked={allow} onChange={(e) => setAllow(e.target.checked)} />} label={allow ? 'Allow' : 'Deny'} />
              <TextField
                label="Bandwidth"
                placeholder="Mbps"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value.replace(/[^0-9]/g,''))}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SpeedIcon fontSize="small" /></InputAdornment>) }}
                sx={{ maxWidth: 180 }}
              />
              <TextField
                label="Latency"
                placeholder="e.g., <5ms"
                value={latency}
                onChange={(e) => setLatency(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><AccessTimeIcon fontSize="small" /></InputAdornment>) }}
                sx={{ maxWidth: 200 }}
              />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                  startAdornment={<InputAdornment position="start"><PriorityHighIcon fontSize="small" /></InputAdornment>}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField
              fullWidth
              label="Constraints (JSON)"
              name="constraints"
              value={form.constraints}
              onChange={onChange}
              placeholder='e.g., {"bandwidth":100, "latency":"<5ms"}'
              helperText="You can edit raw JSON or use the builder above"
            />
            <TextField fullWidth label="Tenant" name="tenant" value={form.tenant} onChange={onChange} />

            <Divider textAlign="left">Preview</Divider>
            <Box sx={{ bgcolor: 'grey.100', border: theme => `1px solid ${theme.palette.divider}`, p: 2, borderRadius: 1 }}>
              <pre style={{ margin: 0 }}>{JSON.stringify(payload, null, 2)}</pre>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? (<><CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> Submitting...</>) : 'Submit Intent'}
              </Button>
              {result && (
                <Alert severity="success" sx={{ flex: 1 }}>
                  Intent {result.id || 'created'} • status: {result.status || 'ACCEPTED'} • flows: {result.compiledFlows ?? '-'}
                </Alert>
              )}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
