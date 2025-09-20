# Payment System Setup Guide

## Overview
This guide explains how to properly configure the payment system to ensure courses are automatically added to users' "My Courses" section after successful payments.

## Current Status ✅
- ✅ Payment processing system is working
- ✅ Course assignment logic is implemented
- ✅ Manual processing tools are available
- ✅ Admin endpoints for monitoring and processing

## Automatic Payment Processing (Recommended)

### 1. Razorpay Webhook Configuration

#### Step 1: Set up webhook in Razorpay Dashboard
1. Log in to your Razorpay Dashboard
2. Go to **Settings** → **Webhooks**
3. Click **"Add New Webhook"**
4. Configure the webhook:
   ```
   Webhook URL: https://yourdomain.com/api/payments/webhook
   Active Events: payment.captured
   Secret: [Generate and copy this secret]
   ```

#### Step 2: Update Environment Variables
Add the webhook secret to your `.env` file:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_from_razorpay
```

#### Step 3: Test Webhook
Use Razorpay's webhook testing tool or make a test payment to verify the webhook is working.

### 2. Webhook Processing Flow

```
User Payment → Razorpay → Webhook Event → Server Processing → Course Assignment
     ↓              ↓             ↓                ↓                ↓
  Payment UI    Payment Success  payment.captured  Order Update    User Courses
```

## Manual Processing (Fallback)

If webhooks are not working, you can manually process payments:

### Option 1: Admin API Endpoints

#### Process All Pending Orders
```bash
curl -X POST "http://localhost:4000/api/v1/admin/process-pending-orders" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Process Specific Order
```bash
curl -X POST "http://localhost:4000/api/v1/admin/process-order/ORDER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Process User Orders
```bash
curl -X POST "http://localhost:4000/api/v1/admin/process-user-orders/USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 2: Command Line Scripts

#### Process All Pending Orders
```bash
cd backend && node process-remaining-pending-orders.js
```

#### Check System Status
```bash
cd backend && node check-new-pending-orders.js
```

## Monitoring and Maintenance

### Check System Status
```bash
curl -X GET "http://localhost:4000/api/v1/admin/system-status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Regular Maintenance Tasks

1. **Daily**: Check for pending orders
   ```bash
   # Run this script daily to catch any missed payments
   cd backend && node check-new-pending-orders.js
   ```

2. **Weekly**: Process any stuck orders
   ```bash
   # Process any orders that might have been missed
   cd backend && node process-remaining-pending-orders.js
   ```

## Troubleshooting

### Issue: Webhooks not firing
**Solution:**
1. Check webhook URL is accessible
2. Verify webhook secret is correct
3. Check Razorpay dashboard for webhook errors
4. Use manual processing as fallback

### Issue: Orders stuck in pending
**Solution:**
1. Use admin endpoints to manually process
2. Check server logs for webhook processing errors
3. Verify database connectivity

### Issue: Courses not appearing in My Courses
**Solution:**
1. Check user's authentication token
2. Verify order status is 'completed'
3. Check user's purchasedCourses array
4. Use manual processing if needed

## Production Deployment Checklist

- [ ] Set up Razorpay webhook in production dashboard
- [ ] Update production environment variables
- [ ] Test webhook with small payment
- [ ] Set up monitoring for pending orders
- [ ] Configure automated processing scripts
- [ ] Set up alerts for failed payments

## API Endpoints Summary

### User Endpoints
- `GET /api/v1/courses/my-courses` - Get user's purchased courses

### Admin Endpoints (Require Admin Authentication)
- `POST /api/v1/admin/process-pending-orders` - Process all pending orders
- `POST /api/v1/admin/process-order/:orderId` - Process specific order
- `POST /api/v1/admin/process-user-orders/:userId` - Process user's orders
- `GET /api/v1/admin/system-status` - Get system status

### Payment Endpoints
- `POST /api/payments/create-checkout-session` - Create payment session
- `POST /api/payments/verify` - Verify payment completion
- `POST /api/payments/webhook` - Razorpay webhook handler

## Security Notes

- Webhook secret should be kept secure
- Admin endpoints require proper authentication
- All payment data is encrypted and secure
- User data is protected with JWT authentication

## Support

If you encounter issues:
1. Check server logs for error messages
2. Use the manual processing scripts as fallback
3. Verify webhook configuration in Razorpay dashboard
4. Contact support with specific error messages

---

**The payment system is now fully functional with both automatic and manual processing capabilities!**