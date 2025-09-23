# 🔧 Google OAuth Authentication Fix

## 🚨 **Current Issue: 500 Error on Authentication**

The "500. That’s an error. There was an error. Please try again later. That’s all we know." error is a **Google OAuth configuration issue**.

## ✅ **Step-by-Step Fix**

### **Step 1: Update Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Click **Edit**
6. Under **Authorized redirect URIs**, add:
   ```
   https://vitbsmashers.onrender.com/api/v1/auth/google/callback
   ```
7. **Remove any old/incorrect URIs**
8. Click **Save**

### **Step 2: Verify Environment Variables on Render**

In your Render dashboard, ensure these environment variables are set:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://vitbsmashers.onrender.com/api/v1/auth/google/callback
FRONTEND_URL=https://vitbsmashers.onrender.com
```

**⚠️ IMPORTANT:** Replace `your-google-client-id` and `your-google-client-secret` with your actual values from Google Cloud Console. **Never commit real secrets to your repository!**

### **Step 3: Test Authentication Flow**

**✅ Access your full-stack application:**
- `https://vitbsmashers.onrender.com` (Frontend + Backend in one place)

**🎯 Authentication Flow:**
1. Visit `https://vitbsmashers.onrender.com`
2. Click "Sign in with Google"
3. Complete Google OAuth
4. Get redirected back to your app with authentication

### **Step 4: Clear Browser Cache**

1. Open Chrome DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. Or clear all Google OAuth cookies

## 🔍 **How Authentication Should Work**

```
User clicks "Sign in with Google" on Vercel frontend
    ↓
Frontend redirects to: https://vitbsmashers.onrender.com/api/v1/auth/google
    ↓
Google OAuth page appears
    ↓
User selects account and grants permission
    ↓
Google redirects to: https://vitbsmashers.onrender.com/api/v1/auth/google/callback
    ↓
Backend processes authentication and redirects back to Vercel with token
    ↓
User is logged in on the frontend
```

## 🐛 **Common Issues & Solutions**

### **Issue: "redirect_uri_mismatch"**
**Solution:** Add the exact callback URL to Google Cloud Console

### **Issue: "invalid_client"**
**Solution:** Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct

### **Issue: 500 Error**
**Solution:** Ensure callback URL matches exactly in both Google Console and environment variables

### **Issue: Infinite redirect loop**
**Solution:** Clear browser cookies and try again

## 🧪 **Testing Commands**

```bash
# Test if backend is responding
curl https://vitbsmashers.onrender.com/

# Test Google OAuth endpoint (should redirect to Google)
curl -I https://vitbsmashers.onrender.com/api/v1/auth/google

# Check environment variables (if you have access to Render logs)
# Look for: GOOGLE_CALLBACK_URL=...
```

## 📞 **If Issues Persist**

1. **Check Render Logs:**
   - Go to Render dashboard
   - View service logs for any error messages

2. **Verify Google Console Settings:**
   - Ensure the OAuth consent screen is configured
   - Check that your domain is authorized

3. **Test Locally First:**
   ```bash
   cd backend
   npm start
   # Test authentication on localhost:4000
   ```

## 🎯 **Final Check**

After making these changes:

1. ✅ Google Cloud Console has the correct callback URL
2. ✅ Render environment variables are set correctly
3. ✅ User accesses frontend (Vercel), not backend (Render) directly
4. ✅ Browser cache is cleared

**Authentication should now work perfectly! 🚀**