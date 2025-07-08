// Node.js server for executing shell scripts (using built-in modules only)
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Allowed scripts for security
const allowedScripts = [
  'scripts/git-workflow.sh',
  'scripts/deploy-production.sh',
  'scripts/deploy-staging.sh',
  'scripts/deploy.sh',
  'scripts/setup-netlify.sh',
  'scripts/backup-and-protect.sh'
];

// Store active processes
const activeProcesses = new Map();

// Execute script endpoint with streaming
app.post('/api/execute-script', (req, res) => {
  const { scriptPath, args = [] } = req.body;
  
  if (!scriptPath) {
    return res.status(400).json({ error: 'Script path is required' });
  }

  // Security check
  if (!allowedScripts.includes(scriptPath)) {
    return res.status(403).json({ error: 'Script not allowed' });
  }

  const fullPath = path.resolve(scriptPath);
  
  // Check if script exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Script not found' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send connection established
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to script execution service',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Make script executable
  const chmodProcess = spawn('chmod', ['+x', fullPath]);
  
  chmodProcess.on('close', (code) => {
    if (code !== 0) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to make script executable',
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
      return;
    }

    // Execute the actual script
    console.log(`Executing script: ${fullPath} with args:`, args);
    
    const child = spawn('bash', [fullPath, ...args], {
      cwd: process.cwd(),
      env: { 
        ...process.env, 
        FORCE_COLOR: '1',
        TERM: 'xterm-256color'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store the process
    const processId = `${scriptPath}-${Date.now()}`;
    activeProcesses.set(processId, child);

    // Send process started event
    res.write(`data: ${JSON.stringify({
      type: 'started',
      processId: processId,
      command: `bash ${fullPath} ${args.join(' ')}`,
      timestamp: new Date().toISOString()
    })}\n\n`);

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

    // Handle process completion
    child.on('close', (code, signal) => {
      activeProcesses.delete(processId);
      
      res.write(`data: ${JSON.stringify({
        type: 'exit',
        code: code,
        signal: signal,
        message: code === 0 ? 'Script completed successfully' : `Script exited with code ${code}`,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      res.end();
    });

    // Handle process errors
    child.on('error', (error) => {
      activeProcesses.delete(processId);
      
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      if (activeProcesses.has(processId)) {
        console.log(`Client disconnected, killing process ${processId}`);
        child.kill('SIGTERM');
        activeProcesses.delete(processId);
      }
    });
  });
});

// Stop script endpoint
app.post('/api/stop-script', (req, res) => {
  const { processId } = req.body;
  
  if (!processId) {
    return res.status(400).json({ error: 'Process ID is required' });
  }

  const process = activeProcesses.get(processId);
  if (!process) {
    return res.status(404).json({ error: 'Process not found' });
  }

  try {
    process.kill('SIGTERM');
    activeProcesses.delete(processId);
    res.json({ success: true, message: 'Process terminated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List available scripts
app.get('/api/scripts', (req, res) => {
  const scripts = allowedScripts.map(scriptPath => {
    const fullPath = path.resolve(scriptPath);
    const exists = fs.existsSync(fullPath);
    
    return {
      path: scriptPath,
      name: path.basename(scriptPath, '.sh'),
      exists: exists,
      executable: exists ? (fs.statSync(fullPath).mode & parseInt('111', 8)) !== 0 : false
    };
  });
  
  res.json({ scripts });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    activeProcesses: activeProcesses.size,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Script execution server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST /api/execute-script`);
  console.log(`   - POST /api/stop-script`);
  console.log(`   - GET /api/scripts`);
  console.log(`   - GET /api/health`);
  console.log(`🔐 Allowed scripts: ${allowedScripts.length}`);
});