import React, { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, TextField, Button, Alert, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const q = useQuery();
  const navigate = useNavigate();
  const token = q.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const isStrongPassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^\w\s]).{6,}$/.test(pwd);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPasswordError('');
    setConfirmError('');

    if (!token) {
      setError('Reset link is invalid or expired.');
      return;
    }
    if (!isStrongPassword(password)) {
      setPasswordError('Password does not meet requirements');
      return;
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess('Your password has been reset. You can now sign in.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError('Unable to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Reset password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <TextField
            label="New password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              if (!v) setPasswordError('');
              else if (!isStrongPassword(v)) setPasswordError('Password does not meet requirements');
              else setPasswordError('');
            }}
            fullWidth
            error={Boolean(passwordError)}
            helperText={passwordError || ' '}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => {
              const v = e.target.value;
              setConfirm(v);
              setConfirmError(v === password ? '' : 'Passwords do not match');
            }}
            fullWidth
            error={Boolean(confirmError)}
            helperText={confirmError || ' '}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle confirm password visibility" onClick={() => setShowConfirm((s) => !s)} edge="end" size="small">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading && <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" />}
            Reset password
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
