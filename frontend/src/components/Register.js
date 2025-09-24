import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Stack, Link as MuiLink } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/auth/register', { username, password });
      const token = resp.data?.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        navigate('/');
      } else {
        setError('Registration failed: no token returned');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 2 }}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Register
          </Typography>
          <Stack spacing={2} component="form" onSubmit={onSubmit}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <Typography variant="body2">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login">Login</MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
