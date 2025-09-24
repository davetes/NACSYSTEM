import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, Outlet } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import SDNValidate from './components/SDNValidate';
import LogsViewer from './components/LogsViewer';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Toolbar, AppBar, Typography, IconButton, useMediaQuery, Container, Paper } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RuleIcon from '@mui/icons-material/Rule';
import ArticleIcon from '@mui/icons-material/Article';
import MenuIcon from '@mui/icons-material/Menu';
import Policy from './components/Policy';
import PolicyIcon from '@mui/icons-material/Policy';

// SDN UI components
import TopologyGraph from './components/TopologyGraph';
import IntentForm from './components/IntentForm';
import FlowTable from './components/FlowTable';
import HealthPanel from './components/HealthPanel';
import LanIcon from '@mui/icons-material/Lan';
import RouteIcon from '@mui/icons-material/Route';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import MacAddressForm from './components/MacAddressForm';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import Login from './components/Login';
import Register from './components/Register';
// import LoginIcon from '@mui/icons-material/Login';
// import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMdUp = useMediaQuery('(min-width:900px)');

  const drawerWidth = 240;

  // Auth state derived from localStorage
  const isAuthed = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('auth_token'));
    } catch (e) {
      return false;
    }
  }, []);

  // Route guard components
  const RequireAuth = ({ children }) => {
    const authed = (() => {
      try { return Boolean(localStorage.getItem('auth_token')); } catch { return false; }
    })();
    return authed ? children : <Navigate to="/login" replace />;
  };

  // Prevent showing auth pages if already authenticated
  const AuthOnly = ({ children }) => {
    const authed = (() => {
      try { return Boolean(localStorage.getItem('auth_token')); } catch { return false; }
    })();
    return authed ? <Navigate to="/" replace /> : children;
  };

  // Layouts
  const DashboardLayout = () => (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {!isMdUp && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }} aria-label="open drawer">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} className={"text-white"}>
            PulseNet
          </Typography>
        </Toolbar>
      </AppBar>
      {/* Temporary drawer for mobile */}
      {!isMdUp && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawerContent}
        </Drawer>
      )}
      {/* Permanent drawer for md and up */}
      {isMdUp && (
        <Drawer
          variant="permanent"
          sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
        >
          {drawerContent}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: { xs: 0, md: `${drawerWidth}px` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </>
  );

  const AuthLayout = () => (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
               background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0ea5e9 100%)' }}>
      <Container maxWidth="sm">
        <Paper elevation={12} sx={{ p: 4, borderRadius: 3, backdropFilter: 'blur(6px)' }}>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );

  const drawerContent = (
    <>
      <Toolbar />
      <List>
        <ListItem button component={Link} to="/" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/sdn" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><RuleIcon /></ListItemIcon>
          <ListItemText primary="SDN Validate" />
        </ListItem>
        <ListItem button component={Link} to="/topology" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><LanIcon /></ListItemIcon>
          <ListItemText primary="Topology" />
        </ListItem>
        <ListItem button component={Link} to="/intents" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><RouteIcon /></ListItemIcon>
          <ListItemText primary="Intents" />
        </ListItem>
        <ListItem button component={Link} to="/mac" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><SettingsEthernetIcon /></ListItemIcon>
          <ListItemText primary="MAC Addresses" />
        </ListItem>
        <ListItem button component={Link} to="/flows" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><SwapHorizIcon /></ListItemIcon>
          <ListItemText primary="Flows" />
        </ListItem>
        <ListItem button component={Link} to="/health" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><MonitorHeartIcon /></ListItemIcon>
          <ListItemText primary="Health" />
        </ListItem>
        <ListItem button component={Link} to="/logs" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><ArticleIcon /></ListItemIcon>
          <ListItemText primary="Logs" />
        </ListItem>
        <ListItem button component={Link} to="/policy" onClick={() => setMobileOpen(false)}>
          <ListItemIcon><PolicyIcon /></ListItemIcon>
          <ListItemText primary="Policy" />
        </ListItem>
      </List>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Auth pages with dedicated layout and redirect if already authed */}
          <Route element={<AuthOnly><AuthLayout /></AuthOnly>}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Dashboard and app pages, protected */}
          <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sdn" element={<SDNValidate />} />
            <Route path="/topology" element={<TopologyGraph />} />
            <Route path="/intents" element={<IntentForm />} />
            <Route path="/mac" element={<MacAddressForm />} />
            <Route path="/flows" element={<FlowTable />} />
            <Route path="/health" element={<HealthPanel />} />
            <Route path="/logs" element={<LogsViewer />} />
            <Route path="/policy" element={<Policy />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthed ? '/' : '/login'} replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;