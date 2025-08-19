# 🔐 GitHub Secrets Setup

## Direct Link to Add Secrets
**Go to**: https://github.com/zazakia/fbmsbackup3/settings/secrets/actions

## Required Secrets to Add

Click "**New repository secret**" for each of these:

### 1. Netlify Secrets
| Name | Value |
|------|--------|
| `NETLIFY_AUTH_TOKEN` | Your Netlify personal access token from Step 1 |
| `NETLIFY_SITE_ID` | Your Netlify site ID from Step 1 |

### 2. Vercel Secrets  
| Name | Value |
|------|--------|
| `VERCEL_TOKEN` | Your Vercel token from Step 2 |
| `VERCEL_ORG_ID` | `team_GsF3U4BmeU1EC1CRdsGDUnd6` |
| `VERCEL_PROJECT_ID` | `prj_2hreKhdRsGAIg1TcSGBgjzeXR141` |

### 3. Supabase Secrets (Application Environment)
| Name | Value |
|------|--------|
| `VITE_PUBLIC_SUPABASE_URL` | `https://coqjcziquviehgyifhek.supabase.co` |
| `VITE_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

## Step-by-Step Instructions

1. **Open the link**: https://github.com/zazakia/fbmsbackup3/settings/secrets/actions

2. **For each secret above**:
   - Click "**New repository secret**"
   - Enter the **Name** (exactly as shown above)
   - Paste the **Value** 
   - Click "**Add secret**"

3. **Verify**: You should see 6 secrets total when done:
   - ✅ NETLIFY_AUTH_TOKEN
   - ✅ NETLIFY_SITE_ID  
   - ✅ VERCEL_TOKEN
   - ✅ VERCEL_ORG_ID
   - ✅ VERCEL_PROJECT_ID
   - ✅ VITE_PUBLIC_SUPABASE_URL
   - ✅ VITE_PUBLIC_SUPABASE_ANON_KEY

## What These Do

- **Netlify secrets**: Allow GitHub Actions to deploy to your Netlify site
- **Vercel secrets**: Allow GitHub Actions to deploy to your Vercel project  
- **Supabase secrets**: Provide your app with database connection during build

## After Adding Secrets

Once all secrets are added:
1. Push any commit to `main` branch
2. Watch the deployment at: https://github.com/zazakia/fbmsbackup3/actions
3. See your live site deploy automatically!

## Troubleshooting

- **Invalid token errors**: Double-check you copied tokens correctly
- **Site not found errors**: Verify Site ID and Project ID are correct
- **Build failures**: Check that Supabase URL and key are valid
