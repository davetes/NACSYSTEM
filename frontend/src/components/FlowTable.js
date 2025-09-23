import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, TextField, Table, TableHead, TableRow, TableCell, TableBody, Stack, Alert, CircularProgress } from '@mui/material';
import api from '../api';

// GET /api/flows?deviceId=... -> [{ id, deviceId, match, action, priority }]
export default function FlowTable() {
  const [deviceId, setDeviceId] = useState('');
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/flows', { params: deviceId ? { deviceId } : {} });
        if (mounted) setFlows(res.data || []);
      } catch (e) {
        if (mounted) {
          setError('Live flows unavailable. Showing demo.');
          setFlows([
            { id: 'f1', deviceId: 's1', match: 'ip,nw_src=10.0.0.1,nw_dst=10.0.0.2', action: 'OUTPUT:2', priority: 100 },
            { id: 'f2', deviceId: 's2', match: 'arp', action: 'NORMAL', priority: 10 },
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [deviceId]);

  const rows = useMemo(() => flows, [flows]);

  return (
    <Card>
      <CardHeader title="Flow Table" subheader="View current programmed flows" />
      <CardContent>
        <Stack spacing={2}>
          {error && <Alert severity="warning">{error}</Alert>}
          <TextField label="Filter by deviceId" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g., s1" />
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
                  <TableRow key={f.id}>
                    <TableCell>{f.id}</TableCell>
                    <TableCell>{f.deviceId}</TableCell>
                    <TableCell>{f.match}</TableCell>
                    <TableCell>{f.action}</TableCell>
                    <TableCell align="right">{f.priority}</TableCell>
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
