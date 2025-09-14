# API Testing with cURL

## Prerequisites
1. Make sure your server is running: `npm run dev`
2. Make sure MongoDB is running
3. Set up your `.env` file with proper credentials





## 1. Test Signup Endpoint

curl -X POST http://localhost:4000/api/v1/auth/signup \
   "Content-Type: application/json" \
   {
    "username": "testuser123",
    "email": "testuser123@vitbhopal.ac.in",
    "password": "testpass123"
  }


Expected Response:

{
  "status": "success",
  "message": "OTP sent to your VIT email!"
}


## 2. Test Verify OTP Endpoint

First, check your server console for the OTP (in development mode)
Then use the OTP in this request:

POST http://localhost:4000/api/v1/auth/verify-otp \
  "Content-Type: application/json" \
   {
    "email": "testuser123@vitbhopal.ac.in",
    "otp": "123456"
  }


Expected Response:

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


## 3. Test Login Endpoint


 POST http://localhost:4000/api/v1/auth/login \
   "Content-Type: application/json" \
   '{
    "username": "testuser123",
    "password": "testpass123"
  }'

## 4. Test Protected Route


 GET http://localhost:4000/api/v1/auth/dashboard \
  "Authorization: Bearer YOUR_JWT_TOKEN_HERE"


## Error Responses

### Invalid Email Format
```bash
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "invalid-email@example.com",
    "password": "testpass123"
  }'
```

### Invalid OTP
```bash
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser123@vitbhopal.ac.in",
    "otp": "000000"
  }'
```

### Unauthorized Access
```bash
curl -X GET http://localhost:4000/api/v1/auth/dashboard
```
