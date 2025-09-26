import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import { PieChart, Pie, Tooltip, Legend, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, logsRes] = await Promise.all([
        api.get('/devices'),
        api.get('/logs'),
      ]);
      setDevices(devicesRes.data || []);
      setLogs(logsRes.data?.logs || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kpis = useMemo(() => {
    const total = devices.length;
    const authorized = devices.filter(d => d.authorized).length;
    const unauthorized = Math.max(0, total - authorized);
    const recentErrors = logs.filter(l => /error|unauthorized|denied/i.test(l)).length;
    return { total, authorized, unauthorized, recentErrors };
  }, [devices, logs]);

  const pieData = useMemo(() => ([
    { name: 'Authorized', value: kpis.authorized },
    { name: 'Unauthorized', value: kpis.unauthorized },
  ]), [kpis]);
  const COLORS = ['#2e7d32', '#c62828'];

  const lineData = useMemo(() => {
    const acc = logs.reduce((map, log) => {
      const date = (log.split(' - ')[0] || '').trim() || 'Unknown';
      map[date] = (map[date] || 0) + 1;
      return map;
    }, {});
    return Object.keys(acc).map(date => ({ date, logs: acc[date] }));
  }, [logs]);

  return (
    <Box>
      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={20} /> Loading dashboard...</Stack>
      ) : (
        <Grid container spacing={3}>
          {/* KPI Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Total Devices" />
              <CardContent>
                <Typography variant="h3">{kpis.total}</Typography>
                <Typography variant="body2" color="text.secondary">Managed by SDN</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Authorized" />
              <CardContent>
                <Typography variant="h3" color="success.main">{kpis.authorized}</Typography>
                <Typography variant="body2" color="text.secondary">Currently allowed</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Unauthorized" />
              <CardContent>
                <Typography variant="h3" color="error.main">{kpis.unauthorized}</Typography>
                <Typography variant="body2" color="text.secondary">Require attention</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Recent Alerts" />
              <CardContent>
                <Typography variant="h3" color={kpis.recentErrors ? 'warning.main' : 'text.primary'}>
                  {kpis.recentErrors}
                </Typography>
                <Typography variant="body2" color="text.secondary">Errors/denies in logs</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Devices Table */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardHeader title="Devices" subheader="MAC • Username • VLAN • Status" action={<Button onClick={fetchData}>Refresh</Button>} />
              <CardContent>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>MAC</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell align="right">VLAN</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {devices.map(device => (
                        <TableRow key={device.mac}>
                          <TableCell>{device.mac}</TableCell>
                          <TableCell>{device.username}</TableCell>
                          <TableCell align="right">{device.vlan}</TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={device.authorized ? 'Authorized' : 'Blocked'} color={device.authorized ? 'success' : 'error'} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {!devices.length && (
                        <TableRow><TableCell colSpan={4} align="center">No devices found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Device Authorization" subheader="Authorized vs Unauthorized" />
              <CardContent>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary">Log Volume (by date)</Typography>
                <Box sx={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={lineData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <CartesianGrid stroke="#eee" />
                      <Line type="monotone" dataKey="logs" stroke="#1976d2" strokeWidth={2} dot={false} />
                      <Tooltip />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Logs */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Recent Logs" subheader="Latest controller and policy events" />
              <CardContent>
                <Paper sx={{ p: 2, maxHeight: 320, overflow: 'auto', bgcolor: '#fafafa', border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={0.5}>
                    {logs.map((log, index) => {
                      const isOk = /allow|authorized|up/i.test(log);
                      const isWarn = /warn|degraded/i.test(log);
                      const color = isOk ? 'success.main' : (isWarn ? 'warning.main' : 'error.main');
                      return (
                        <Typography key={index} sx={{ color }}>{log}</Typography>
                      );
                    })}
                    {!logs.length && <Typography color="text.secondary">No logs available.</Typography>}
                  </Stack>
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;