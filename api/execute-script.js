// API endpoint to execute shell scripts
// This would typically be a server-side API endpoint
// For demonstration, this shows how script execution would work

import { spawn } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scriptPath, args = [] } = req.body;
  
  if (!scriptPath) {
    return res.status(400).json({ error: 'Script path is required' });
  }

  // Security: Only allow scripts from the scripts directory
  const allowedScripts = [
    'scripts/git-workflow.sh',
    'scripts/deploy-production.sh',
    'scripts/deploy-staging.sh',
    'scripts/deploy.sh',
    'scripts/setup-netlify.sh',
    'scripts/backup-and-protect.sh'
  ];

  if (!allowedScripts.includes(scriptPath)) {
    return res.status(403).json({ error: 'Script not allowed' });
  }

  const fullPath = path.resolve(scriptPath);
  
  // Set up SSE headers for streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection
  res.write('data: {"type": "connected"}\n\n');

  // Execute the script
  const child = spawn('bash', [fullPath, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  // Stream stdout
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({
          type: 'stdout',
          data: line,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    });
  });

  // Stream stderr
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        res.write(`data: ${JSON.stringify({
          type: 'stderr',
          data: line,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    });
  });

  // Handle completion
  child.on('close', (code) => {
    res.write(`data: ${JSON.stringify({
      type: 'exit',
      code: code,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  });

  // Handle errors
  child.on('error', (error) => {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on('close', () => {
    child.kill();
  });
}