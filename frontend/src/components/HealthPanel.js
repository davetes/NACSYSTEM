import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, Grid, Alert, Chip, Stack, CircularProgress, Typography } from '@mui/material';
import api from '../api';

// GET /api/health -> { controller: { status, version }, services: [{ name, status }], updatedAt }
// GET /api/alerts -> [{ severity, message, ts }]
export default function HealthPanel() {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [h, a] = await Promise.all([
          api.get('/api/health'),
          api.get('/api/alerts')
        ]);
        if (mounted) {
          setHealth(h.data);
          setAlerts(a.data || []);
        }
      } catch (e) {
        if (mounted) {
          setError('Live health/alerts unavailable. Showing demo.');
          setHealth({ controller: { status: 'DEGRADED', version: '0.1.0' }, services: [
            { name: 'topology-service', status: 'UP' },
            { name: 'intent-service', status: 'UP' },
            { name: 'flow-programmer', status: 'DOWN' },
          ], updatedAt: new Date().toISOString() });
          setAlerts([
            { severity: 'warning', message: 'High utilization on s1-sp link', ts: new Date().toISOString() },
            { severity: 'error', message: 'flow-programmer unreachable', ts: new Date().toISOString() }
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return (<Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /> Loading health...</Stack>);

  return (
    <Card>
      <CardHeader title="Health & Alerts" subheader={health?.updatedAt ? `Updated: ${new Date(health.updatedAt).toLocaleString()}` : ''} />
      <CardContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Controller</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={`Status: ${health?.controller?.status || '-'}`} color={health?.controller?.status === 'UP' ? 'success' : (health?.controller?.status === 'DEGRADED' ? 'warning' : 'error')} />
              <Chip label={`Version: ${health?.controller?.version || '-'}`} />
            </Stack>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Services</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {(health?.services || []).map(s => (
                <Chip key={s.name} label={`${s.name}: ${s.status}`} color={s.status === 'UP' ? 'success' : (s.status === 'DEGRADED' ? 'warning' : 'error')} />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1">Alerts</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {alerts.map((al, idx) => (
                <Alert key={idx} severity={al.severity}>{al.message} • {new Date(al.ts).toLocaleTimeString()}</Alert>
              ))}
              {!alerts.length && <Typography variant="body2">No active alerts.</Typography>}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
