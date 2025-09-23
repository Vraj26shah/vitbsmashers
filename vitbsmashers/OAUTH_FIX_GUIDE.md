# 🔧 OAuth Client Error Fix Guide

## 🚨 **Current Error:**
```
TokenError: The OAuth client was not found.
code: "invalid_client"
```

This error means Google cannot find your OAuth client configuration. Here's how to fix it:

## ✅ **Step 1: Debug Current Configuration**

Run this command on Render to check your environment variables:
```bash
node debug-oauth-config.js
```

## ✅ **Step 2: Fix Google Cloud Console**

### **2.1 Go to Google Cloud Console**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**

### **2.2 Check OAuth 2.0 Client ID**
1. Find your OAuth 2.0 Client ID
2. Click **Edit** (pencil icon)
3. Verify these settings:

**Application type:** Web application

**Authorized JavaScript origins:**
```
https://vitbsmashers.onrender.com
http://localhost:4000
```

**Authorized redirect URIs:**
```
https://vitbsmashers.onrender.com/api/v1/auth/google/callback
http://localhost:4000/api/v1/auth/google/callback
```

### **2.3 Get Correct Credentials**
1. Copy the **Client ID** (should be ~70 characters ending in `.apps.googleusercontent.com`)
2. Copy the **Client Secret** (should be ~24 characters)

## ✅ **Step 3: Update Render Environment Variables**

Go to your Render dashboard → Service → Environment:

**CRITICAL: Remove any trailing newlines or spaces!**

```
GOOGLE_CLIENT_ID=686446558105-bl2q9t63tcnei5u4ugck952tanccrpdu.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
GOOGLE_CALLBACK_URL=https://vitbsmashers.onrender.com/api/v1/auth/google/callback
FRONTEND_URL=https://vitbsmashers.onrender.com
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
```

**⚠️ IMPORTANT:** 
- Don't copy-paste with extra spaces/newlines
- Type them manually if needed
- Client ID should be exactly as shown in Google Console

## ✅ **Step 4: Common Issues & Solutions**

### **Issue 1: Wrong Client ID Format**
❌ **Wrong:** `686446558105-bl2q9t63tcnei5u4ugck952tanccrpdu.apps.googleusercontent.com\n`
✅ **Correct:** `686446558105-bl2q9t63tcnei5u4ugck952tanccrpdu.apps.googleusercontent.com`

### **Issue 2: Environment Variable Not Set**
- Check Render dashboard shows the variable
- Redeploy after adding variables
- Use debug script to verify

### **Issue 3: Wrong Project in Google Console**
- Make sure you're in the correct Google Cloud project
- Check if OAuth consent screen is configured
- Verify the client hasn't been deleted

### **Issue 4: Callback URL Mismatch**
- Must match exactly: `https://vitbsmashers.onrender.com/api/v1/auth/google/callback`
- No trailing slashes
- HTTPS in production

## ✅ **Step 5: Test the Fix**

1. **Redeploy on Render** after updating environment variables
2. **Wait for deployment** to complete
3. **Test OAuth flow:**
   - Visit `https://vitbsmashers.onrender.com`
   - Click "Sign in with Google"
   - Should redirect to Google (not show error)

## 🔍 **Debugging Commands**

```bash
# Check if environment variables are loaded
node debug-oauth-config.js

# Test OAuth endpoint (should redirect to Google)
curl -I https://vitbsmashers.onrender.com/api/v1/auth/google

# Check server logs in Render dashboard for detailed errors
```

## 📞 **If Still Not Working**

1. **Double-check Google Console settings**
2. **Verify environment variables are saved in Render**
3. **Check Render deployment logs for errors**
4. **Try creating a new OAuth client in Google Console**

The error "OAuth client was not found" is almost always due to:
- Wrong `GOOGLE_CLIENT_ID` 
- Missing environment variables
- Incorrect Google Cloud Console configuration

**Fix these and your authentication will work!**