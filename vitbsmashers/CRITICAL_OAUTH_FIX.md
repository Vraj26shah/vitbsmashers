# 🚨 CRITICAL: OAuth Client Not Found Error

## 🔍 **Error Analysis:**
```
TokenError: The OAuth client was not found.
code: "invalid_client"
```

This error occurs when Google's OAuth servers cannot find your OAuth client configuration. The issue is **NOT** in your code - it's in your Google Cloud Console setup.

## ✅ **IMMEDIATE FIX STEPS:**

### **Step 1: Check Your Google Cloud Console Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **CRITICAL:** Make sure you're in the correct project
3. Go to **APIs & Services** → **Credentials**

### **Step 2: Verify OAuth 2.0 Client ID Exists**

Look for an OAuth 2.0 Client ID that shows:
- **Client ID:** `686446558105-bl2q9t63tcnei5u4ugck952tanccrpdu.apps.googleusercontent.com`

**If you DON'T see this client ID:**
- It was deleted or never created
- You're in the wrong Google Cloud project
- The client ID in your code is wrong

### **Step 3: Create New OAuth Client (If Missing)**

1. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
2. **Application type:** Web application
3. **Name:** VIT Bsmashers App
4. **Authorized JavaScript origins:**
   ```
   https://vitbsmashers.onrender.com
   http://localhost:4000
   ```
5. **Authorized redirect URIs:**
   ```
   https://vitbsmashers.onrender.com/api/v1/auth/google/callback
   http://localhost:4000/api/v1/auth/google/callback
   ```
6. Click **CREATE**
7. **Copy the new Client ID and Client Secret**

### **Step 4: Update Your Code (If Client ID Changed)**

If you created a new OAuth client, update the Client ID in:

1. **Frontend (`index.html` line 9):**
```html
<meta name="google-signin-client_id" content="YOUR-NEW-CLIENT-ID">
```

2. **Frontend (`index.html` line 509):**
```javascript
const clientId = 'YOUR-NEW-CLIENT-ID';
```

### **Step 5: Update Render Environment Variables**

Go to Render Dashboard → Your Service → Environment:

**CRITICAL: Set these EXACTLY (no extra spaces/newlines):**
```
GOOGLE_CLIENT_ID=YOUR-ACTUAL-CLIENT-ID-FROM-GOOGLE-CONSOLE
GOOGLE_CLIENT_SECRET=YOUR-ACTUAL-CLIENT-SECRET-FROM-GOOGLE-CONSOLE
GOOGLE_CALLBACK_URL=https://vitbsmashers.onrender.com/api/v1/auth/google/callback
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
```

### **Step 6: Redeploy on Render**

After updating environment variables:
1. Go to Render Dashboard
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for deployment to complete

## 🧪 **Test the Fix:**

Run this debug script on Render to verify environment variables:
```bash
node debug-oauth-config.js
```

Then test OAuth:
1. Visit `https://vitbsmashers.onrender.com`
2. Click "Sign in with Google"
3. Should redirect to Google (not show 500 error)

## 🔧 **Alternative Solution: Use Direct OAuth URL**

If the issue persists, I can modify your frontend to use Google's direct OAuth URL instead of Passport.js:

```javascript
// Direct Google OAuth (bypasses Passport.js)
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent('https://vitbsmashers.onrender.com/api/v1/auth/google/callback')}&` +
    `scope=openid email profile&` +
    `response_type=code&` +
    `prompt=select_account`;
```

## 🎯 **Root Cause:**

The error "OAuth client was not found" means:
1. **Wrong Client ID** in environment variables
2. **Missing Client ID** in Google Cloud Console
3. **Wrong Google Cloud Project** selected
4. **Client was deleted** from Google Console

**Fix the Google Cloud Console configuration first - that's the root cause!**