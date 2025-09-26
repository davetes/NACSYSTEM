import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

function Policy() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Privacy Policy & Terms
      </Typography>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Last updated: {new Date().toLocaleDateString()}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          1. Introduction
        </Typography>
        <Typography paragraph>
          This Policy explains how PulseNet (the "Application") handles data. It covers what we collect, how it is used,
          and the rights and choices available to you.
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Data We Process
        </Typography>
        <Typography component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography component="span">
              Operational telemetry necessary for SDN monitoring (e.g., device health, topology, flows).
            </Typography>
          </li>
          <li>
            <Typography component="span">
              Configuration and intents you provide through the UI.
            </Typography>
          </li>
          <li>
            <Typography component="span">
              Minimal logs for troubleshooting and improving reliability.
            </Typography>
          </li>
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. How We Use Data
        </Typography>
        <Typography component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography component="span">To provide SDN visualization and control features.</Typography>
          </li>
          <li>
            <Typography component="span">To improve performance, safety, and reliability of the Application.</Typography>
          </li>
          <li>
            <Typography component="span">To diagnose issues and secure the platform.</Typography>
          </li>
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          4. Data Sharing
        </Typography>
        <Typography paragraph>
          We do not sell your data. Data may be shared with infrastructure or integration providers strictly to operate the
          Application, subject to appropriate safeguards.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          5. Security
        </Typography>
        <Typography paragraph>
          We implement reasonable technical and organizational measures to protect data. However, no system is completely
          secure. Use strong credentials and restrict access to the deployment environment.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          6. Your Choices
        </Typography>
        <Typography component="ul" sx={{ pl: 3 }}>
          <li>
            <Typography component="span">Configure data retention and logging levels as needed.</Typography>
          </li>
          <li>
            <Typography component="span">Contact the administrator to request deletion of logs where applicable.</Typography>
          </li>
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          7. Contact
        </Typography>
        <Typography paragraph>
          For questions about this Policy, contact your system administrator or project maintainers.
        </Typography>
      </Paper>
    </Box>
  );
}

export default Policy;
