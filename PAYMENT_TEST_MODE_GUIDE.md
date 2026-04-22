# Razorpay Test Mode - Payment Methods Guide

## 🔍 What's Happening?

You're getting the error: **"Please use another method"** or **"Please use another email"**

This is a **Razorpay Test Mode limitation**, not a bug in your code!

## ⚠️ Why This Happens

Razorpay's test environment is very restrictive. Some payment methods that work in LIVE mode don't work in TEST mode.

### The Errors You're Seeing:

1. **"Please use another method"** - Razorpay rejecting the payment method in test mode
2. **ERR_BLOCKED_BY_CLIENT** - Your ad blocker blocking Razorpay analytics (not critical)
3. **"Refused to get unsafe header"** - Browser security (not critical)

## ✅ What WORKS in Test Mode

### 1. Credit/Debit Card ✅
```
Card Number: 4111 1111 1111 1111
Expiry: 12/25 (any future date)
CVV: 123 (any 3 digits)
Name: Any name
```

### 2. Netbanking ✅
- Select ANY bank from the list
- You'll see a test page with "Success" and "Failure" buttons
- Click "Success" to simulate successful payment

### 3. UPI ✅
- UPI ID: `success@razorpay`
- This simulates a successful UPI payment

## ❌ What DOESN'T Work in Test Mode

- ❌ Real UPI IDs (your actual Google Pay/PhonePe)
- ❌ Real bank credentials
- ❌ Some wallet options
- ❌ Certain payment methods that Razorpay restricts in test mode

## 🎯 How to Test Netbanking (Success/Failure Page)

1. **Click "Enroll Now"** on any course
2. **Razorpay checkout opens**
3. **Select "Netbanking"** tab
4. **Choose ANY bank** from the dropdown (e.g., HDFC, SBI, ICICI)
5. **Click "Pay"**
6. **You'll see a test page** with two buttons:
   - ✅ **Success** - Simulates successful payment
   - ❌ **Failure** - Simulates failed payment
7. **Click Success** to complete the test payment

## 🔧 Troubleshooting

### If you don't see the Success/Failure page:

1. **Make sure you're selecting Netbanking** (not UPI or Card)
2. **Select a bank from the dropdown**
3. **Click the Pay button**
4. **Wait a moment** - the test page should open

### If you get "Please use another method":

This means:
- You tried to use a real UPI ID (use `success@razorpay` instead)
- You tried to use a real payment method that's restricted in test mode
- Try a different payment method (Card or Netbanking)

### If payment keeps failing:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Disable ad blockers**: Temporarily disable for testing
3. **Try incognito mode**: To avoid extension interference
4. **Use test card**: 4111 1111 1111 1111

## 💰 For REAL Payments (Not Test Mode)

If you want to accept REAL payments with REAL netbanking:

1. **Complete Razorpay KYC** (24-48 hours)
2. **Get LIVE keys** from Razorpay Dashboard
3. **Update backend/.env**:
   ```env
   RAZORPAY_KEY_ID=rzp_live_YOUR_KEY
   RAZORPAY_KEY_SECRET=YOUR_SECRET
   ```
4. **Restart backend**: `npm run dev`

Then ALL payment methods will work:
- ✅ Real netbanking (all banks)
- ✅ Real UPI (Google Pay, PhonePe, etc.)
- ✅ Real credit/debit cards
- ✅ Wallets
- ✅ All payment methods

## 📊 Quick Reference

| Payment Method | Test Mode | Live Mode |
|---------------|-----------|-----------|
| Test Card (4111...) | ✅ Works | ❌ Not accepted |
| Real Cards | ❌ Not accepted | ✅ Works |
| Test UPI (success@razorpay) | ✅ Works | ❌ Not accepted |
| Real UPI | ❌ Doesn't work | ✅ Works |
| Test Netbanking | ✅ Works (Success/Failure page) | ❌ Not accepted |
| Real Netbanking | ❌ Doesn't work | ✅ Works |

## 🎓 Summary

**Your Question:** "Why is the success/failure page not coming?"

**Answer:** 
1. Make sure you're selecting **Netbanking** (not other methods)
2. Choose a bank from the dropdown
3. Click Pay
4. The test page with Success/Failure buttons should appear
5. If you get "Please use another method", try a different payment method or use the test card

**The code is working correctly!** This is just how Razorpay's test mode works. Some methods are restricted, but Card, Netbanking, and test UPI should work fine.

## 🔍 Still Having Issues?

1. **Check browser console** for specific errors
2. **Try test card** instead: 4111 1111 1111 1111
3. **Disable ad blockers** temporarily
4. **Try different browser** or incognito mode
5. **Make sure backend is running**: `npm run dev`

---

**Bottom Line:** In test mode, use test credentials. For real payments, switch to live mode with live keys!
