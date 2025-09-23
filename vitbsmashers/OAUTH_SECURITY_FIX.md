# 🚨 OAuth Security Policy Fix

## 🔍 **Current Error:**
```
TokenError: You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy for keeping apps secure.
code: 'invalid_request'
```

## ✅ **Root Cause:**

This error occurs because your Google OAuth app is in **Testing mode** and restricts sign-ins to users with `@vitbhopal.ac.in` email addresses, but those users are not added as **test users** in Google Cloud Console.

## 🛠️ **IMMEDIATE FIX:**

### **Step 1: Access Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with your OAuth client)
3. Navigate to **APIs & Services** → **OAuth consent screen**

### **Step 2: Add Test Users**

1. In the OAuth consent screen, scroll down to **Test users** section
2. Click **+ ADD USERS**
3. Add email addresses of users who need to sign in:
   ```
   your-email@vitbhopal.ac.in
   friend1@vitbhopal.ac.in
   friend2@vitbhopal.ac.in
   ```
4. Click **SAVE**

### **Step 3: Verify App Status**

Your app should show:
- **Publishing status:** Testing
- **Test users:** List of added emails

## 🔧 **Alternative Solutions:**

### **Option A: Publish App for Production**
1. In OAuth consent screen, click **PUBLISH APP**
2. Complete Google's verification process (requires business info, privacy policy, etc.)
3. **Note:** This takes time and may not be suitable for development

### **Option B: Remove Domain Restriction (Temporary)**
If you want to allow any Google account during development:

```javascript
// In vitbsmashers/backend/config/passport.js, remove or comment out:
authorizationParams: {
  prompt: 'select_account',
  access_type: 'offline',
  // hd: 'vitbhopal.ac.in'  // Remove this line temporarily
}
```

## 🧪 **Test the Fix:**

1. Add your email as a test user in Google Cloud Console
2. Wait 5-10 minutes for changes to propagate
3. Try signing in again at `https://vitbsmashers.onrender.com`
4. Should now redirect to Google OAuth (not show the error)

## 📋 **Why This Happens:**

- Google requires OAuth apps to be verified before allowing domain restrictions
- Apps in testing mode can only be used by explicitly added test users
- The `hd=vitbhopal.ac.in` parameter in your passport config triggers this security check

## ⚡ **Quick Debug:**

Run this to check your current OAuth config:
```bash
cd backend && node debug-oauth-config.js
```

**Add test users to fix the security policy error!**