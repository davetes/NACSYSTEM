import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, Stack, TextField, Button, Alert, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import api from '../api';

// Uses Flask backend endpoints:
//  - GET /devices -> [{ mac, username, authorized, vlan }]
//  - POST /devices { mac, username, vlan }
export default function MacAddressForm() {
  const [form, setForm] = useState({ mac: '', username: '', vlan: '' });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Normalize many MAC formats to AA:BB:CC:DD:EE:FF, return null if invalid
  const normalizeMac = (value) => {
    if (!value) return null;
    // Remove common separators and non-hex characters
    const hex = String(value).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (hex.length !== 12) return null;
    if (!/^[0-9A-F]{12}$/.test(hex)) return null;
    return hex.match(/.{1,2}/g).join(':');
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/devices');
      setDevices(res.data || []);
    } catch (e) {
      setError('Unable to fetch devices from backend.');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      // Accept flexible input and normalize to XX:XX:XX:XX:XX:XX
      const macNorm = normalizeMac(form.mac);
      if (!macNorm) {
        throw new Error('Invalid MAC format. Examples: AA:BB:CC:DD:EE:FF, AABBCCDDEEFF, AA-BB-CC-DD-EE-FF, AABB.CCDD.EEFF');
      }
      if (!form.username) {
        throw new Error('Username is required');
      }
      if (!form.vlan) {
        throw new Error('VLAN is required');
      }
      const vlanInt = parseInt(form.vlan, 10);
      if (Number.isNaN(vlanInt)) {
        throw new Error('VLAN must be an integer');
      }
      await api.post('/devices', { mac: macNorm, username: form.username, vlan: vlanInt });
      setSuccess('Device added successfully');
      setForm({ mac: '', username: form.username, vlan: String(vlanInt) });
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to add device');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Add Device (MAC)" subheader="Register device MAC bound to username and VLAN" />
      <CardContent>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="warning">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="MAC Address" name="mac" value={form.mac} onChange={onChange} placeholder="AA:BB:CC:DD:EE:FF or AABBCCDDEEFF" helperText="Formats accepted: AA:BB:CC:DD:EE:FF, AABBCCDDEEFF, AA-BB-CC-DD-EE-FF, AABB.CCDD.EEFF" required />
              <TextField fullWidth label="Username" name="username" value={form.username} onChange={onChange} placeholder="e.g., alice" required />
              <TextField fullWidth label="VLAN" name="vlan" value={form.vlan} onChange={onChange} placeholder="e.g., 10" required />
            </Stack>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? (<><CircularProgress size={18} sx={{ mr: 1 }} /> Submitting...</>) : 'Add MAC'}
            </Button>
          </Stack>
        </form>

        <Stack spacing={2} sx={{ mt: 3 }}>
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /> Loading list...</Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MAC</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Authorized</TableCell>
                  <TableCell align="right">VLAN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((d, idx) => (
                  <TableRow key={`${d.mac}-${idx}`}>
                    <TableCell>{d.mac}</TableCell>
                    <TableCell>{d.username}</TableCell>
                    <TableCell>{String(d.authorized)}</TableCell>
                    <TableCell align="right">{d.vlan}</TableCell>
                  </TableRow>
                ))}
                {!devices.length && <TableRow><TableCell colSpan={4}>No devices found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
