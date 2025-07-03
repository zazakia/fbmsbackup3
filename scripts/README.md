# Git Workflow Scripts

This directory contains scripts to automate your git workflow for the FBMS project.

## Quick Start

### Option 1: NPM Scripts (Recommended)

```bash
# Quick push with default message
npm run push

# Quick push with custom message
npm run push "Your commit message here"

# Quick push with deployment
npm run push:deploy "Your commit message here"

# Full git workflow (staging, commit, push, PR)
npm run git:workflow

# Full git workflow with deployment
npm run git:deploy "Your commit message here"

# Build and deploy to Netlify
npm run deploy

# Build only
npm run deploy:build

# Deploy to Netlify only (assumes build is done)
npm run deploy:netlify
```

### Option 2: Direct Script Execution

```bash
# Quick push script
./scripts/quick-push.js "Your commit message"
./scripts/quick-push.js "Your commit message" --deploy

# Full workflow script
./scripts/git-workflow.sh "Your commit message" "branch-name"
./scripts/git-workflow.sh "Your commit message" "branch-name" --deploy
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
npm run push:deploy "Fix mobile layout"  # Push + deploy
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
npm run git:deploy "Message"            # Interactive mode + deploy
./scripts/git-workflow.sh "Message"     # With commit message
./scripts/git-workflow.sh "Message" "feature-branch"  # With branch
./scripts/git-workflow.sh "Message" "feature-branch" --deploy  # With branch + deploy
```

### 3. `deploy` (NPM Script)
**Purpose**: Build and deploy to Netlify
**Features**:
- ✅ Build the project
- ✅ Deploy to production
- ✅ Uses existing Netlify configuration

**Usage**:
```bash
npm run deploy              # Build + deploy
npm run deploy:build        # Build only
npm run deploy:netlify      # Deploy only (assumes build is done)
```

## Workflow Examples

### Daily Development Workflow
```bash
# 1. Make your changes
# 2. Quick push
npm run push "Add customer search feature"

# 3. Deploy (if needed)
npm run deploy

# OR combine push + deploy in one command
npm run push:deploy "Add customer search feature"
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

# OR combine fix + push + deploy in one command
npm run push:deploy "Fix critical bug in POS system"
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

## Netlify CLI Setup (Required for Deployment)

For automatic deployment, install Netlify CLI:

```bash
# Install globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link your project (first time only)
netlify link
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