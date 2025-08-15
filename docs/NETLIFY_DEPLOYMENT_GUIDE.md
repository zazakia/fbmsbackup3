# 🚀 Netlify Deployment Guide

## Prerequisites

1. **Install Netlify CLI globally:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

## Option 1: Automated Deployment (Recommended)

### Using Package Scripts
```bash
# Build and deploy in one command
npm run deploy

# Or build first, then deploy
npm run build
npm run deploy:netlify
```

### Using Deploy Script
```bash
# Make script executable
chmod +x ./scripts/deploy.sh

# Run with custom commit message
./scripts/deploy.sh "Deploy with purchase order fixes"

# Or run with default message
./scripts/deploy.sh
```

## Option 2: Manual Deployment

### Step 1: Build the Project
```bash
# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

### Step 2: Deploy to Netlify
```bash
# Deploy to production
netlify deploy --prod --dir=dist

# Or deploy as draft first (for testing)
netlify deploy --dir=dist
```

## Option 3: Git-based Deployment (Easiest)

### Step 1: Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18`

### Step 2: Auto-deploy on Push
Once connected, Netlify will automatically deploy on every push to main branch.

## Environment Variables

The project is already configured with production Supabase settings in `netlify.toml`:

```toml
[context.production.environment]
  VITE_APP_ENV = "production"
  VITE_PUBLIC_SUPABASE_URL = "https://coqjcziquviehgyifhek.supabase.co"
  VITE_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Troubleshooting

### Build Fails
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Netlify CLI Issues
```bash
# Update Netlify CLI
npm install -g netlify-cli@latest

# Re-login
netlify logout
netlify login
```

### Permission Issues
```bash
# Make scripts executable
chmod +x ./scripts/*.sh

# Or run with bash directly
bash ./scripts/deploy.sh
```

## Quick Commands Summary

```bash
# Full deployment (recommended)
npm run deploy

# Manual build + deploy
npm run build && netlify deploy --prod --dir=dist

# Deploy script
./scripts/deploy.sh "Your commit message"

# Git push only
git add . && git commit -m "Update" && git push
```

## Site URLs

After deployment, your site will be available at:
- **Production:** Check Netlify dashboard for live URL
- **Staging:** Preview URLs for branch deployments

## Additional Features

- **Form handling:** Netlify automatically handles forms
- **Redirects:** Configured for SPA routing in `netlify.toml`
- **Headers:** Security headers pre-configured
- **Caching:** Optimized caching for assets