import React, { useEffect, useState } from 'react';
import api from '../api';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button, CircularProgress, Box } from '@mui/material';
import { PieChart, Pie, Tooltip, Legend, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const devicesRes = await api.get('/devices');
      setDevices(devicesRes.data);
      const logsRes = await api.get('/logs');
      setLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Pie chart data
  const deviceData = [
    { name: 'Authorized', value: devices.length },
    { name: 'Unauthorized', value: logs.filter(l => l.includes('Unauthorized')).length },
  ];
  const COLORS = ['#4caf50', '#f44336'];

  // Line chart data for log trends
  const logData = logs.reduce((acc, log) => {
    const date = log.split(' - ')[0] || 'Unknown';
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});
  const lineData = Object.keys(logData).map(key => ({ date: key, logs: logData[key] }));

  return (
    <Box>
      {loading ? <CircularProgress /> : (
        <>
          <Typography variant="h5">SDN-Controlled Authorized Devices</Typography>
          <TableContainer component={Paper} sx={{ mt: 2, mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>MAC</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>VLAN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map(device => (
                  <TableRow key={device.mac}>
                    <TableCell>{device.mac}</TableCell>
                    <TableCell>{device.username}</TableCell>
                    <TableCell>{device.vlan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h5">SDN Device Stats</Typography>
          <PieChart width={400} height={400}>
            <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" outerRadius={100} label>
              {deviceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>

          <Typography variant="h5" sx={{ mt: 4 }}>Log Trends</Typography>
          <LineChart width={600} height={300} data={lineData}>
            <XAxis dataKey="date" />
            <YAxis />
            <CartesianGrid stroke="#eee" />
            <Line type="monotone" dataKey="logs" stroke="#1976d2" />
          </LineChart>

          <Typography variant="h5" sx={{ mt: 4 }}>Logs</Typography>
          <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5' }}>
            {logs.map((log, index) => (
              <Typography key={index} sx={{ color: log.includes('Allowed') ? 'green' : 'red' }}>{log}</Typography>
            ))}
          </Paper>

          <Button variant="contained" onClick={fetchData} sx={{ mt: 2 }}>Refresh</Button>
        </>
      )}
    </Box>
  );
}

export default Dashboard;