import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Typography, Box, Paper } from '@mui/material';

function ManageDevices() {
  const [mac, setMac] = useState('');
  const [username, setUsername] = useState('');
  const [vlan, setVlan] = useState('');
  const [message, setMessage] = useState('');

  const handleAdd = () => {
    axios.post('/devices', { mac, username, vlan }, {
      headers: { 'X-API-KEY': 'admin_api_key' }
    })
      .then(() => setMessage('Device added successfully!'))
      .catch(err => setMessage('Error: ' + err.response.data.error));
  };

  const handleDelete = () => {
    axios.delete(`/devices/${mac}`, {
      headers: { 'X-API-KEY': 'admin_api_key' }
    })
      .then(() => setMessage('Device deleted successfully!'))
      .catch(err => setMessage('Error: ' + err.response.data.error));
  };

  return (
    <Paper sx={{ p: 4, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Devices</Typography>
      <TextField label="MAC" value={mac} onChange={e => setMac(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="VLAN" value={vlan} onChange={e => setVlan(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="contained" color="primary" onClick={handleAdd}>Add Device</Button>
        <Button variant="outlined" color="secondary" onClick={handleDelete}>Delete Device</Button>
      </Box>
      <Typography sx={{ mt: 2, color: message.includes('Error') ? 'red' : 'green' }}>{message}</Typography>
    </Paper>
  );
}

export default ManageDevices;