# Payment Gateway Integration Guide

## Overview
Your Scholars Stack marketplace now supports multiple payment gateways with a unified interface. You can easily switch between Mock (free testing), Razorpay, and PhonePe based on your needs.

## Current Setup
- **Default Gateway**: Mock (free for testing)
- **Supported Gateways**: Mock, Razorpay, PhonePe
- **Configuration**: Single environment variable change

---

## 🔄 Switching Payment Gateways

### 1. Update Environment Variable
Edit `vitbsmashers/backend/.env`:

```bash
# Change this line to switch gateways
PAYMENT_GATEWAY=mock          # For testing (default)
PAYMENT_GATEWAY=razorpay      # For Razorpay payments
PAYMENT_GATEWAY=phonepe       # For PhonePe payments
```

### 2. Restart Server
```bash
cd vitbsmashers/backend
npm start
```

That's it! Your payment system automatically switches gateways.

---

## 💳 Razorpay Integration

### Step 1: Create Razorpay Account
1. Visit [https://razorpay.com](https://razorpay.com)
2. Sign up for a business account
3. Complete KYC verification
4. Get your API keys from Dashboard → Settings → API Keys

### Step 2: Configure Environment
Update `vitbsmashers/backend/.env`:

```bash
PAYMENT_GATEWAY=razorpay
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

### Step 3: Test Integration
1. Set `PAYMENT_GATEWAY=razorpay`
2. Restart server
3. Try purchasing a course
4. Razorpay checkout will open automatically

### Razorpay Features
- ✅ Secure payment processing
- ✅ Multiple payment methods (Cards, UPI, Net Banking, Wallets)
- ✅ Automatic refunds
- ✅ Webhook support for payment confirmation
- ✅ Indian Rupee support
- ✅ Low transaction fees (2% + ₹3.5 per transaction)

---

## 📱 PhonePe Integration

### Step 1: Create PhonePe Business Account
1. Visit [https://business.phonepe.com](https://business.phonepe.com)
2. Register your business
3. Complete verification process
4. Get Merchant ID and Salt keys from dashboard

### Step 2: Configure Environment
Update `vitbsmashers/backend/.env`:

```bash
PAYMENT_GATEWAY=phonepe
PHONEPE_MERCHANT_ID=your_phonepe_merchant_id
PHONEPE_SALT_KEY=your_phonepe_salt_key
PHONEPE_SALT_INDEX=1
```

### Step 3: Test Integration
1. Set `PAYMENT_GATEWAY=phonepe`
2. Restart server
3. Try purchasing a course
4. User will be redirected to PhonePe payment page

### PhonePe Features
- ✅ UPI-first payment experience
- ✅ PhonePe wallet integration
- ✅ QR code payments
- ✅ Bank transfer support
- ✅ Competitive pricing
- ✅ Strong presence in India

---

## 🧪 Mock Gateway (Free Testing)

### Current Setup
```bash
PAYMENT_GATEWAY=mock  # Already configured
```

### Features
- ✅ **Zero Cost**: No API keys needed
- ✅ **Instant Testing**: No external dependencies
- ✅ **Realistic UI**: Professional payment modal
- ✅ **Success/Failure Simulation**: Test both scenarios
- ✅ **Order Tracking**: Full database integration

### Testing Mock Payments
1. Click "Enroll Now" on any course
2. Complete profile if required
3. Mock payment modal opens
4. Choose "Pay Successfully" or "Simulate Failure"
5. Course access granted instantly (success) or error shown (failure)

---

## 🔧 Technical Implementation

### Gateway Factory Pattern
```javascript
// Automatic gateway switching based on PAYMENT_GATEWAY env var
const gateway = gatewayFactory.getGateway(); // Returns appropriate gateway
```

### Supported Operations
- ✅ **Create Order**: Generate payment orders
- ✅ **Verify Payment**: Confirm successful payments
- ✅ **Handle Webhooks**: Automatic payment confirmation
- ✅ **Order Tracking**: Database integration

### API Endpoints
```javascript
POST /api/payments/create-checkout-session  // Create payment order
POST /api/payments/verify                   // Verify payment completion
```

---

## 📊 Production Deployment Checklist

### For Razorpay Production:
- [ ] Switch to live API keys (remove `_test_` from key names)
- [ ] Enable webhooks in Razorpay dashboard
- [ ] Set up webhook endpoint: `https://yourdomain.com/api/payments/webhook`
- [ ] Configure webhook secret in environment
- [ ] Test with small amounts first
- [ ] Enable PCI compliance if handling card data

### For PhonePe Production:
- [ ] Switch to production Merchant ID and keys
- [ ] Set up callback URLs
- [ ] Configure success/failure redirect URLs
- [ ] Test end-to-end payment flow
- [ ] Monitor transaction logs

### General Production Steps:
- [ ] Update `NODE_ENV=production`
- [ ] Set up proper SSL certificates
- [ ] Configure webhook endpoints
- [ ] Set up monitoring and alerts
- [ ] Test with real payment methods
- [ ] Enable payment analytics

---

## 🐛 Troubleshooting

### Common Issues

#### Razorpay: "Key not found"
```bash
# Check your .env file
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxx  # Should start with rzp_test_
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx  # Secret key from dashboard
```

#### PhonePe: "Invalid signature"
```bash
# Verify salt configuration
PHONEPE_SALT_KEY=your_actual_salt_key_here
PHONEPE_SALT_INDEX=1  # Usually 1
```

#### Mock Gateway: Not working
```bash
# Ensure correct setting
PAYMENT_GATEWAY=mock
```

### Testing Commands
```bash
# Check server logs
cd vitbsmashers/backend
npm start

# Test API endpoints
curl -X POST http://localhost:4000/api/payments/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"courseId": "test", "subject": "Test Course", "amount": 10000}'
```

---

## 💰 Pricing Comparison

| Gateway | Setup Fee | Transaction Fee | Settlement | Best For |
|---------|-----------|-----------------|------------|----------|
| **Mock** | **₹0** | **₹0** | **Instant** | **Testing** |
| Razorpay | ₹0 | 2% + ₹3.5 | T+1 days | Production |
| PhonePe | ₹0 | 2-3% | T+1 days | UPI Payments |

---

## 🚀 Quick Start Commands

### Switch to Razorpay:
```bash
# Edit .env
echo "PAYMENT_GATEWAY=razorpay" >> vitbsmashers/backend/.env
echo "RAZORPAY_KEY_ID=your_key_here" >> vitbsmashers/backend/.env
echo "RAZORPAY_KEY_SECRET=your_secret_here" >> vitbsmashers/backend/.env

# Restart
cd vitbsmashers/backend && npm start
```

### Switch to PhonePe:
```bash
# Edit .env
echo "PAYMENT_GATEWAY=phonepe" >> vitbsmashers/backend/.env
echo "PHONEPE_MERCHANT_ID=your_merchant_id" >> vitbsmashers/backend/.env
echo "PHONEPE_SALT_KEY=your_salt_key" >> vitbsmashers/backend/.env

# Restart
cd vitbsmashers/backend && npm start
```

### Back to Mock (Testing):
```bash
# Edit .env
echo "PAYMENT_GATEWAY=mock" >> vitbsmashers/backend/.env

# Restart
cd vitbsmashers/backend && npm start
```

---

## 📞 Support

### Razorpay Support
- Dashboard: [https://dashboard.razorpay.com](https://dashboard.razorpay.com)
- Docs: [https://docs.razorpay.com](https://docs.razorpay.com)
- Support: support@razorpay.com

### PhonePe Support
- Business Portal: [https://business.phonepe.com](https://business.phonepe.com)
- Docs: [https://developer.phonepe.com](https://developer.phonepe.com)
- Support: business.support@phonepe.com

### Scholars Stack Issues
- Check server logs: `npm start` output
- Verify environment variables
- Test with mock gateway first

---

## 🎯 Next Steps

1. **Test with Mock Gateway** (already working)
2. **Choose Production Gateway** (Razorpay recommended for beginners)
3. **Get API Keys** from your chosen gateway
4. **Update Environment Variables**
5. **Test with Real Payments** (start with small amounts)
6. **Go Live!**

Your payment system is now future-proof and can easily scale with your business needs! 🚀💳