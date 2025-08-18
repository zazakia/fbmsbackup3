# 🚀 Continuous Deployment Setup Guide

This guide will help you configure continuous deployment for your FBMS project using GitHub Actions with Netlify and Vercel.

## 📋 Current Status

### ✅ Configured
- **Git Repository**: `https://github.com/zazakia/fbmsbackup3.git`
- **Main Branch**: `main` (auto-deploys to production)
- **Vercel Integration**: Connected to `pinoygym-1432` account
- **GitHub Actions**: Workflows created for CI/CD
- **Configuration Files**: netlify.toml and vercel.json ready

### ⚠️ Requires Setup
- GitHub repository secrets
- Netlify authentication
- Platform-specific deployment keys

## 🔧 Setup Instructions

### 1. GitHub Repository Secrets

Add these secrets to your GitHub repository settings:
`https://github.com/zazakia/fbmsbackup3/settings/secrets/actions`

#### Netlify Secrets
```bash
NETLIFY_AUTH_TOKEN=your_netlify_personal_access_token
NETLIFY_SITE_ID=your_netlify_site_id
```

#### Vercel Secrets  
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=team_GsF3U4BmeU1EC1CRdsGDUnd6
VERCEL_PROJECT_ID=prj_2hreKhdRsGAIg1TcSGBgjzeXR141
```

#### Application Secrets
```bash
VITE_PUBLIC_SUPABASE_URL=https://coqjcziquviehgyifhek.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional staging secrets
VITE_STAGING_SUPABASE_URL=your_staging_supabase_url
VITE_STAGING_SUPABASE_ANON_KEY=your_staging_anon_key
```

### 2. Get Required Tokens

#### Netlify Auth Token
1. Go to https://app.netlify.com/user/applications#personal-access-tokens
2. Click "New access token"
3. Name it "GitHub Actions"
4. Copy the token

#### Netlify Site ID
1. Go to your site dashboard in Netlify
2. Site settings → General → Site details
3. Copy the "Site ID"

#### Vercel Token
1. Go to https://vercel.com/account/tokens
2. Create a new token named "GitHub Actions"
3. Copy the token

### 3. Connect Repositories to Platforms

#### Netlify Setup
```bash
# Authenticate with Netlify
netlify login

# Link your repository (run in project directory)
netlify link --name your-site-name

# Check connection
netlify status
```

#### Vercel Setup
```bash
# Already linked! Verify with:
vercel whoami
vercel ls

# If needed to re-link:
vercel link --yes
```

### 4. Platform Dashboard Configuration

#### Netlify Dashboard
1. Go to https://app.netlify.com/sites/your-site-name/settings/deploys
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18
3. **Environment variables** (already in netlify.toml):
   - `VITE_PUBLIC_SUPABASE_URL`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV=production`
4. **Deploy settings**:
   - ✅ Enable "Deploy only production branch"
   - Set production branch to `main`
   - ✅ Enable "Deploy previews" for pull requests

#### Vercel Dashboard  
1. Go to https://vercel.com/pinoygym-1432/fbmsbackup3/settings
2. **Git Integration**:
   - ✅ Connected to GitHub repository
   - Production branch: `main`
   - Install Vercel GitHub app if needed
3. **Environment Variables**:
   - Add production environment variables
   - `VITE_PUBLIC_SUPABASE_URL`
   - `VITE_PUBLIC_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV=production`

## 🔄 Deployment Workflows

### Automatic Deployments

#### Production (main branch)
```bash
# Push to main triggers:
git push origin main
```
**Result**: 
- ✅ GitHub Actions runs tests & build
- ✅ Deploys to Netlify production
- ✅ Deploys to Vercel production

#### Staging (develop/staging branches)  
```bash
# Push to staging triggers:
git push origin staging
```
**Result**:
- ✅ GitHub Actions runs tests & build  
- ✅ Deploys to Netlify preview
- ✅ Deploys to Vercel preview

#### Pull Request Previews
```bash
# Create PR to main triggers:
# Automatic preview deployments
```
**Result**:
- ✅ GitHub Actions runs tests & build
- ✅ Creates Netlify deploy preview
- ✅ Creates Vercel preview deployment
- ✅ Comments on PR with preview URLs

### Manual Deployments (Fallback)

```bash
# CLI deployments (as backup)
npm run deploy:cli              # Deploy to both platforms
npm run deploy:cli:netlify     # Netlify only
npm run deploy:cli:vercel      # Vercel only
npm run deploy:cli:staging     # Staging environment

# Advanced CLI options
./scripts/deploy-cli.sh --platform netlify --env staging
```

## 📁 File Structure

```
fbmsbackup3/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Main production deployment
│       └── deploy-staging.yml  # Staging deployment
├── .netlify/
│   └── netlify.toml           # Local Netlify config
├── .vercel/
│   └── project.json           # Vercel project link
├── scripts/
│   └── deploy-cli.sh          # Manual deployment script  
├── netlify.toml               # Netlify configuration
├── vercel.json                # Vercel configuration
└── package.json               # Updated with new scripts
```

## 🔍 Testing the Setup

### 1. Test Build Locally
```bash
npm install
npm run test
npm run build
npm run preview
```

### 2. Test GitHub Actions
```bash
# Make a small change and push
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger deployment"
git push origin main
```

### 3. Check Deployment Status
- **GitHub**: https://github.com/zazakia/fbmsbackup3/actions
- **Netlify**: https://app.netlify.com/sites/your-site-name/deploys
- **Vercel**: https://vercel.com/pinoygym-1432/fbmsbackup3

## 🚨 Troubleshooting

### Common Issues

#### GitHub Actions Failing
```bash
# Check secrets are set correctly
# Verify build passes locally first
npm run build
```

#### Netlify Connection Issues
```bash
# Re-authenticate
netlify logout
netlify login
netlify link
```

#### Vercel Connection Issues  
```bash
# Check token and project
vercel whoami
vercel ls
vercel link --yes
```

#### Build Failures
```bash
# Check environment variables
# Verify Node version (18)
# Check dependencies
npm ci
npm run build
```

### Debug Commands
```bash
# Check Git setup
git remote -v
git branch -a

# Check platform status  
netlify status
vercel whoami

# Test local deployment
./scripts/deploy-cli.sh --skip-git --help
```

## 🎯 Benefits of This Setup

### ✅ Automatic Deployment
- **Zero-touch production deployments** from `main` branch
- **Preview deployments** for every pull request  
- **Staging deployments** from `develop`/`staging` branches

### ✅ Quality Assurance
- **Automated testing** before deployment
- **Linting** and code quality checks
- **Build verification** before going live

### ✅ Multi-Platform Redundancy
- **Netlify**: Primary hosting with global CDN
- **Vercel**: Secondary hosting with edge functions
- **Automatic failover** if one platform has issues

### ✅ Developer Experience
- **Preview URLs** in pull request comments
- **Deployment status** in GitHub
- **Easy rollbacks** through GitHub releases
- **Manual CLI fallback** always available

## 📞 Next Steps

1. **Add the GitHub secrets** using the tokens obtained above
2. **Test the workflow** by pushing a commit to `main`
3. **Verify deployments** in both platform dashboards
4. **Set up branch protection rules** to require PR reviews
5. **Configure custom domains** in platform settings

---

**Need Help?** Check the deployment logs:
- GitHub Actions: Repository → Actions tab
- Netlify: Site dashboard → Deploys
- Vercel: Project dashboard → Functions/Deployments
