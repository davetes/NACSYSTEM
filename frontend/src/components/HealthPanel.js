import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Alert,
  Chip,
  Stack,
  CircularProgress,
  Typography,
  Divider,
  LinearProgress,
  Badge,
  Tooltip,
  IconButton,
  Box,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HistoryIcon from '@mui/icons-material/History';
import api from '../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

// GET /api/health -> { controller: { status, version }, services: [{ name, status }], updatedAt }
// GET /api/alerts -> [{ severity, message, ts }]
export default function HealthPanel() {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyData, setHistoryData] = useState([]); // demo performance history

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
    // Demo history data (latency/throughput over time)
    const base = Date.now();
    const demo = Array.from({ length: 20 }, (_, i) => ({
      t: new Date(base - (19 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latency: Math.round(10 + Math.random() * 30 + (i % 5 === 0 ? 15 : 0)),
      throughput: Math.round(400 + Math.random() * 200 - (i % 6 === 0 ? 120 : 0)),
    }));
    setHistoryData(demo);
    return () => { mounted = false; };
  }, []);

  if (loading) return (<Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /> Loading health...</Stack>);

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">Health & Alerts</Typography>
            <Badge color={alerts.length ? 'error' : 'success'} badgeContent={alerts.length} sx={{ '& .MuiBadge-badge': { right: -8 } }}>
              <NotificationsActiveIcon fontSize="small" />
            </Badge>
          </Stack>
        }
        subheader={health?.updatedAt ? `Updated: ${new Date(health.updatedAt).toLocaleString()}` : ''}
        action={
          <Tooltip title="Historical health">
            <IconButton size="small">
              <HistoryIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Divider />
      <CardContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="text.secondary">Controller</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                {health?.controller?.status === 'UP' && <CheckCircleIcon color="success" />}
                {health?.controller?.status === 'DEGRADED' && <WarningAmberIcon color="warning" />}
                {(!health?.controller?.status || health?.controller?.status === 'DOWN') && <ErrorIcon color="error" />}
                <Chip
                  size="small"
                  label={`Status: ${health?.controller?.status || '-'}`}
                  color={health?.controller?.status === 'UP' ? 'success' : (health?.controller?.status === 'DEGRADED' ? 'warning' : 'error')}
                  variant="outlined"
                />
                <Chip size="small" label={`Version: ${health?.controller?.version || '-'}`} />
              </Stack>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Resources</Typography>
                <Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="caption">CPU</Typography><Typography variant="caption">{Math.min(95, 30 + alerts.length * 5)}%</Typography></Stack>
                  <LinearProgress variant="determinate" value={Math.min(95, 30 + alerts.length * 5)} sx={{ height: 8, borderRadius: 5 }} />
                </Stack>
                <Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Memory</Typography><Typography variant="caption">{Math.min(95, 45 + alerts.length * 3)}%</Typography></Stack>
                  <LinearProgress color="secondary" variant="determinate" value={Math.min(95, 45 + alerts.length * 3)} sx={{ height: 8, borderRadius: 5 }} />
                </Stack>
                <Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Bandwidth</Typography><Typography variant="caption">{Math.min(95, 55 + alerts.length * 2)}%</Typography></Stack>
                  <LinearProgress color="info" variant="determinate" value={Math.min(95, 55 + alerts.length * 2)} sx={{ height: 8, borderRadius: 5 }} />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}`, mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Services</Typography>
              <Stack spacing={1} direction="row" flexWrap="wrap" useFlexGap>
                {(health?.services || []).map(s => (
                  <Chip
                    key={s.name}
                    label={`${s.name}: ${s.status}`}
                    color={s.status === 'UP' ? 'success' : (s.status === 'DEGRADED' ? 'warning' : 'error')}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}` }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Alerts</Typography>
              <Stack spacing={1.2}>
                {alerts.map((al, idx) => (
                  <Alert key={idx} severity={al.severity} variant="outlined" sx={{ alignItems: 'center' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                      <Typography variant="body2">{al.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(al.ts).toLocaleTimeString()}</Typography>
                    </Stack>
                  </Alert>
                ))}
                {!alerts.length && <Typography variant="body2">No active alerts.</Typography>}
              </Stack>
            </Box>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: theme => `1px solid ${theme.palette.divider}`, mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Network Performance</Typography>
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f44336" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} orientation="left" domain={[0, 'dataMax + 20']} />
                    <YAxis yAxisId="right" tick={{ fontSize: 10 }} orientation="right" domain={[0, 'dataMax + 200']} />
                    <RechartsTooltip formatter={(value, name) => [value, name === 'latency' ? 'Latency (ms)' : 'Throughput (Mbps)']} />
                    <Area yAxisId="left" type="monotone" dataKey="latency" stroke="#f44336" fillOpacity={1} fill="url(#colorLatency)" />
                    <Area yAxisId="right" type="monotone" dataKey="throughput" stroke="#1976d2" fillOpacity={1} fill="url(#colorThroughput)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
