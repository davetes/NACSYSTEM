import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.removeItem('auth_token');
    } catch (e) {
      // ignore storage errors
    }
    // small delay for UX
    const t = setTimeout(() => navigate('/login', { replace: true }), 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <CircularProgress size={20} />
      <Typography variant="body2">Signing you out...</Typography>
    </Box>
  );
}
