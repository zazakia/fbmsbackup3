# FBMS Deployment Guide

This document outlines the updated deployment workflow using Git, Netlify CLI, and Vercel CLI.

## Prerequisites

All required CLIs are already installed:
- ✅ Git (version 2.48.1)
- ✅ Netlify CLI (version 22.2.1)
- ✅ Vercel CLI (version 44.7.3)

## Updated npm Scripts

### Quick Deployment Commands
```bash
# Deploy to both Netlify and Vercel (production)
npm run deploy:cli

# Deploy to specific platform
npm run deploy:cli:netlify    # Netlify only
npm run deploy:cli:vercel     # Vercel only

# Deploy to staging environment
npm run deploy:cli:staging
```

### Traditional Commands (still available)
```bash
# Individual platform deployments
npm run deploy:netlify        # Netlify production
npm run deploy:netlify:staging
npm run deploy:vercel         # Vercel production
npm run deploy:vercel:staging

# Build and deploy
npm run deploy                # Default (Netlify)
npm run deploy:all            # Both platforms
npm run deploy:preview        # Netlify preview
```

## Advanced CLI Deployment Script

The new `scripts/deploy-cli.sh` script provides comprehensive deployment options:

### Basic Usage
```bash
# Deploy to all platforms (production)
./scripts/deploy-cli.sh

# Deploy to specific platform
./scripts/deploy-cli.sh --platform netlify
./scripts/deploy-cli.sh --platform vercel

# Deploy to staging
./scripts/deploy-cli.sh --env staging
```

### Advanced Options
```bash
# Skip build (use existing dist/)
./scripts/deploy-cli.sh --skip-build

# Skip git operations
./scripts/deploy-cli.sh --skip-git

# Custom commit message
./scripts/deploy-cli.sh --message "feat: add new features"

# Combined options
./scripts/deploy-cli.sh --platform vercel --env staging --message "deploy to staging"
```

### Help
```bash
./scripts/deploy-cli.sh --help
```

## Configuration Files

### Netlify (`netlify.toml`)
- ✅ Configured for npm builds
- ✅ Environment variables for production/staging
- ✅ Security headers
- ✅ SPA routing support

### Vercel (`vercel.json`)
- ✅ Updated to use npm instead of pnpm
- ✅ Environment variables configuration
- ✅ Security headers
- ✅ SPA routing support

## Environment Variables

### For Vercel Deployment
You need to configure these environment variables in your Vercel dashboard:

1. Go to https://vercel.com/pinoygym-1432/your-project-name/settings/environment-variables
2. Add the following variables:

```bash
# Production Environment Variables
VITE_PUBLIC_SUPABASE_URL=https://coqjcziquviehgyifhek.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
VITE_APP_ENV=production
```

### For Netlify
Environment variables are already configured in `netlify.toml` for different environments.

## Deployment Workflow

### Standard Workflow
1. **Development**: Make your changes locally
2. **Testing**: Run `npm test` to ensure everything works
3. **Building**: Run `npm run build` to verify build succeeds
4. **Deployment**: Use one of the deployment commands above

### Recommended Production Deployment
```bash
# Full deployment with git operations
npm run deploy:cli
```

This will:
1. Check git status and commit any changes
2. Push to remote repository
3. Build the project
4. Deploy to both Netlify and Vercel

### Quick Deployment (skip git)
```bash
# If you've already committed and pushed
./scripts/deploy-cli.sh --skip-git
```

### Emergency Deployment (existing build)
```bash
# If you have a working dist/ directory
./scripts/deploy-cli.sh --skip-build --skip-git
```

## Platform-Specific Notes

### Netlify
- Automatic deployments from git pushes
- Preview deployments for pull requests
- Custom domain support
- Built-in form handling

### Vercel
- Automatic deployments from git pushes
- Preview deployments for branches
- Edge functions support
- Custom domain support
- Target account: `pinoygym-1432`

## Troubleshooting

### Common Issues

1. **Build Fails**: Run `npm run build` locally first to debug
2. **Environment Variables Missing**: Check platform dashboards for required variables
3. **Authentication Issues**: Run `netlify login` or `vercel login`
4. **Git Issues**: Ensure you're in a git repository and have committed changes

### Debugging Commands
```bash
# Check CLI status
netlify status
vercel whoami

# Check build locally
npm run build
npm run preview

# Check environment
echo $NODE_VERSION
node --version
npm --version
```

## Security Considerations

Both platforms are configured with security headers:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options  
- Strict Transport Security
- And more...

## Performance Optimizations

- Static asset caching (1 year)
- Compression enabled
- Code splitting configured
- Lazy loading implemented

---

For more detailed deployment configuration, check the individual config files:
- `netlify.toml` - Netlify configuration
- `vercel.json` - Vercel configuration
- `scripts/deploy-cli.sh` - Advanced deployment script
