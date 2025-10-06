import React, { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography, TextField, Button, Alert, Avatar, CircularProgress, Divider, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined } from '@mui/icons-material';
import api from '../api';

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // profile fields
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const isStrongPassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^\w\s]).{6,}$/.test(pwd);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // Try to fetch profile details
        const resp = await api.get('/profile/me');
        if (!active) return;
        setDisplayName(resp.data?.displayName || '');
        setAvatarUrl(resp.data?.avatarUrl || '');
      } catch (e) {
        // ignore; page still usable
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (avatarFile) {
        setUploading(true);
        const form = new FormData();
        form.append('avatar', avatarFile);
        const resp = await api.post('/profile/avatar', form);
        const url = resp?.data?.avatarUrl;
        if (url) setAvatarUrl(url);
      }
      await api.post('/profile/update', { displayName });
      setSuccess('Profile updated');
      setAvatarFile(null);
      try { window.dispatchEvent(new Event('profile:updated')); } catch {}
    } catch (e) {
      setError('Could not update profile');
    } finally {
      setUploading(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPwdError('');
    setConfirmError('');
    if (!isStrongPassword(newPassword)) {
      setPwdError('New password does not meet requirements');
      return;
    }
    if (newPassword !== confirmNew) {
      setConfirmError('Passwords do not match');
      return;
    }
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNew('');
    } catch (e) {
      setError('Unable to change password');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>My Profile</Typography>
      {loading && <Alert severity="info">Loading profile...</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Profile details</Typography>
        <Stack spacing={2} component="form" onSubmit={onSaveProfile}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} sx={{ width: 72, height: 72 }} />
            <Button variant="outlined" component="label" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Change Avatar'}
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAvatarFile(f);
              }} />
            </Button>
          </Stack>
          <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} fullWidth />
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={uploading}>
              {(uploading) ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              Save changes
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Change password</Typography>
        <Stack spacing={2} component="form" onSubmit={onChangePassword}>
          <TextField
            label="Current password"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCurrent((s) => !s)}>{showCurrent ? <VisibilityOff/> : <Visibility/>}</IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <TextField
            label="New password"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => {
              const v = e.target.value;
              setNewPassword(v);
              if (!v) setPwdError('');
              else if (!isStrongPassword(v)) setPwdError('New password does not meet requirements');
              else setPwdError('');
            }}
            error={Boolean(pwdError)}
            helperText={pwdError || ' '}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNew((s) => !s)}>{showNew ? <VisibilityOff/> : <Visibility/>}</IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <TextField
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmNew}
            onChange={(e) => {
              const v = e.target.value;
              setConfirmNew(v);
              setConfirmError(v === newPassword ? '' : 'Passwords do not match');
            }}
            error={Boolean(confirmError)}
            helperText={confirmError || ' '}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm((s) => !s)}>{showConfirm ? <VisibilityOff/> : <Visibility/>}</IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <Divider sx={{ my: 1 }} />
          <Button type="submit" variant="contained">Update password</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
