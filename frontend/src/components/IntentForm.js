import React, { useState } from 'react';
import { Card, CardHeader, CardContent, TextField, Button, Stack, Alert, CircularProgress } from '@mui/material';
import api from '../api';

// POST /api/intents { src, dst, constraints, tenant }
export default function IntentForm() {
  const [form, setForm] = useState({ src: '', dst: '', constraints: '', tenant: 'default' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = { ...form, constraints: form.constraints ? JSON.parse(form.constraints) : {} };
      const res = await api.post('/api/intents', payload);
      setResult(res.data);
    } catch (err) {
      // demo fallback
      setError('Live controller not reachable. Returning demo intent result.');
      setResult({ id: 'demo-intent-1', status: 'ACCEPTED', compiledFlows: 5 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Create Intent" subheader="Declare desired connectivity and constraints" />
      <CardContent>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="warning">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Source" name="src" value={form.src} onChange={onChange} placeholder="e.g., hostA" required />
              <TextField fullWidth label="Destination" name="dst" value={form.dst} onChange={onChange} placeholder="e.g., hostB" required />
            </Stack>
            <TextField fullWidth label="Constraints (JSON)" name="constraints" value={form.constraints} onChange={onChange} placeholder='e.g., {"bandwidth":100, "latency":"<5ms"}' />
            <TextField fullWidth label="Tenant" name="tenant" value={form.tenant} onChange={onChange} />
            <Stack direction="row" spacing={2}>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? (<><CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> Submitting...</>) : 'Submit Intent'}
              </Button>
              {result && <Alert severity="success">Intent {result.id || 'created'} • status: {result.status || 'ACCEPTED'} • flows: {result.compiledFlows ?? '-'}
              </Alert>}
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
