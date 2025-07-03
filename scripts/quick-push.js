#!/usr/bin/env node

import { execSync } from 'child_process';
import readline from 'readline';

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'green') {
    console.log(`${colors[color]}[INFO]${colors.reset} ${message}`);
}

function warn(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function error(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function header(message) {
    console.log(`${colors.blue}================================${colors.reset}`);
    console.log(`${colors.blue}${message}${colors.reset}`);
    console.log(`${colors.blue}================================${colors.reset}`);
}

// Get commit message and deploy flag from command line arguments
const commitMessage = process.argv[2] || 'Update FBMS';
const shouldDeploy = process.argv.includes('--deploy') || process.argv.includes('-d');

async function quickPush() {
    try {
        header('Quick Git Push Workflow');

        // Check if we're in a git repository
        try {
            execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        } catch {
            error('Not in a git repository!');
            process.exit(1);
        }

        // Get current branch
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        log(`Current branch: ${currentBranch}`);

        // Check if there are changes
        try {
            execSync('git diff-index --quiet HEAD --', { stdio: 'ignore' });
            warn('No changes to commit!');
            
            // If no changes but deploy flag is set, still deploy
            if (shouldDeploy) {
                await deployToNetlify();
            }
            return;
        } catch {
            // Changes exist, continue
        }

        // Show status
        log('Git status:');
        execSync('git status --short', { stdio: 'inherit' });

        // Add all changes
        log('Adding all changes...');
        execSync('git add .', { stdio: 'inherit' });

        // Commit
        log(`Committing with message: "${commitMessage}"`);
        execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

        // Push
        log('Pushing to remote...');
        execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });

        // Deploy if flag is set
        if (shouldDeploy) {
            await deployToNetlify();
        }

        // Summary
        header('Push Complete!');
        log(`Changes pushed to: ${currentBranch}`);
        log(`Commit message: ${commitMessage}`);

        // Show recent commits
        log('Recent commits:');
        execSync('git log --oneline -3', { stdio: 'inherit' });

        // Show repository URL
        const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
        log(`Repository: ${remoteUrl}`);

        // If not on main, suggest PR
        if (currentBranch !== 'main') {
            warn('Consider creating a pull request:');
            console.log(`https://github.com/zazakia/filipino-business-management-system/compare/main...${currentBranch}`);
        }

        header('Done!');

    } catch (err) {
        error(`Script failed: ${err.message}`);
        process.exit(1);
    }
}

async function deployToNetlify() {
    try {
        header('Deploying to Netlify');
        
        // Check if Netlify CLI is installed
        try {
            execSync('netlify --version', { stdio: 'ignore' });
        } catch {
            error('Netlify CLI not found. Please install it with: npm install -g netlify-cli');
            return;
        }

        // Build the project
        log('Building project...');
        execSync('npm run build', { stdio: 'inherit' });

        // Deploy to Netlify
        log('Deploying to Netlify...');
        execSync('netlify deploy --prod --dir=dist', { stdio: 'inherit' });

        log('Deployment completed successfully!');
        
    } catch (err) {
        error(`Deployment failed: ${err.message}`);
        warn('You can still deploy manually with: npm run deploy');
    }
}

quickPush(); 