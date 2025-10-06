import React, { useState } from 'react';
import { Button, TextField, Typography, Alert, Stack, Link as MuiLink, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { PersonOutline, LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const isStrongPassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^\w\s]).{6,}$/.test(pwd);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Validate required and strength
    if (!username || !password) {
      setError('Please enter your credentials');
      return;
    }
    if (!isStrongPassword(password)) {
      setPasswordError('Password must be 6+ chars and include a letter, a number, and a special character');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/auth/login', { username, password });
      const token = resp.data?.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        navigate('/');
      } else {
        // Generic message, do not leak internal details
        setError('Unable to sign in. Please try again.');
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        // Generic invalid credentials message
        setError('Invalid username or password');
      } else {
        // Generic fallback without leaking details
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Typography variant="h5" fontWeight={800} gutterBottom sx={{ mb: 1 }}>
        Welcome back
      </Typography>
      <Stack spacing={2} component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PersonOutline fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            const v = e.target.value;
            setPassword(v);
            if (!v) {
              setPasswordError('');
            } else if (!isStrongPassword(v)) {
              setPasswordError('Password must be 6+ chars and include a letter, a number, and a special character');
            } else {
              setPasswordError('');
            }
          }}
          fullWidth
          error={Boolean(passwordError)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlined fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword((s) => !s)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.1 }}>
          {loading && <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />}
          {loading ? 'Signing in...' : 'Login'}
        </Button>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <MuiLink component={Link} to="/forgot-password" underline="hover">
            Forgot password?
          </MuiLink>
          <Typography variant="body2">
            No account? <MuiLink component={Link} to="/register">Create one</MuiLink>
          </Typography>
        </Stack>
      </Stack>
    </>
  );
}

