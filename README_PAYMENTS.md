# 💳 Payment System Guide

## 🎯 Quick Answer to Your Question

**Q: "I want to use netbanking, not test cards"**

**A: You need to switch from TEST mode to LIVE mode.**

Currently, you're using **TEST keys** which only accept:
- ✅ Test cards (4111 1111 1111 1111)
- ✅ Test UPI (success@razorpay)
- ❌ NOT real netbanking
- ❌ NOT real UPI

To use **real netbanking**, you need **LIVE keys** from Razorpay.

---

## 🔄 Two Modes Explained

### 🧪 TEST Mode (Current)
```
Keys: rzp_test_XXXXXXXXXX
Purpose: Testing without real money
Accepts: Only test credentials
Real Money: NO
```

**What Works:**
- Test Card: 4111 1111 1111 1111
- Test UPI: success@razorpay
- Test Netbanking (fake banks)

**What Doesn't Work:**
- Your real bank account
- Your real UPI (Google Pay, PhonePe)
- Real credit/debit cards
- Any real payment method

### 💰 LIVE Mode (What You Need)
```
Keys: rzp_live_XXXXXXXXXX
Purpose: Real payments
Accepts: All real payment methods
Real Money: YES
```

**What Works:**
- ✅ Real netbanking (SBI, HDFC, ICICI, etc.)
- ✅ Real UPI (Google Pay, PhonePe, Paytm)
- ✅ Real credit/debit cards
- ✅ Wallets (Paytm, PhonePe, Mobikwik)
- ✅ EMI options
- ✅ Buy Now Pay Later

---

## 🚀 How to Switch to LIVE Mode

### Step 1: Complete Razorpay KYC
1. Go to https://dashboard.razorpay.com/
2. Click "Activate Account" or "Complete KYC"
3. Submit documents:
   - PAN card
   - Bank account details
   - Business proof (GST if applicable)
4. Wait 24-48 hours for approval

### Step 2: Get LIVE Keys
1. After KYC approval, go to Settings → API Keys
2. Click "Generate Live Keys"
3. Copy both:
   - Key ID (starts with `rzp_live_`)
   - Key Secret

### Step 3: Update .env File
Open `backend/.env` and change:

```env
# FROM (Test Mode):
RAZORPAY_KEY_ID=rzp_test_Sev5BpRrghvDI3
RAZORPAY_KEY_SECRET=V0Ix6DnYO9Jjl96jnlcVmLgi

# TO (Live Mode):
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_HERE
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
```

### Step 4: Restart Backend
```bash
cd backend
npm run dev
```

### Step 5: Test with Real Payment
- Try purchasing with your real netbanking
- Use your real UPI
- Real money will be deducted!

---

## 🎯 Current Error Explained

The error **"Please use another method"** happens because:

1. You're in TEST mode
2. You tried to use a real payment method (real netbanking/UPI)
3. Razorpay TEST mode doesn't support real payment methods

**Solution:**
- **For Testing**: Use test card `4111 1111 1111 1111`
- **For Real Payments**: Switch to LIVE mode (see above)

---

## 📊 Visual Comparison

```
┌─────────────────────────────────────────────────────────┐
│                    TEST MODE (Current)                   │
├─────────────────────────────────────────────────────────┤
│ Keys: rzp_test_*                                        │
│ Real Money: NO                                          │
│ Real Netbanking: ❌ NO                                  │
│ Real UPI: ❌ NO                                         │
│ Test Card: ✅ YES (4111 1111 1111 1111)                │
└─────────────────────────────────────────────────────────┘

                         ⬇️ SWITCH TO ⬇️

┌─────────────────────────────────────────────────────────┐
│                    LIVE MODE (Needed)                    │
├─────────────────────────────────────────────────────────┤
│ Keys: rzp_live_*                                        │
│ Real Money: YES                                         │
│ Real Netbanking: ✅ YES (All banks)                    │
│ Real UPI: ✅ YES (Google Pay, PhonePe, etc.)           │
│ Real Cards: ✅ YES                                      │
│ Wallets: ✅ YES                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Commands

### Test Current Setup (Test Mode)
```bash
cd backend
npm run dev
# Use test card: 4111 1111 1111 1111
```

### Verify Razorpay Config
```bash
cd backend
node verify-payment-setup.js
```

### Check if Keys are Live or Test
```bash
cd backend
grep RAZORPAY_KEY_ID .env
# If shows rzp_test_* = TEST MODE
# If shows rzp_live_* = LIVE MODE
```

---

## 🎓 Summary

**Your Question:** "I want to use netbanking, not test cards"

**Answer:** 
1. You're currently in TEST mode (test keys)
2. TEST mode only accepts test cards, not real netbanking
3. To use real netbanking, you need LIVE mode
4. To get LIVE mode, complete Razorpay KYC and get live keys
5. Update .env with live keys and restart backend

**Timeline:**
- KYC submission: 10 minutes
- KYC approval: 24-48 hours
- Getting live keys: 2 minutes
- Updating .env: 1 minute
- **Total: ~1-2 days** (mostly waiting for KYC)

---

## 📞 Need Help?

- **KYC Issues**: Contact Razorpay support (support@razorpay.com)
- **Technical Issues**: Check browser console for errors
- **Documentation**: See `ENABLE_REAL_PAYMENTS.md`

---

**Bottom Line:** You can't use real netbanking with test keys. You need live keys from Razorpay after completing KYC. The code is already ready - you just need to update the keys! 🚀
