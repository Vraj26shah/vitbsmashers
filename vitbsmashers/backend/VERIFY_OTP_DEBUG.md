# Verify OTP Endpoint Debugging Guide

## 🚨 The Issue

You're getting this error when calling `/verify-otp`:
```
"You are not logged in! Please log in to get access."
```

## 🔍 Root Cause Analysis

This error typically occurs when:

1. **Wrong HTTP Method** - Using GET instead of POST
2. **Wrong URL** - Incorrect endpoint path
3. **Missing Request Body** - No JSON data sent
4. **Wrong Content-Type Header** - Missing or incorrect header
5. **Server Route Configuration** - Routes not properly set up

## ✅ Correct Usage

### Proper cURL Command:
```bash
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@vitbhopal.ac.in",
    "otp": "123456"
  }'
```

### Proper Request:
- **Method:** POST
- **URL:** `http://localhost:4000/api/v1/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Body:** JSON with `email` and `otp` fields

## 🧪 Testing Steps

### Step 1: Run the Test Script
```bash
npm install  # Install node-fetch if not already installed
npm run test-verify
```

This will:
1. Test signup and get OTP
2. Test verify-otp with correct data
3. Test various error scenarios

### Step 2: Manual Testing

**First, signup to get an OTP:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "testuser123@vitbhopal.ac.in",
    "password": "testpass123"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "OTP sent to your VIT email! (Development mode - email skipped)",
  "development": {
    "otp": "123456",
    "email": "testuser123@vitbhopal.ac.in"
  }
}
```

**Then verify the OTP:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@vitbhopal.ac.in",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "...",
      "username": "testuser123",
      "email": "testuser123@vitbhopal.ac.in",
      "isVerified": true
    }
  }
}
```

## ❌ Common Mistakes

### 1. Wrong HTTP Method
```bash
# ❌ Wrong - Using GET
curl http://localhost:4000/api/v1/auth/verify-otp

# ✅ Correct - Using POST
curl -X POST http://localhost:4000/api/v1/auth/verify-otp
```

### 2. Missing Content-Type Header
```bash
# ❌ Wrong - Missing header
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -d '{"email": "test@vitbhopal.ac.in", "otp": "123456"}'

# ✅ Correct - With header
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@vitbhopal.ac.in", "otp": "123456"}'
```

### 3. Wrong URL
```bash
# ❌ Wrong - Missing /auth
curl -X POST http://localhost:4000/api/v1/verify-otp

# ✅ Correct - Full path
curl -X POST http://localhost:4000/api/v1/auth/verify-otp
```

### 4. Missing Request Body
```bash
# ❌ Wrong - No data
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json"

# ✅ Correct - With data
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@vitbhopal.ac.in", "otp": "123456"}'
```

## 🔧 Troubleshooting

### 1. Check Server Status
```bash
curl http://localhost:4000/
```
Should return: `"VIT Bhopal Authentication Service"`

### 2. Check Routes
```bash
curl http://localhost:4000/api/v1/auth/signup
```
Should return a validation error (not authentication error)

### 3. Check Environment
Make sure your `.env` file has:
```env
SKIP_EMAIL=true
NODE_ENV=development
```

### 4. Check Database
```bash
npm run check-users
```

### 5. Clear Database (if needed)
```bash
npm run clear-db
```

## 📋 Complete Testing Workflow

1. **Start server:**
   ```bash
   npm run dev
   ```

2. **Clear database (if needed):**
   ```bash
   npm run clear-db
   ```

3. **Run comprehensive test:**
   ```bash
   npm run test-verify
   ```

4. **Or test manually:**
   ```bash
   # Step 1: Signup
   curl -X POST http://localhost:4000/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser123",
       "email": "testuser123@vitbhopal.ac.in",
       "password": "testpass123"
     }'
   
   # Step 2: Verify OTP (use OTP from step 1 response)
   curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{
       "email": "testuser123@vitbhopal.ac.in",
       "otp": "123456"
     }'
   ```

## 🎯 Expected Results

- **Signup:** Status 201, OTP in response
- **Verify OTP:** Status 200, JWT token in response
- **Wrong OTP:** Status 400, "Invalid or expired OTP"
- **Wrong email:** Status 404, "No user found with that email"

The `/verify-otp` endpoint is **NOT** protected by authentication middleware, so you should never get the "You are not logged in" error when calling it correctly.
