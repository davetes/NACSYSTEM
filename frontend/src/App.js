import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import SDNValidate from './components/SDNValidate';
import LogsViewer from './components/LogsViewer';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Toolbar, AppBar, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RuleIcon from '@mui/icons-material/Rule';
import ArticleIcon from '@mui/icons-material/Article';

// SDN UI components
import TopologyGraph from './components/TopologyGraph';
import IntentForm from './components/IntentForm';
import FlowTable from './components/FlowTable';
import HealthPanel from './components/HealthPanel';
import LanIcon from '@mui/icons-material/Lan';
import RouteIcon from '@mui/icons-material/Route';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

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
              SDN Dashboard
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
            <ListItem button component={Link} to="/sdn">
              <ListItemIcon><RuleIcon /></ListItemIcon>
              <ListItemText primary="SDN Validate" />
            </ListItem>
            <ListItem button component={Link} to="/topology">
              <ListItemIcon><LanIcon /></ListItemIcon>
              <ListItemText primary="Topology" />
            </ListItem>
            <ListItem button component={Link} to="/intents">
              <ListItemIcon><RouteIcon /></ListItemIcon>
              <ListItemText primary="Intents" />
            </ListItem>
            <ListItem button component={Link} to="/flows">
              <ListItemIcon><SwapHorizIcon /></ListItemIcon>
              <ListItemText primary="Flows" />
            </ListItem>
            <ListItem button component={Link} to="/health">
              <ListItemIcon><MonitorHeartIcon /></ListItemIcon>
              <ListItemText primary="Health" />
            </ListItem>
            <ListItem button component={Link} to="/logs">
              <ListItemIcon><ArticleIcon /></ListItemIcon>
              <ListItemText primary="Logs" />
            </ListItem>
          </List>
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3, ml: '240px' }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sdn" element={<SDNValidate />} />
            <Route path="/topology" element={<TopologyGraph />} />
            <Route path="/intents" element={<IntentForm />} />
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