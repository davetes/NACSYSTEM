import React, { useEffect, useState } from 'react';
import api from '../api';
import { Paper, Typography, TextField, Button, Box, Stack, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

function Policies() {
  const [policies, setPolicies] = useState([]);
  const [name, setName] = useState('');
  const [vlan, setVlan] = useState('');
  const [criteria, setCriteria] = useState('{}');
  const [message, setMessage] = useState('');

  const loadPolicies = () => {
    api.get('/sdn/policies')
      .then(res => setPolicies(res.data || []))
      .catch(() => setMessage('Error loading policies'));
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleUpsert = () => {
    setMessage('');
    let parsedCriteria = {};
    try {
      parsedCriteria = criteria ? JSON.parse(criteria) : {};
    } catch (e) {
      setMessage('Error: criteria must be valid JSON');
      return;
    }
    api.post('/sdn/policies', { name, vlan, criteria: parsedCriteria })
      .then(() => { setMessage('Saved'); setName(''); setVlan(''); setCriteria('{}'); loadPolicies(); })
      .catch(err => setMessage('Error: ' + (err?.response?.data?.error || 'Request failed')));
  };

  const handleDelete = (n) => {
    setMessage('');
    api.delete(`/sdn/policies/${encodeURIComponent(n)}`)
      .then(() => { setMessage('Deleted'); loadPolicies(); })
      .catch(err => setMessage('Error: ' + (err?.response?.data?.error || 'Request failed')));
  };

  return (
    <Paper sx={{ p: 4, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Policies</Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
        <TextField label="VLAN" value={vlan} onChange={e => setVlan(e.target.value)} type="number" fullWidth />
        <TextField label="Criteria (JSON)" value={criteria} onChange={e => setCriteria(e.target.value)} fullWidth />
        <Button variant="contained" onClick={handleUpsert}>Save</Button>
      </Stack>

      {message && <Typography sx={{ mb: 2, color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</Typography>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>VLAN</TableCell>
            <TableCell>Criteria</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {policies.map((p) => (
            <TableRow key={p.name}>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.vlan}</TableCell>
              <TableCell><pre style={{ margin: 0 }}>{JSON.stringify(p.criteria || {}, null, 2)}</pre></TableCell>
              <TableCell align="right">
                <Button color="error" onClick={() => handleDelete(p.name)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
          {policies.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}><Typography>No policies</Typography></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default Policies;
