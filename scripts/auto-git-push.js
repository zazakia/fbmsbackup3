#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    interval: 2 * 60 * 1000, // 2 minutes in milliseconds
    commitMessagePrefix: 'Auto-update',
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    excludePatterns: [
        'node_modules/',
        '.git/',
        'dist/',
        'build/',
        '*.log',
        '.env.local'
    ],
    enableLogging: true,
    logFile: path.join(__dirname, '..', 'auto-git-push.log'),
    branch: null // null means current branch
};

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

// Logging functions
function log(message, color = 'green', includeTimestamp = true) {
    const timestamp = includeTimestamp ? `[${new Date().toISOString()}] ` : '';
    const coloredMessage = `${colors[color]}${timestamp}${message}${colors.reset}`;
    console.log(coloredMessage);
    
    if (CONFIG.enableLogging) {
        const logMessage = `${timestamp}${message}\n`;
        fs.appendFileSync(CONFIG.logFile, logMessage, 'utf8');
    }
}

function error(message) {
    log(`❌ ERROR: ${message}`, 'red');
}

function warn(message) {
    log(`⚠️  WARNING: ${message}`, 'yellow');
}

function info(message) {
    log(`ℹ️  INFO: ${message}`, 'blue');
}

function success(message) {
    log(`✅ SUCCESS: ${message}`, 'green');
}

function header(message) {
    const border = '='.repeat(50);
    log(border, 'cyan', false);
    log(`${message}`, 'cyan', false);
    log(border, 'cyan', false);
}

// Utility functions
function executeCommand(command, options = {}) {
    try {
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options 
        });
        return { success: true, output: result };
    } catch (err) {
        return { success: false, error: err.message, output: err.stdout || '' };
    }
}

function isGitRepository() {
    const result = executeCommand('git rev-parse --git-dir', { silent: true });
    return result.success;
}

function getCurrentBranch() {
    const result = executeCommand('git branch --show-current', { silent: true });
    return result.success ? result.output.trim() : null;
}

function hasChanges() {
    const result = executeCommand('git status --porcelain', { silent: true });
    return result.success && result.output.trim().length > 0;
}

function hasUnpushedCommits() {
    const result = executeCommand('git log @{u}..HEAD --oneline', { silent: true });
    return result.success && result.output.trim().length > 0;
}

function generateCommitMessage() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filesChanged = executeCommand('git diff --cached --name-only', { silent: true });
    const fileCount = filesChanged.success ? filesChanged.output.split('\n').filter(f => f.trim()).length : 0;
    
    return `${CONFIG.commitMessagePrefix}: ${fileCount} files changed at ${timestamp}`;
}

// Main automation functions
async function performGitOperations(retryCount = 0) {
    try {
        header(`Git Auto-Push Cycle #${Date.now()}`);
        
        // Check if we're in a git repository
        if (!isGitRepository()) {
            error('Not in a git repository!');
            return false;
        }

        const currentBranch = getCurrentBranch();
        if (!currentBranch) {
            error('Could not determine current branch');
            return false;
        }

        const targetBranch = CONFIG.branch || currentBranch;
        info(`Working on branch: ${targetBranch}`);

        // Fetch latest changes from remote
        info('Fetching latest changes from remote...');
        const fetchResult = executeCommand('git fetch origin', { silent: true });
        if (!fetchResult.success) {
            warn('Failed to fetch from remote, continuing anyway...');
        }

        // Check for changes
        const hasLocalChanges = hasChanges();
        const hasUnpushed = hasUnpushedCommits();

        if (!hasLocalChanges && !hasUnpushed) {
            info('No changes to commit or push');
            return true;
        }

        if (hasLocalChanges) {
            // Add all changes
            info('Adding changes to staging area...');
            const addResult = executeCommand('git add .');
            if (!addResult.success) {
                error('Failed to add changes');
                return false;
            }

            // Generate and commit
            const commitMessage = generateCommitMessage();
            info(`Committing with message: "${commitMessage}"`);
            const commitResult = executeCommand(`git commit -m "${commitMessage}"`);
            if (!commitResult.success) {
                error('Failed to commit changes');
                return false;
            }
            success('Changes committed successfully');
        }

        // Push to remote
        info(`Pushing to origin/${targetBranch}...`);
        const pushResult = executeCommand(`git push origin ${targetBranch}`);
        if (!pushResult.success) {
            if (retryCount < CONFIG.maxRetries) {
                warn(`Push failed, retrying in ${CONFIG.retryDelay/1000} seconds... (Attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
                await sleep(CONFIG.retryDelay);
                return performGitOperations(retryCount + 1);
            } else {
                error('Failed to push after maximum retries');
                return false;
            }
        }

        success(`Successfully pushed to origin/${targetBranch}`);
        
        // Show recent commits
        info('Recent commits:');
        executeCommand('git log --oneline -3');

        return true;

    } catch (err) {
        error(`Unexpected error: ${err.message}`);
        if (retryCount < CONFIG.maxRetries) {
            warn(`Retrying in ${CONFIG.retryDelay/1000} seconds...`);
            await sleep(CONFIG.retryDelay);
            return performGitOperations(retryCount + 1);
        }
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Signal handlers for graceful shutdown
let isShuttingDown = false;

function setupSignalHandlers() {
    const gracefulShutdown = (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        
        header(`Received ${signal} - Shutting down gracefully...`);
        info('Auto-push automation stopped');
        process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Windows specific
    if (process.platform === 'win32') {
        process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
    }
}

// Configuration management
function loadConfig() {
    const configPath = path.join(__dirname, '..', 'auto-git-config.json');
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            Object.assign(CONFIG, userConfig);
            info('Loaded custom configuration');
        } catch (err) {
            warn('Failed to load config file, using defaults');
        }
    }
}

function saveConfig() {
    const configPath = path.join(__dirname, '..', 'auto-git-config.json');
    try {
        fs.writeFileSync(configPath, JSON.stringify(CONFIG, null, 2));
        info('Configuration saved');
    } catch (err) {
        warn('Failed to save configuration');
    }
}

// Status display
function displayStatus() {
    header('Auto-Push Status');
    info(`Interval: ${CONFIG.interval / 1000} seconds (${CONFIG.interval / 60000} minutes)`);
    info(`Branch: ${CONFIG.branch || 'current branch'}`);
    info(`Log file: ${CONFIG.logFile}`);
    info(`Commit prefix: ${CONFIG.commitMessagePrefix}`);
    info(`Max retries: ${CONFIG.maxRetries}`);
    info('Press Ctrl+C to stop');
}

// Main execution
async function main() {
    try {
        header('FBMS Auto-Git-Push Automation Started');
        
        // Load configuration
        loadConfig();
        
        // Setup signal handlers
        setupSignalHandlers();
        
        // Display initial status
        displayStatus();
        
        // Create log file if it doesn't exist
        if (CONFIG.enableLogging && !fs.existsSync(CONFIG.logFile)) {
            fs.writeFileSync(CONFIG.logFile, `Auto-Git-Push Log Started: ${new Date().toISOString()}\n`);
        }

        // Initial git check
        if (!isGitRepository()) {
            error('Not in a git repository! Please run this script from your project root.');
            process.exit(1);
        }

        info(`Starting automation with ${CONFIG.interval / 60000} minute intervals...`);

        // Run initial push
        await performGitOperations();

        // Set up interval
        const intervalId = setInterval(async () => {
            if (isShuttingDown) {
                clearInterval(intervalId);
                return;
            }
            
            await performGitOperations();
        }, CONFIG.interval);

        // Keep process alive
        process.stdin.resume();

    } catch (err) {
        error(`Failed to start automation: ${err.message}`);
        process.exit(1);
    }
}

// Handle command line arguments
function handleArguments() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
${colors.cyan}FBMS Auto-Git-Push Automation${colors.reset}

${colors.bright}Usage:${colors.reset}
  node auto-git-push.js [options]

${colors.bright}Options:${colors.reset}
  --interval <minutes>    Set push interval in minutes (default: 2)
  --prefix <message>      Set commit message prefix (default: "Auto-update")
  --branch <name>         Set target branch (default: current branch)
  --no-log               Disable file logging
  --config               Show current configuration
  --status               Show status and exit
  --help, -h             Show this help message

${colors.bright}Examples:${colors.reset}
  node auto-git-push.js --interval 5 --prefix "Backup"
  node auto-git-push.js --branch main --no-log
  node auto-git-push.js --status

${colors.bright}Control:${colors.reset}
  Press Ctrl+C to stop the automation gracefully
        `);
        process.exit(0);
    }

    if (args.includes('--config')) {
        console.log('Current configuration:');
        console.log(JSON.stringify(CONFIG, null, 2));
        process.exit(0);
    }

    if (args.includes('--status')) {
        displayStatus();
        process.exit(0);
    }

    // Parse other arguments
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--interval':
                if (args[i + 1]) {
                    CONFIG.interval = parseInt(args[i + 1]) * 60 * 1000;
                    i++;
                }
                break;
            case '--prefix':
                if (args[i + 1]) {
                    CONFIG.commitMessagePrefix = args[i + 1];
                    i++;
                }
                break;
            case '--branch':
                if (args[i + 1]) {
                    CONFIG.branch = args[i + 1];
                    i++;
                }
                break;
            case '--no-log':
                CONFIG.enableLogging = false;
                break;
        }
    }
}

// Entry point
handleArguments();
main().catch(err => {
    error(`Unhandled error: ${err.message}`);
    process.exit(1);
});