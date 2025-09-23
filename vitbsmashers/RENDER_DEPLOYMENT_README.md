# 🚀 Render Deployment Guide

This guide will help you deploy the Scholars Stack backend to Render and ensure it works seamlessly with the Vercel frontend.

## 📋 Prerequisites

- Render account
- MongoDB Atlas database (or any MongoDB instance)
- Google OAuth credentials
- Razorpay payment gateway credentials (if using payments)

## 🔧 Backend Deployment to Render

### Step 1: Prepare Your Code

1. **Update Environment Variables**: Make sure your `.env` file has production settings:
   ```env
   NODE_ENV=production
   PORT=4000
   MONGO_URL=your-mongodb-connection-string
   JWT_SECRET=your-production-jwt-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://vitbsmashers.onrender.com/api/v1/auth/google/callback
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

2. **Update Config URLs**: The `config.js` file in the frontend should point to your Render backend URL.

### Step 2: Deploy to Render

1. **Connect Repository**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `vitbsmashers-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

3. **Environment Variables**: Add all variables from your `.env` file:
   ```
   NODE_ENV=production
   PORT=4000
   MONGO_URL=your-mongodb-url
   JWT_SECRET=your-jwt-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-app-name.onrender.com/api/v1/auth/google/callback
   FRONTEND_URL=https://vitbsmashers.vercel.app
   ```

4. **Deploy**: Click "Create Web Service"

### Step 3: Update Frontend Configuration

1. **Update `config.js`**: Change the production API URL to your Render backend:
   ```javascript
   // In config.js
   get API_BASE() {
     if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
       return 'http://localhost:4000/api/v1';
     }
     // Update this to your actual Render backend URL
     return 'https://your-app-name.onrender.com/api/v1';
   }
   ```

2. **Update Google OAuth**: In your Google Cloud Console:
   - Add your Render backend URL to authorized redirect URIs
   - Update the callback URL in your environment variables

## 🧪 Testing Deployment

### Run the Test Script

After deployment, test your endpoints:

```bash
# Install dependencies if needed
npm install node-fetch

# Run the test script
node test-production-deployment.js
```

### Manual Testing

1. **Check API Endpoints**:
   - `GET https://your-render-app.onrender.com/api/v1/courses`
   - `GET https://your-render-app.onrender.com/api/v1/faculty`
   - `GET https://your-render-app.onrender.com/api/v1/events`

2. **Test CORS**: Make requests from your Vercel frontend domain

3. **Test Authentication**: Try logging in through your frontend

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check that your Render URL is in the allowed origins in `app.js`
   - Ensure credentials are enabled for CORS

2. **Database Connection**:
   - Verify MongoDB connection string
   - Check network access from Render to MongoDB

3. **Environment Variables**:
   - Ensure all required env vars are set in Render dashboard
   - Check variable names match exactly

4. **Google OAuth**:
   - Verify callback URL matches exactly
   - Check client ID and secret are correct

### Debug Commands

```bash
# Check server logs in Render dashboard
# Look for connection errors, missing env vars, etc.

# Test API from command line
curl -X GET https://your-render-app.onrender.com/api/v1/courses

# Test with CORS headers
curl -X GET https://your-render-app.onrender.com/api/v1/courses \
  -H "Origin: https://your-vercel-app.vercel.app"
```

## 📊 Monitoring

- **Render Dashboard**: Check service status, logs, and metrics
- **MongoDB Atlas**: Monitor database performance
- **Google Analytics**: Track user interactions (if implemented)

## 🔄 Updates and Maintenance

1. **Push Changes**: Commit and push to your repository
2. **Auto-deploy**: Render will automatically redeploy on new commits
3. **Manual Deploy**: Use the "Manual Deploy" button in Render dashboard
4. **Rollback**: Use Render's deployment history to rollback if needed

## 🎯 Performance Optimization

1. **Enable Caching**: Use Render's built-in caching
2. **Database Indexing**: Ensure proper indexes on MongoDB
3. **Compress Responses**: Enable gzip compression
4. **Monitor Usage**: Keep an eye on resource usage

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables
3. Test API endpoints manually
4. Check CORS configuration
5. Contact: vitbsmashers@gmail.com

---

**✅ Your Scholars Stack should now be fully deployed and working on Render!**