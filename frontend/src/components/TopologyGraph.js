import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardHeader, CardContent, Typography, Chip, Stack, CircularProgress, Alert } from '@mui/material';
import api from '../api';

// Simple topology list/adjacency view as a placeholder (no canvas)
// Expects backend GET /api/topology returning { devices: [{id,name,role}], links: [{src,dst,utilization}], updatedAt }
export default function TopologyGraph() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/topology');
        if (mounted) {
          setData(res.data);
        }
      } catch (e) {
        // Fallback demo data
        if (mounted) {
          setError('Live topology unavailable. Showing demo.');
          setData({
            devices: [
              { id: 's1', name: 'Leaf-1', role: 'leaf' },
              { id: 's2', name: 'Leaf-2', role: 'leaf' },
              { id: 'sp', name: 'Spine-1', role: 'spine' },
            ],
            links: [
              { src: 's1', dst: 'sp', utilization: 23 },
              { src: 's2', dst: 'sp', utilization: 11 },
            ],
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const adjacency = useMemo(() => {
    if (!data) return {};
    const map = {};
    for (const d of data.devices) map[d.id] = [];
    for (const l of data.links) {
      map[l.src]?.push(l.dst);
      map[l.dst]?.push(l.src);
    }
    return map;
  }, [data]);

  if (loading) return (<Box p={2}><CircularProgress size={24} /> Loading topology...</Box>);

  return (
    <Card>
      <CardHeader title="Topology" subheader={data?.updatedAt ? `Updated: ${new Date(data.updatedAt).toLocaleString()}` : ''} />
      <CardContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {!data ? (
          <Typography variant="body2">No topology data.</Typography>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>Devices</Typography>
              <Stack spacing={1}>
                {data.devices.map(d => (
                  <Chip key={d.id} label={`${d.name} (${d.role})`} color={d.role === 'spine' ? 'primary' : 'default'} />
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle1" gutterBottom>Adjacency</Typography>
              <Stack spacing={1}>
                {Object.entries(adjacency).map(([k, v]) => (
                  <Typography key={k} variant="body2">
                    {k} ↔ {v.join(', ') || '-'}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle1" gutterBottom>Links</Typography>
              <Stack spacing={1}>
                {data.links.map((l, idx) => (
                  <Chip key={idx} label={`${l.src} ⇄ ${l.dst} • ${l.utilization}%`} color={l.utilization > 70 ? 'error' : (l.utilization > 40 ? 'warning' : 'success')} />
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
