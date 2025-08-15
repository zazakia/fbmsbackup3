# Git Workflow for Multi-Computer Development

## 🎯 **Overview**
This guide provides the best practices and commands for working on the same project across multiple computers using Git.

## �� **Recommended Workflow**

### **Computer A (Starting Work)**
```bash
# 1. Pull latest changes before starting
git pull origin main

# 2. Create feature branch (if working on new feature)
git checkout -b feature/your-feature-name

# 3. Make your changes and commit
git add .
git commit -m "Your commit message"

# 4. Push to remote
git push origin feature/your-feature-name
```

### **Computer B (Continuing Work)**
```bash
# 1. Pull latest changes
git pull origin main

# 2. Switch to your feature branch
git checkout feature/your-feature-name

# 3. If branch doesn't exist locally, fetch and checkout
git fetch origin
git checkout -b feature/your-feature-name origin/feature/your-feature-name

# 4. Continue working and commit
git add .
git commit -m "Continue working on feature"

# 5. Push changes
git push origin feature/your-feature-name
```

### **Back to Computer A**
```bash
# 1. Pull latest changes from your branch
git pull origin feature/your-feature-name

# 2. Continue working...
```

## 📋 **Daily Workflow Commands**

### **Starting Work (Both Computers)**
```bash
# Always pull first
git pull origin main
git pull origin your-branch-name  # if working on feature branch
```

### **Before Switching Computers**
```bash
# Commit and push your current work
git add .
git commit -m "WIP: Save progress before switching computers"
git push origin your-branch-name
```

### **After Switching Computers**
```bash
# Pull latest changes
git pull origin your-branch-name
```

## 🌿 **Feature Branch Workflow**

### **1. Create Feature Branch**
```bash
# Create and switch to new feature branch
git checkout -b feature/new-feature

# Or create from main
git checkout main
git pull origin main
git checkout -b feature/new-feature
```

### **2. Work on Feature**
```bash
# Make changes, then commit frequently
git add .
git commit -m "Add user authentication"

git add .
git commit -m "Fix login validation"

git add .
git commit -m "Update styling for dashboard"
```

### **3. Push Feature Branch**
```bash
# Push feature branch to remote
git push origin feature/new-feature
```

### **4. Merge to Main (When Feature is Complete)**
```bash
# Switch to main and pull latest
git checkout main
git pull origin main

# Merge feature branch
git merge feature/new-feature

# Push to main
git push origin main

# Delete feature branch (optional)
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

## 🛠 **Essential Git Commands**

### **Status and Information**
```bash
git status                    # See what's changed
git log --oneline -5         # See last 5 commits
git branch -a                # See all branches
git remote -v                # See remote repositories
```

### **Branch Management**
```bash
git branch                   # List local branches
git branch -r                # List remote branches
git branch -a                # List all branches
git checkout branch-name     # Switch to branch
git checkout -b new-branch   # Create and switch to new branch
git branch -d branch-name    # Delete local branch
```

### **Stash Work (Temporary Save)**
```bash
git stash                    # Save work without committing
git stash pop                # Restore stashed work
git stash list               # See stashed changes
git stash drop               # Delete last stash
git stash clear              # Delete all stashes
```

### **Reset and Undo**
```bash
git reset --soft HEAD~1      # Undo last commit, keep changes
git reset --hard HEAD~1      # Undo last commit, discard changes
git reset --hard origin/main # Reset to match remote main
```

## 📝 **Commit Message Best Practices**

### **Conventional Commits Format**
```bash
# Feature
git commit -m "feat: add user authentication system"

# Bug fix
git commit -m "fix: resolve login validation bug"

# Documentation
git commit -m "docs: update README with setup instructions"

# Style changes
git commit -m "style: update button styling"

# Refactor
git commit -m "refactor: simplify authentication logic"

# Test
git commit -m "test: add unit tests for user service"

# Chore
git commit -m "chore: update dependencies"
```

### **Commit Message Guidelines**
- Use present tense ("add" not "added")
- Use imperative mood ("move cursor" not "moves cursor")
- Keep first line under 50 characters
- Use body for detailed explanation if needed

## 🔧 **Initial Setup (Do Once)**

### **Configure Git Identity**
```bash
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify settings
git config --list
```

### **Set up SSH Keys (Recommended)**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (Linux/Mac)
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard

# Add to GitHub/GitLab in your account settings
```

### **Configure Default Branch**
```bash
# Set default branch name
git config --global init.defaultBranch main
```

## 🚨 **Common Issues and Solutions**

### **Merge Conflicts**
```bash
# If you get merge conflicts
git status                    # See conflicted files
# Edit conflicted files manually
git add .                     # Mark conflicts as resolved
git commit -m "Resolve merge conflicts"
```

### **Stuck on Wrong Branch**
```bash
# Save current work
git stash

# Switch to correct branch
git checkout correct-branch

# Apply saved work
git stash pop
```

### **Forgot to Pull Before Push**
```bash
# If push is rejected
git pull origin main          # Pull latest changes
git push origin main          # Try push again
```

### **Reset to Remote State**
```bash
# If you want to completely reset to remote
git fetch origin
git reset --hard origin/main
```

## 📱 **Quick Reference Card**

### **Starting Work**
```bash
git pull origin main
git checkout your-branch  # if working on feature
```

### **Saving Work**
```bash
git add .
git commit -m "Description of changes"
git push origin your-branch
```

### **Switching Computers**
```bash
# On Computer A: Save and push
git add . && git commit -m "WIP" && git push

# On Computer B: Pull and continue
git pull origin your-branch
```

### **Emergency Save**
```bash
# If you need to save work quickly
git stash push -m "Emergency save"
git checkout main
git pull origin main
```

## 🎯 **Pro Tips**

1. **Commit Frequently**: Small, frequent commits are better than large ones
2. **Use Descriptive Messages**: Make commits easy to understand
3. **Pull Before Push**: Always pull latest changes before pushing
4. **Use Feature Branches**: Keep main branch clean and stable
5. **Test Before Committing**: Ensure your code works before committing
6. **Use .gitignore**: Keep unnecessary files out of your repository

## 📚 **Additional Resources**

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**Remember**: The key to successful multi-computer development is **frequent commits** and **always pulling before starting work**! 🚀
