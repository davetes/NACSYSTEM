import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Tooltip,
  Badge,
  Paper,
} from '@mui/material';
import LanIcon from '@mui/icons-material/Lan';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import RouterIcon from '@mui/icons-material/Router';
import LinkIcon from '@mui/icons-material/Link';
import CircleIcon from '@mui/icons-material/Circle';
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
    <Card sx={{ overflow: 'hidden' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6">Topology</Typography>
            <Badge color="primary" badgeContent={data?.devices?.length || 0} sx={{ '& .MuiBadge-badge': { right: -8 } }}>
              <LanIcon fontSize="small" />
            </Badge>
          </Stack>
        }
        subheader={data?.updatedAt ? `Updated: ${new Date(data.updatedAt).toLocaleString()}` : ''}
      />
      <Divider />
      <CardContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {!data ? (
          <Typography variant="body2">No topology data.</Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Devices</Typography>
                  <Chip size="small" label={`Spine`} color="primary" variant="outlined" sx={{ height: 22 }} />
                  <Chip size="small" label={`Leaf`} variant="outlined" sx={{ height: 22 }} />
                </Stack>
                <List dense>
                  {[...data.devices].sort((a,b)=> (a.role||'').localeCompare(b.role||'') || (a.name||'').localeCompare(b.name||'')).map(d => (
                    <ListItem key={d.id} disableGutters>
                      <ListItemAvatar>
                        <Tooltip title={d.role === 'spine' ? 'Spine' : 'Leaf'}>
                          <Avatar sx={{ bgcolor: d.role === 'spine' ? 'primary.main' : 'grey.100', color: d.role === 'spine' ? 'primary.contrastText' : 'text.primary' }}>
                            {d.role === 'spine' ? <DeviceHubIcon /> : <RouterIcon />}
                          </Avatar>
                        </Tooltip>
                      </ListItemAvatar>
                      <ListItemText
                        primary={d.name}
                        secondary={`ID: ${d.id} • Role: ${d.role}`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Links</Typography>
                  <Chip size="small" label="Utilization" variant="outlined" sx={{ height: 22 }} icon={<LinkIcon fontSize="small" />} />
                </Stack>
                <Stack spacing={1.25}>
                  {data.links.map((l, idx) => {
                    const color = l.utilization > 70 ? 'error.main' : (l.utilization > 40 ? 'warning.main' : 'success.main');
                    return (
                      <Box key={idx}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption">{l.src} ⇄ {l.dst}</Typography>
                          <Typography variant="caption">{l.utilization}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, l.utilization))} sx={{ height: 8, borderRadius: 5, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Adjacency</Typography>
                <Stack spacing={0.75}>
                  {Object.entries(adjacency).map(([k, v]) => (
                    <Typography key={k} variant="body2">
                      <CircleIcon sx={{ fontSize: 8, mr: 1, color: 'text.disabled', verticalAlign: 'middle' }} />
                      {k} ↔ {v.join(', ') || '-'}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
