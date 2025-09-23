import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import SDNValidate from './components/SDNValidate';
import LogsViewer from './components/LogsViewer';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Toolbar, AppBar, Typography, IconButton, useMediaQuery } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RuleIcon from '@mui/icons-material/Rule';
import ArticleIcon from '@mui/icons-material/Article';
import MenuIcon from '@mui/icons-material/Menu';

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
      </List>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="fixed">
          <Toolbar>
            {!isMdUp && (
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 2 }} aria-label="open drawer">
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              SDN Dashboard
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sdn" element={<SDNValidate />} />
            <Route path="/topology" element={<TopologyGraph />} />
            <Route path="/intents" element={<IntentForm />} />
            <Route path="/mac" element={<MacAddressForm />} />
            <Route path="/flows" element={<FlowTable />} />
            <Route path="/health" element={<HealthPanel />} />
            <Route path="/logs" element={<LogsViewer />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;