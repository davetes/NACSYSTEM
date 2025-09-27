import React, { useState } from 'react';
import { Box, Paper, Stack, Typography, TextField, Button, Alert, CircularProgress, Link as MuiLink } from '@mui/material';
import api from '../api';

export default function ForgotPassword() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!emailOrUsername) {
      setError('Please enter your email or username');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('/auth/forgot-password', { identifier: emailOrUsername });
      const link = resp?.data?.dev_reset_link;
      if (link) setDevLink(link);
      setSuccess('If an account exists, a reset link has been sent. Please check your email.');
    } catch (err) {
      // Always generic to avoid user enumeration
      setSuccess('If an account exists, a reset link has been sent. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={8} sx={{ p: 4, width: '100%', maxWidth: 480, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Forgot your password?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your email or username and we will send you a reset link if an account exists.
        </Typography>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {devLink && (
            <Alert severity="info">
              Development mode: use this link to reset your password: {" "}
              <MuiLink href={devLink} target="_blank" rel="noreferrer">{devLink}</MuiLink>
            </Alert>
          )}
          <TextField
            label="Email or Username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            fullWidth
            autoFocus
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading && <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" />}
            Send reset link
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
