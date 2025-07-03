# Git Workflow Scripts

This directory contains scripts to automate your git workflow for the FBMS project.

## Quick Start

### Option 1: NPM Scripts (Recommended)

```bash
# Quick push with default message
npm run push

# Quick push with custom message
npm run push "Your commit message here"

# Full git workflow (staging, commit, push, PR)
npm run git:workflow

# Build and deploy to Netlify
npm run deploy
```

### Option 2: Direct Script Execution

```bash
# Quick push script
./scripts/quick-push.js "Your commit message"

# Full workflow script
./scripts/git-workflow.sh "Your commit message" "branch-name"
```

## Scripts Overview

### 1. `quick-push.js` (Node.js)
**Purpose**: Fast git add, commit, and push
**Features**:
- ✅ Add all changes
- ✅ Commit with custom message
- ✅ Push to current branch
- ✅ Colored output
- ✅ Error handling
- ✅ Status summary

**Usage**:
```bash
npm run push                    # Default message: "Update FBMS"
npm run push "Fix mobile layout"  # Custom message
```

### 2. `git-workflow.sh` (Bash)
**Purpose**: Complete git workflow including PR creation
**Features**:
- ✅ All features of quick-push
- ✅ Automatic pull request creation (if not on main)
- ✅ GitHub CLI integration
- ✅ Interactive prompts
- ✅ Branch management

**Usage**:
```bash
npm run git:workflow                    # Interactive mode
./scripts/git-workflow.sh "Message"     # With commit message
./scripts/git-workflow.sh "Message" "feature-branch"  # With branch
```

### 3. `deploy` (NPM Script)
**Purpose**: Build and deploy to Netlify
**Features**:
- ✅ Build the project
- ✅ Deploy to production
- ✅ Uses existing Netlify configuration

**Usage**:
```bash
npm run deploy
```

## Workflow Examples

### Daily Development Workflow
```bash
# 1. Make your changes
# 2. Quick push
npm run push "Add customer search feature"

# 3. Deploy (if needed)
npm run deploy
```

### Feature Branch Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and push
npm run push "Implement new feature"

# 3. Create PR (automatically with git-workflow)
npm run git:workflow "Complete new feature" "feature/new-feature"
```

### Hotfix Workflow
```bash
# 1. Quick fix and push
npm run push "Fix critical bug in POS system"

# 2. Deploy immediately
npm run deploy
```

## GitHub CLI Setup (Optional)

For automatic pull request creation, install GitHub CLI:

```bash
# Ubuntu/Debian
sudo apt install gh

# macOS
brew install gh

# Windows
winget install GitHub.cli

# Then authenticate
gh auth login
```

## Tips

1. **Use descriptive commit messages**: Instead of "fix", use "Fix mobile layout in customer form"

2. **Use feature branches**: Create branches for new features to keep main clean

3. **Regular pushes**: Push frequently to avoid losing work

4. **Check status first**: The scripts show git status before committing

5. **Review before pushing**: The scripts show what will be committed

## Troubleshooting

### Script not executable
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

### GitHub CLI not found
The script will provide a manual PR link if GitHub CLI isn't installed.

### No changes to commit
The script will warn you if there are no changes to commit.

### Permission denied
Make sure you have write access to the repository and are authenticated with GitHub. 