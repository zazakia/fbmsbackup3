// Simple Node.js server for executing shell scripts (built-in modules only)
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const url = require('url');

const PORT = process.env.PORT || 3001;

// Allowed scripts for security
const allowedScripts = [
  'scripts/git-workflow.sh',
  'scripts/deploy-production.sh',
  'scripts/deploy-staging.sh',
  'scripts/deploy-vercel.sh',
  'scripts/deploy.sh',
  'scripts/setup-netlify.sh',
  'scripts/backup-and-protect.sh'
];

// Store active processes
const activeProcesses = new Map();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...corsHeaders
  });
  res.end(JSON.stringify(data));
}

// Send SSE headers
function setupSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    ...corsHeaders
  });
}

// Send SSE data
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  console.log(`${method} ${pathname}`);

  // Execute script endpoint
  if (pathname === '/api/execute-script' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { scriptPath, args = [] } = body;
      
      if (!scriptPath) {
        return sendJSON(res, 400, { error: 'Script path is required' });
      }

      // Security check
      if (!allowedScripts.includes(scriptPath)) {
        return sendJSON(res, 403, { error: 'Script not allowed' });
      }

      const fullPath = path.resolve(scriptPath);
      
      // Check if script exists
      if (!fs.existsSync(fullPath)) {
        return sendJSON(res, 404, { error: 'Script not found' });
      }

      // Set up Server-Sent Events
      setupSSE(res);

      // Send connection established
      sendSSE(res, {
        type: 'connected',
        message: 'Connected to script execution service',
        timestamp: new Date().toISOString()
      });

      // Make script executable
      const chmodProcess = spawn('chmod', ['+x', fullPath]);
      
      chmodProcess.on('close', (code) => {
        if (code !== 0) {
          sendSSE(res, {
            type: 'error',
            message: 'Failed to make script executable',
            timestamp: new Date().toISOString()
          });
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
        sendSSE(res, {
          type: 'started',
          processId: processId,
          command: `bash ${fullPath} ${args.join(' ')}`,
          timestamp: new Date().toISOString()
        });

        // Stream stdout
        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              sendSSE(res, {
                type: 'stdout',
                data: line,
                timestamp: new Date().toISOString()
              });
            }
          });
        });

        // Stream stderr
        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
            if (line.trim()) {
              sendSSE(res, {
                type: 'stderr',
                data: line,
                timestamp: new Date().toISOString()
              });
            }
          });
        });

        // Handle process completion
        child.on('close', (code, signal) => {
          activeProcesses.delete(processId);
          
          sendSSE(res, {
            type: 'exit',
            code: code,
            signal: signal,
            message: code === 0 ? 'Script completed successfully' : `Script exited with code ${code}`,
            timestamp: new Date().toISOString()
          });
          
          res.end();
        });

        // Handle process errors
        child.on('error', (error) => {
          activeProcesses.delete(processId);
          
          sendSSE(res, {
            type: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
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

    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // Health check endpoint
  if (pathname === '/api/health' && method === 'GET') {
    sendJSON(res, 200, { 
      status: 'healthy', 
      activeProcesses: activeProcesses.size,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // List scripts endpoint
  if (pathname === '/api/scripts' && method === 'GET') {
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
    
    sendJSON(res, 200, { scripts });
    return;
  }

  // 404 for other routes
  sendJSON(res, 404, { error: 'Not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Script execution server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/execute-script`);
  console.log(`   - GET http://localhost:${PORT}/api/health`);
  console.log(`   - GET http://localhost:${PORT}/api/scripts`);
  console.log(`🔐 Allowed scripts: ${allowedScripts.length}`);
  allowedScripts.forEach(script => console.log(`   - ${script}`));
});