# FBMS Deployment Guide

**Filipino Business Management System - Production Deployment**

---

## 🚀 Quick Start (One Command)

```bash
# Deploy everything with one command
npm run deploy:quick "your commit message"
```

**That's it!** This single command will:
- ✅ Commit and push your changes to GitHub
- ✅ Build your React application
- ✅ Deploy to Netlify production

---

## 📋 Prerequisites

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. First-Time Setup
```bash
# Run this once to setup Netlify
./scripts/setup-netlify.sh
```

This will:
- Install Netlify CLI if needed
- Login to your Netlify account
- Link your project to a Netlify site

---

## 🎯 Deployment Commands

### **Recommended: One-Command Deploy**
```bash
# Auto-generated commit message with timestamp
npm run deploy:quick

# Custom commit message
npm run deploy:quick "add new customer management feature"

# Direct script usage
./scripts/deploy.sh "implement user authentication"
```

### **Individual Commands**
```bash
# Git operations only
npm run push                           # Push to GitHub
npm run push:deploy                    # Push to GitHub + Deploy

# Build and deploy only
npm run deploy                         # Build + Deploy to Netlify
npm run deploy:build                   # Build only
```

---

## 🔧 Manual Deployment Process

If you prefer step-by-step deployment:

### 1. Git Workflow
```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "your commit message"

# Push to GitHub
git push origin main
```

### 2. Build Application
```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build
```

### 3. Deploy to Netlify
```bash
# Deploy to production
netlify deploy --prod --dir=dist

# Or using npm script
npm run deploy:netlify
```

---

## 🌐 Deployment Environments

### **Production Deployment**
- **Platform**: Netlify
- **Domain**: Your custom domain or `*.netlify.app`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### **Preview Deployment**
```bash
# Deploy preview (not production)
netlify deploy --dir=dist

# Open preview in browser
netlify open
```

---

## 📁 Project Structure for Deployment

```
FBMS/
├── dist/                 # Built files (auto-generated)
├── src/                  # Source code
├── public/               # Static assets
├── scripts/
│   ├── deploy.sh         # One-command deploy script
│   └── setup-netlify.sh  # First-time setup
├── netlify.toml          # Netlify configuration
├── package.json          # Dependencies and scripts
└── vite.config.ts        # Build configuration
```

---

## ⚙️ Configuration Files

### **netlify.toml**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **package.json Scripts**
```json
{
  "scripts": {
    "deploy:quick": "./scripts/deploy.sh",
    "deploy": "npm run build && netlify deploy --prod --dir=dist",
    "build": "vite build"
  }
}
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### 1. Netlify CLI Not Found
```bash
# Install globally
npm install -g netlify-cli

# Verify installation
netlify --version
```

#### 2. Not Logged Into Netlify
```bash
# Login to Netlify
netlify login

# Check status
netlify status
```

#### 3. Site Not Linked
```bash
# Link existing site
netlify link

# Or create new site
netlify init
```

#### 4. Build Failures
```bash
# Check build locally
npm run build

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 5. Permission Denied on Scripts
```bash
# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/setup-netlify.sh
```

### **Environment Variables**

If your app uses environment variables:

1. **Local Development** (`.env.local`):
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

2. **Netlify Dashboard**:
   - Go to Site Settings → Environment Variables
   - Add the same variables (without `VITE_` prefix for build-time variables)

---

## 📊 Deployment Monitoring

### **Check Deployment Status**
```bash
# View recent deployments
netlify status

# View deployment logs
netlify logs

# Open site in browser
netlify open:site
```

### **Build Information**
- Build time: ~2-5 minutes
- Bundle size: ~500KB gzipped
- Performance: Lighthouse score 90+

---

## 🔄 Continuous Deployment

### **Automatic Deployment**
Set up automatic deployment on git push:

1. Connect GitHub repo to Netlify
2. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Branch**: `main`

### **Branch Previews**
- Push to feature branches automatically creates preview deployments
- Preview URLs: `deploy-preview-XX--your-site.netlify.app`

---

## 🚦 Deployment Checklist

Before deploying to production:

- [ ] ✅ All tests pass (`npm run test`)
- [ ] ✅ Build succeeds locally (`npm run build`)
- [ ] ✅ No TypeScript errors (`npm run typecheck`)
- [ ] ✅ Linting passes (`npm run lint`)
- [ ] ✅ Environment variables configured
- [ ] ✅ Database migrations applied
- [ ] ✅ Commit message is descriptive

---

## 🎉 Success! 

Your FBMS application is now deployed and accessible to users worldwide!

**Next Steps:**
- Monitor application performance
- Set up monitoring and alerts
- Configure custom domain (optional)
- Set up SSL certificate (automatic with Netlify)

---

## 📞 Need Help?

- **Netlify Documentation**: https://docs.netlify.com/
- **GitHub Issues**: Report deployment issues in your repository
- **Local Testing**: Always test `npm run build` locally before deploying

---

*Last Updated: July 4, 2025*  
*Project: Filipino Business Management System (FBMS)*