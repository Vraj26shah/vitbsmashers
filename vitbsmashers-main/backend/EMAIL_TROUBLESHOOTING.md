# Email Troubleshooting Guide

## 🚨 Quick Fixes

### Option 1: Skip Email for Development (Recommended for Testing)
Add this to your `.env` file:
```env
SKIP_EMAIL=true
```

This will skip email sending and return the OTP directly in the API response for easy testing.

### Option 2: Check Email Configuration
Run the email checker:
```bash
npm run check-email
```

## 🔧 Common Issues & Solutions

### 1. "Email authentication failed" Error

**Problem:** Invalid email credentials

**Solution for Gmail:**
1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account → Security → App passwords
3. Generate a new app password for "Mail"
4. Use the app password (not your regular password) in `EMAIL_PASSWORD`

**Your .env should look like:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App password (16 characters)
EMAIL_FROM=noreply@vitbhopal.ac.in
```

### 2. "Connection failed" Error

**Problem:** Network or configuration issues

**Solutions:**
1. Check your internet connection
2. Try different ports: 587, 465, or 2525
3. Check if your firewall is blocking the connection
4. Verify the email host is correct

### 3. "Timeout" Error

**Problem:** Connection taking too long

**Solutions:**
1. Check your internet speed
2. Try a different port
3. Use a different email service

## 📧 Email Service Configurations

### Gmail
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@vitbhopal.ac.in
```

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@vitbhopal.ac.in
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@vitbhopal.ac.in
```

### Mailtrap (Testing)
```env
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
EMAIL_FROM=noreply@vitbhopal.ac.in
```

## 🧪 Testing Without Email

### Method 1: Development Mode
Add to your `.env`:
```env
SKIP_EMAIL=true
```

The API will return the OTP in the response:
```json
{
  "status": "success",
  "message": "OTP sent to your VIT email! (Development mode - email skipped)",
  "development": {
    "otp": "123456",
    "email": "test@vitbhopal.ac.in"
  }
}
```

### Method 2: Check Server Logs
In development mode, OTPs are logged to the console:
```
🔐 DEVELOPMENT MODE - OTP for testing: 123456
📧 Email would be sent to: test@vitbhopal.ac.in
```

## 🔍 Debugging Steps

1. **Check Environment Variables:**
   ```bash
   npm run check-email
   ```

2. **Test Email Configuration:**
   ```bash
   node check-email-config.js
   ```

3. **Check Server Logs:**
   Look for detailed error messages in your server console

4. **Verify .env File:**
   Make sure your `.env` file is in the correct location and has no syntax errors

## 📋 Complete .env Example

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/vitbsmasher

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=90d

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@vitbhopal.ac.in

# Development Options
SKIP_EMAIL=true  # Set to true to skip email sending for testing
```

## 🎯 Quick Test Commands

### Test with Email Skipping
```bash
# Add SKIP_EMAIL=true to your .env file
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "testuser123@vitbhopal.ac.in",
    "password": "testpass123"
  }'
```

### Test with Real Email
```bash
# Make sure email is configured properly
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "testuser123@vitbhopal.ac.in",
    "password": "testpass123"
  }'
```

## 🆘 Still Having Issues?

1. **Check the error message** in your server console
2. **Run the email checker:** `npm run check-email`
3. **Use development mode:** Set `SKIP_EMAIL=true`
4. **Try a different email service** (Mailtrap for testing)
5. **Check your network connection** and firewall settings

The most common issue is using a regular Gmail password instead of an App Password. Make sure to generate an App Password if you're using Gmail!
