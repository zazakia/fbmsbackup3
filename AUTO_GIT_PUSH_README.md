# FBMS Auto-Git-Push Automation

Automatically push your changes to GitHub every 2 minutes (or custom interval) with intelligent commit messages and error handling.

## 🚀 Quick Start

### Windows
```bash
# Double-click or run from command prompt
scripts\start-auto-git-push.bat
```

### Unix/Linux/macOS
```bash
# Make executable and run
chmod +x scripts/start-auto-git-push.sh
./scripts/start-auto-git-push.sh
```

### Direct Node.js
```bash
node scripts/auto-git-push.js
```

## ⚙️ Configuration

The system uses `auto-git-config.json` for configuration. Default settings:

- **Interval**: 2 minutes (120,000 ms)
- **Commit Prefix**: "Auto-update"
- **Max Retries**: 3 attempts
- **Logging**: Enabled (saves to `auto-git-push.log`)
- **Branch**: Current branch (or specify custom)

### Custom Configuration

Edit `auto-git-config.json` or use command line options:

```bash
# Custom interval (5 minutes)
node scripts/auto-git-push.js --interval 5

# Custom commit prefix
node scripts/auto-git-push.js --prefix "Backup"

# Specific branch
node scripts/auto-git-push.js --branch main

# Disable logging
node scripts/auto-git-push.js --no-log

# Combination
node scripts/auto-git-push.js --interval 10 --prefix "Auto-save" --branch development
```

## 📋 Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--interval <minutes>` | Set push interval | `--interval 5` |
| `--prefix <message>` | Commit message prefix | `--prefix "Backup"` |
| `--branch <name>` | Target branch | `--branch main` |
| `--no-log` | Disable file logging | `--no-log` |
| `--config` | Show current config | `--config` |
| `--status` | Show status and exit | `--status` |
| `--help` | Show help message | `--help` |

## 🛡️ Features

### Smart Commit Detection
- Only commits when there are actual changes
- Generates descriptive commit messages with timestamps
- Shows file count and change summary

### Error Handling
- Automatic retry with exponential backoff
- Graceful handling of network issues
- Continues running even after temporary failures

### Safety Features
- Fetches remote changes before pushing
- Respects existing git configuration
- Won't overwrite uncommitted changes
- Excludes common build/temp files

### Monitoring
- Real-time status updates
- Colored console output
- Comprehensive logging
- Health check monitoring

## 📊 Log Output

The system creates `auto-git-push.log` with detailed information:

```
[2024-01-20T10:30:00.000Z] ✅ SUCCESS: Successfully pushed to origin/main
[2024-01-20T10:32:00.000Z] ℹ️  INFO: No changes to commit or push
[2024-01-20T10:34:00.000Z] ✅ SUCCESS: Changes committed successfully
```

## 🎯 Use Cases

### Development Backup
Perfect for continuous backup of your work:
```bash
node scripts/auto-git-push.js --interval 1 --prefix "Dev-backup"
```

### Documentation Updates
For frequently updated documentation:
```bash
node scripts/auto-git-push.js --interval 5 --prefix "Docs-update"
```

### Multi-Branch Development
Target specific branches:
```bash
node scripts/auto-git-push.js --branch feature/new-feature --interval 3
```

## 🛠️ Advanced Configuration

### Custom Exclude Patterns
Edit `auto-git-config.json` to exclude specific files/directories:

```json
{
  "excludePatterns": [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "*.log",
    ".env.local",
    "temp/",
    "*.tmp"
  ]
}
```

### Custom Commit Messages
Enable dynamic commit message templates:

```json
{
  "customCommitMessages": {
    "enabled": true,
    "templates": [
      "Automated backup - {timestamp}",
      "Auto-save: {fileCount} files updated",
      "Continuous integration update - {date}"
    ]
  }
}
```

### Git Options
Configure git behavior:

```json
{
  "gitOptions": {
    "pushForce": false,
    "pullBeforePush": true,
    "stashUncommittedChanges": false
  }
}
```

## 🔧 Troubleshooting

### Common Issues

**"Not in a git repository"**
- Ensure you're running from your project root
- Check that `.git` folder exists

**"Failed to push"**
- Check internet connection
- Verify git credentials
- Ensure you have push permissions

**"Node.js not found"**
- Install Node.js from https://nodejs.org/
- Ensure Node.js is in your PATH

### Debug Mode
For detailed debugging, check the log file or run with verbose output:

```bash
node scripts/auto-git-push.js --config
```

## 🚦 Control

### Starting
```bash
# Windows
scripts\start-auto-git-push.bat

# Unix/Linux/macOS
./scripts/start-auto-git-push.sh
```

### Stopping
- Press `Ctrl+C` for graceful shutdown
- The script will complete the current operation before stopping

### Status Check
```bash
node scripts/auto-git-push.js --status
```

## 📈 Monitoring

The system includes built-in health monitoring:
- Tracks consecutive failures
- Automatic recovery attempts
- Health check intervals
- Performance monitoring

## 🔒 Security

- Never commits sensitive files (respects `.gitignore`)
- Configurable exclude patterns
- Doesn't modify git configuration
- Respects existing authentication

## 🚀 Integration

### GitHub Actions
The automation works seamlessly with GitHub Actions and other CI/CD systems.

### IDE Integration
Can be integrated with VS Code, WebStorm, or other IDEs as an external tool.

### Deployment
Automatically pushes changes that trigger your deployment pipelines.

## 📝 License

This automation script is part of the FBMS project and follows the same licensing terms.

---

**Note**: This is an automated backup solution. For production deployments, consider using proper CI/CD pipelines with appropriate testing and review processes.