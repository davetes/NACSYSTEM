import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ValidateMAC from './components/ValidateMAC';
import ManageDevices from './components/ManageDevices';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Toolbar, AppBar, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DevicesOtherIcon from '@mui/icons-material/DevicesOther';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f4f6f8' },
  },
  typography: {
    h5: { fontWeight: 600 },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              NAC System Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0, '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' } }}>
          <Toolbar />
          <List>
            <ListItem button component={Link} to="/">
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem button component={Link} to="/validate">
              <ListItemIcon><CheckCircleIcon /></ListItemIcon>
              <ListItemText primary="Validate MAC" />
            </ListItem>
            <ListItem button component={Link} to="/manage">
              <ListItemIcon><DevicesOtherIcon /></ListItemIcon>
              <ListItemText primary="Manage Devices" />
            </ListItem>
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, ml: '240px' }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/validate" element={<ValidateMAC />} />
            <Route path="/manage" element={<ManageDevices />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;