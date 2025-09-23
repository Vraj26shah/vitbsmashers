# 🚀 OAuth Production Setup Guide

## 🎯 **Goal: Move from Testing to Production**

To make your OAuth app work normally without test user restrictions, you need to **publish your app** through Google's verification process.

## ✅ **Step-by-Step Production Setup**

### **Step 1: Prepare Your App Information**

Before publishing, gather this information:

**App Information:**
- **App name:** VIT Bsmashers
- **User support email:** Your email (e.g., vitbsmashers@gmail.com)
- **Developer contact information:** Your details

**App Domain:**
- **Application home page:** `https://vitbsmashers.onrender.com`
- **Application privacy policy:** You'll need to create one
- **Application terms of service:** You'll need to create one

### **Step 2: Create Privacy Policy and Terms of Service**

You need these legal documents. You can create simple ones:

**Privacy Policy URL:** Create a simple HTML page and host it
**Terms of Service URL:** Create a simple HTML page and host it

Example privacy policy content:
```html
<!DOCTYPE html>
<html>
<head><title>VIT Bsmashers Privacy Policy</title></head>
<body>
<h1>VIT Bsmashers Privacy Policy</h1>
<p>This app collects basic Google profile information (name, email) for authentication purposes only.</p>
<p>We do not share your data with third parties.</p>
<p>Contact: vitbsmashers@gmail.com</p>
</body>
</html>
```

### **Step 3: Update OAuth Consent Screen**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **OAuth consent screen**
3. Fill in all required fields:

**App Information:**
- App name: VIT Bsmashers
- User support email: [your-email]
- Developer contact information: [your-email]

**App Domain:**
- Application home page: `https://vitbsmashers.onrender.com`
- Application privacy policy: [URL to your privacy policy]
- Application terms of service: [URL to your terms of service]

**Authorized domains:**
- `vitbsmashers.onrender.com`

**Developer contact information:**
- Email addresses: [your-email]

### **Step 4: Add Scopes (if needed)**

Your current scopes are basic (openid, profile, email), so no additional setup needed.

### **Step 5: Submit for Verification**

1. Click **SAVE AND CONTINUE** through all sections
2. At the end, click **BACK TO DASHBOARD**
3. Click **PUBLISH APP**
4. Google will review your app (can take 24-72 hours)

## 🔧 **Alternative: Remove Domain Restriction**

If you want quicker access but still restrict to VIT emails, you can modify the code:

**Option A: Remove domain restriction temporarily:**
```javascript
// In vitbsmashers/backend/config/passport.js
authorizationParams: {
  prompt: 'select_account',
  access_type: 'offline'
  // Remove: hd: 'vitbhopal.ac.in'
}
```

**Option B: Add domain validation in your code instead:**
```javascript
// Keep the hd parameter but validate in your callback
if (!email.endsWith('@vitbhopal.ac.in')) {
  return done(new Error('Only VIT Bhopal emails allowed'), null);
}
```

## ⚠️ **Important Notes**

### **Verification Requirements:**
- Google may request additional documentation
- Business verification might be required
- The process can take several days

### **During Verification:**
- Your app remains in testing mode
- Only test users can access it
- Once approved, it becomes available to all users

### **Costs:**
- Basic OAuth verification is free
- Some advanced features may require billing

## 🧪 **Testing Production Setup**

After publishing:

1. **Wait for approval** (check email and console)
2. **Test with any Google account** (no more test user restrictions)
3. **Verify domain restriction still works** (if kept)

## 📞 **If Verification is Rejected**

Common reasons:
- Incomplete privacy policy/terms
- Missing developer contact info
- Suspicious app behavior

**Fix and resubmit.**

## 🎯 **Quick Alternative for Development**

For immediate development access, add test users as shown in `OAUTH_SECURITY_FIX.md`. This allows you to continue development while waiting for production verification.

**Choose: Test users (quick) vs Production publishing (permanent solution)**