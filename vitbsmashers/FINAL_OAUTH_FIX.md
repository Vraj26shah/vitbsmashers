# 🚨 FINAL OAuth Fix - Step by Step

## 🔍 **Current Error:**
```
TokenError: The OAuth client was not found.
code: "invalid_client"
```

## ✅ **CRITICAL STEPS TO FIX:**

### **Step 1: Google Cloud Console Setup**

1. **Go to Google Cloud Console:**
   - Visit [console.cloud.google.com](https://console.cloud.google.com/)
   - **IMPORTANT:** Make sure you're in the correct project

2. **Navigate to Credentials:**
   - Go to **APIs & Services** → **Credentials**

3. **Find or Create OAuth 2.0 Client ID:**
   - Look for existing OAuth client
   - If not found, click **+ CREATE CREDENTIALS** → **OAuth client ID**

4. **Configure OAuth Client:**
   ```
   Application type: Web application
   Name: VIT Bsmashers App
   
   Authorized JavaScript origins:
   https://vitbsmashers.onrender.com
   http://localhost:4000
   
   Authorized redirect URIs:
   https://vitbsmashers.onrender.com/api/v1/auth/google/direct-callback
   https://vitbsmashers.onrender.com/api/v1/auth/google/callback
   http://localhost:4000/api/v1/auth/google/callback
   ```

5. **Save and Copy Credentials:**
   - Copy **Client ID** (should be ~70 characters)
   - Copy **Client Secret** (should be ~24 characters)

### **Step 2: Update Render Environment Variables**

Go to Render Dashboard → Your Service → Environment:

**Set these EXACTLY (no trailing spaces/newlines):**
```
GOOGLE_CLIENT_ID=150852944049-7lc98etm075d5t3fveff420n0l34uk2q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=[YOUR_CLIENT_SECRET_HERE]
GOOGLE_CALLBACK_URL=https://vitbsmashers.onrender.com/api/v1/auth/google/direct-callback
NODE_ENV=production
JWT_SECRET=your-secure-random-jwt-secret
FRONTEND_URL=https://vitbsmashers.onrender.com
```

### **Step 3: Frontend Client ID**

✅ **Already Updated!** The frontend has been updated with your new Client ID:
- `vitbsmashers/frontend/index.html` (meta tag and JavaScript)

### **Step 4: Redeploy**

1. **Commit changes** (if you updated Client ID)
2. **Go to Render Dashboard**
3. **Click "Manual Deploy"** → **"Deploy latest commit"**
4. **Wait for deployment** to complete

### **Step 5: Test**

1. **Visit:** `https://vitbsmashers.onrender.com`
2. **Click:** "Sign in with Google"
3. **Should redirect to Google** (not show 500 error)
4. **Complete OAuth** and get redirected to profile

## 🧪 **Debug Commands:**

**Check environment variables on Render:**
```bash
node debug-oauth-config.js
```

**Test OAuth endpoint:**
```bash
curl -I https://vitbsmashers.onrender.com/api/v1/auth/google/direct-callback
```

## 🎯 **Why This Error Occurs:**

The "OAuth client was not found" error happens when:
1. **Client ID doesn't exist** in Google Cloud Console
2. **Wrong Client ID** in environment variables
3. **Missing Client Secret** in environment variables
4. **Wrong Google Cloud project** selected

## 🔧 **Alternative: Create New OAuth Client**

If your current OAuth client is corrupted:

1. **Delete existing OAuth client** in Google Console
2. **Create new one** with the configuration above
3. **Update Client ID** in both Render environment and frontend code
4. **Redeploy**

## ⚠️ **IMPORTANT NOTES:**

- The JavaScript module error in config.js is fixed
- The direct OAuth callback bypasses Passport.js issues
- Both callback URLs are configured for maximum compatibility
- Environment variables must be set EXACTLY as shown

**Follow these steps in order and your OAuth will work!**