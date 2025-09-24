import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Box,
  Divider,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../api';

// GET /api/flows?deviceId=... -> [{ id, deviceId, match, action, priority }]
export default function FlowTable() {
  const [deviceId, setDeviceId] = useState('');
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSec, setIntervalSec] = useState(15);

  const load = async () => {
    setLoading(true);
    let mounted = true;
    try {
      const res = await api.get('/api/flows', { params: deviceId ? { deviceId } : {} });
      if (mounted) setFlows(res.data || []);
    } catch (e) {
      if (mounted) {
        setError('Live flows unavailable. Showing demo.');
        setFlows([
          { id: 'f1', deviceId: 's1', match: 'ip,nw_src=10.0.0.1,nw_dst=10.0.0.2', action: 'OUTPUT:2', priority: 100 },
          { id: 'f2', deviceId: 's2', match: 'arp', action: 'NORMAL', priority: 10 },
          { id: 'f3', deviceId: 's1', match: 'tcp,tp_dst=443', action: 'MOD_NW_TTL:64,OUTPUT:3', priority: 80 },
        ]);
      }
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [deviceId]);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => { load(); }, Math.max(5, Number(intervalSec)) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec, deviceId]);

  const devices = useMemo(() => Array.from(new Set(flows.map(f => f.deviceId))).sort(), [flows]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flows.filter(f => {
      if (!q) return true;
      return (
        String(f.id).toLowerCase().includes(q) ||
        String(f.deviceId).toLowerCase().includes(q) ||
        String(f.match).toLowerCase().includes(q) ||
        String(f.action).toLowerCase().includes(q)
      );
    });
  }, [flows, query]);

  const actionChips = (action) => {
    if (!action) return null;
    const parts = String(action).split(',').map(s => s.trim()).filter(Boolean);
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {parts.map((p, i) => {
          let color = 'default';
          if (p.startsWith('OUTPUT')) color = 'primary';
          else if (p.startsWith('DROP') || p === 'NORMAL' && p !== 'OUTPUT') color = p.startsWith('DROP') ? 'error' : 'secondary';
          else if (p.startsWith('MOD_') || p.includes('SET_')) color = 'info';
          return <Chip key={i} size="small" label={p} color={color} variant="outlined" />;
        })}
      </Stack>
    );
  };

  const priorityChip = (val) => {
    const v = Number(val) || 0;
    const color = v >= 100 ? 'error' : v >= 50 ? 'warning' : 'success';
    const label = v >= 100 ? `High (${v})` : v >= 50 ? `Medium (${v})` : `Low (${v})`;
    return <Chip size="small" label={label} color={color} variant="outlined" />;
  };

  return (
    <Card>
      <CardHeader title="Flow Table" subheader="View current flow entries with match conditions and actions" />
      <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="warning">{error}</Alert>}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Device</InputLabel>
              <Select label="Device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} displayEmpty>
                <MenuItem value=""><em>All devices</em></MenuItem>
                {devices.map(d => (<MenuItem key={d} value={d}>{d}</MenuItem>))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Search flows"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
              sx={{ flex: 1 }}
            />
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh"><span><IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton></span></Tooltip>
              <Tooltip title="Download CSV">
                <IconButton onClick={() => {
                  const header = ['id','deviceId','match','action','priority'];
                  const csv = [header.join(',')].concat(rows.map(r => header.map(h => '"' + String(r[h] ?? '').replace(/"/g,'""') + '"').join(','))).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `flows-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <TextField size="small" type="number" label="Interval (s)" value={intervalSec} onChange={(e)=>setIntervalSec(e.target.value)} sx={{ width: 130 }} />
              <Button size="small" variant={autoRefresh ? 'contained':'outlined'} onClick={()=>setAutoRefresh(a=>!a)}>{autoRefresh ? 'Auto On':'Auto Off'}</Button>
            </Stack>
          </Stack>
          <Divider />
          {loading ? (
            <Stack direction="row" alignItems="center" spacing={1}><CircularProgress size={20} /> Loading...</Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Match</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell align="right">Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell>{f.id}</TableCell>
                    <TableCell>{f.deviceId}</TableCell>
                    <TableCell>
                      <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, bgcolor: 'grey.50', border: theme=>`1px solid ${theme.palette.divider}`, px: 1, py: 0.5, borderRadius: 1 }}>
                        {f.match}
                      </Box>
                    </TableCell>
                    <TableCell>{actionChips(f.action)}</TableCell>
                    <TableCell align="right">{priorityChip(f.priority)}</TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow><TableCell colSpan={5}>No flows found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
