import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

function LogsViewer() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('all'); // all|info|warning|error|debug
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10);
  const [isPaused, setIsPaused] = useState(false); // pauses autoscroll

  const loadLogs = () => {
    setLoading(true);
    api.get('/logs')
      .then(res => setLines(res.data?.logs || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadLogs();
    }, Math.max(3, Number(intervalSec)) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec]);

  // Derived: filtered and highlighted logs
  const filtered = (lines || []).filter((l) => {
    const matchQuery = !query || l.toLowerCase().includes(query.toLowerCase());
    if (!matchQuery) return false;
    if (severity === 'all') return true;
    const lv = l.toLowerCase();
    if (severity === 'error') return lv.includes('error');
    if (severity === 'warning') return lv.includes('warn');
    if (severity === 'info') return lv.includes('info');
    if (severity === 'debug') return lv.includes('debug');
    return true;
  });

  const joined = filtered.join('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joined);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([joined], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper sx={{ p: 3, m: 2, bgcolor: '#ffffff', boxShadow: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">System Logs</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            size="small"
            placeholder="Search logs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Severity</InputLabel>
            <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />} label="Auto Refresh" />
          <TextField
            size="small"
            type="number"
            label="Interval (s)"
            value={intervalSec}
            onChange={(e) => setIntervalSec(e.target.value)}
            sx={{ width: 130 }}
            inputProps={{ min: 3 }}
          />
          <Tooltip title="Refresh now"><span><IconButton onClick={loadLogs} disabled={loading}><RefreshIcon /></IconButton></span></Tooltip>
          <Tooltip title="Copy filtered"><IconButton onClick={handleCopy}><ContentCopyIcon /></IconButton></Tooltip>
          <Tooltip title="Download filtered"><IconButton onClick={handleDownload}><DownloadIcon /></IconButton></Tooltip>
          <Tooltip title={isPaused ? 'Resume autoscroll' : 'Pause autoscroll'}>
            <IconButton onClick={() => setIsPaused(p => !p)}>{isPaused ? <PlayArrowIcon /> : <PauseIcon />}</IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Box
        sx={{ background: '#0b0f19', color: '#e6e6e6', p: 2, borderRadius: 1, maxHeight: 460, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13 }}
        onWheel={() => setIsPaused(true)}
        onScrollCapture={() => setIsPaused(true)}
      >
        <pre style={{ margin: 0, lineHeight: 1.5 }}>
          {filtered.map((l, idx) => {
            const num = String(idx + 1).padStart(5, ' ');
            const text = l.endsWith('\n') ? l.slice(0, -1) : l;
            let rendered = text;
            if (query) {
              const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
              rendered = text.split(re).map((part, i) => (
                re.test(part) ? <span key={i} style={{ backgroundColor: '#423a0f', color: '#ffe082' }}>{part}</span> : <span key={i}>{part}</span>
              ));
            }
            return (
              <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                <span style={{ color: '#607d8b' }}>{num} </span>{rendered}
              </div>
            );
          })}
        </pre>
      </Box>
    </Paper>
  );
}

export default LogsViewer;
