import React, { useEffect, useState } from 'react';
import api from '../api';
import { Paper, Typography, Box, Button, Stack } from '@mui/material';

function LogsViewer() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = () => {
    setLoading(true);
    api.get('/logs')
      .then(res => setLines(res.data?.logs || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Paper sx={{ p: 4, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">System Logs</Typography>
        <Button variant="outlined" onClick={loadLogs} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </Stack>
      <Box sx={{ background: '#0b0f19', color: '#e6e6e6', p: 2, borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
        <pre style={{ margin: 0 }}>{(lines || []).join('')}</pre>
      </Box>
    </Paper>
  );
}

export default LogsViewer;
