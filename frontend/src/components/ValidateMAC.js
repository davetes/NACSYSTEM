import React, { useState } from 'react';
import api from '../api';
import { TextField, Button, Typography, Paper, Box, Chip } from '@mui/material';

function ValidateMAC() {
  const [mac, setMac] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = () => {
    api.get(`/validate/${mac}`)
      .then(res => setResult(res.data))
      .catch(err => setResult({ error: err?.response?.data?.error || 'Request failed' }));
  };

  return (
    <Paper sx={{ p: 4, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Validate MAC Address</Typography>
      <TextField label="MAC Address" value={mac} onChange={e => setMac(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <Button variant="contained" onClick={handleSubmit} fullWidth>Validate</Button>
      {result && (
        <Box sx={{ mt: 2 }}>
          {result.authorized !== undefined && (
            <Chip
              label={result.authorized ? 'AUTHORIZED' : 'BLOCKED'}
              color={result.authorized ? 'success' : 'error'}
              sx={{ mb: 2 }}
            />
          )}
          <Typography variant="body1">
            <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>{JSON.stringify(result, null, 2)}</pre>
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ValidateMAC;