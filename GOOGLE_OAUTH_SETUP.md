# Google OAuth Setup Guide for FBMS

## 📋 Overview
This guide shows you how to configure Google OAuth login for your FBMS application.

## 🛠️ Setup Steps

### 1. **Get Google OAuth Credentials**

#### A. Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API and Google OAuth2 API

#### B. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Choose **Web application**
4. Configure the following:

**Authorized JavaScript origins:**
```
http://localhost:5180
http://localhost:3000
https://yourdomain.com
```

**Authorized redirect URIs:**
```
http://localhost:5180/auth/callback
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
https://coqjcziquviehgyifhek.supabase.co/auth/v1/callback
```

### 2. **Configure Environment Variables**

Add these to your `.env` file:

```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_key_here
```

### 3. **Configure Supabase**

#### A. Supabase Dashboard Setup
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication > Providers**
3. Enable **Google** provider
4. Add your Google credentials:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret

#### B. Update Redirect URLs in Supabase
Add these redirect URLs in Supabase Auth settings:
```
http://localhost:5180/auth/callback
http://localhost:3000/auth/callback
https://yourdomain.com/auth/callback
```

### 4. **Verify Implementation**

The Google OAuth is already implemented in FBMS. Check these files:

#### `src/store/supabaseAuthStore.ts`
```typescript
signInWithGoogle: async () => {
  set({ isLoading: true, error: null, hasLoggedOut: false });
  
  try {
    const { error } = await supabaseAnon.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    set({ 
      isLoading: false, 
      error: error instanceof Error ? error.message : 'Google sign-in failed' 
    });
    throw error;
  }
}
```

#### Login Form Components
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/ModernLoginForm.tsx`

Both already have Google login buttons implemented.

### 5. **Test the Integration**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to login page**
3. **Click "Continue with Google" button**
4. **Verify the OAuth flow works**

## 🔧 Troubleshooting

### Common Issues:

#### 1. **"redirect_uri_mismatch" Error**
- Ensure all redirect URIs match exactly in Google Cloud Console
- Include both localhost and your domain
- Don't forget the Supabase callback URL

#### 2. **"unauthorized_client" Error**
- Verify Client ID and Secret are correct
- Check that OAuth is enabled in Supabase
- Ensure the Google+ API is enabled

#### 3. **CORS Issues**
- Add your domain to authorized origins
- Include all ports you're using (5180, 3000, etc.)

#### 4. **Environment Variables Not Loading**
- Restart your development server after adding env vars
- Ensure `.env` file is in the project root
- Check that variables start with `VITE_`

## 📱 Additional OAuth Providers

### GitHub OAuth
```env
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Facebook OAuth
```env
VITE_FACEBOOK_CLIENT_ID=your_facebook_app_id
VITE_FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

## 🔒 Security Notes

1. **Never commit secrets to version control**
2. **Use different OAuth apps for development and production**
3. **Regularly rotate OAuth secrets**
4. **Monitor OAuth usage in Google Cloud Console**
5. **Implement proper error handling**

## 📝 Current Implementation Status

✅ **Already Implemented:**
- Google OAuth button in login forms
- Supabase OAuth integration
- Error handling and loading states
- Redirect flow handling
- User profile creation after OAuth

❌ **Still Needed:**
- Google Client ID/Secret configuration
- Supabase provider configuration
- Domain verification in Google Console

## 🎯 Next Steps

1. **Get Google OAuth credentials** from Google Cloud Console
2. **Add credentials to `.env`** file
3. **Configure Supabase provider** in dashboard
4. **Test the login flow**
5. **Deploy with production credentials**

---

*For support, check the [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) or [Supabase Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)*