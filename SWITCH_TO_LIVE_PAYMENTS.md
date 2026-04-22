# How to Enable Real Payments (Netbanking, UPI, etc.)

## Current Status
You're currently using **Razorpay TEST mode** which only accepts test cards. To accept real payments via netbanking, UPI, cards, and wallets, you need to switch to **LIVE mode**.

## Steps to Enable Live Payments

### 1. Complete Razorpay Account Setup

First, ensure your Razorpay account is fully activated:

1. **Login to Razorpay Dashboard**: https://dashboard.razorpay.com/
2. **Complete KYC Verification**:
   - Go to Settings → Account & Settings
   - Submit business documents (PAN, GST, Bank Account)
   - Wait for approval (usually 24-48 hours)
3. **Activate Live Mode**:
   - Once KYC is approved, you'll see "Activate Live Mode" option
   - Click to activate

### 2. Get Live API Keys

After activation:

1. Go to **Settings → API Keys** in Razorpay Dashboard
2. Click on **"Generate Live Keys"**
3. You'll get:
   - **Key ID**: Starts with `rzp_live_` (e.g., `rzp_live_ABC123xyz`)
   - **Key Secret**: A long secret string (keep this secure!)

### 3. Update Your .env File

Replace the test keys with live keys in `backend/.env`:

```env
# Payment (Razorpay) - LIVE MODE
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET_HERE
RAZORPAY_WEBHOOK_SECRET=
```

**IMPORTANT**: 
- Keep your live keys secure
- Never commit them to Git
- Add `.env` to `.gitignore`

### 4. Restart Your Backend

```bash
cd backend
npm run dev
```

### 5. Test Live Payments

Now when users try to purchase:
- ✅ Real netbanking will work
- ✅ Real UPI payments will work
- ✅ Real credit/debit cards will work
- ✅ Wallets (Paytm, PhonePe, etc.) will work
- ✅ EMI options will be available

## Important Notes

### Test Mode vs Live Mode

| Feature | Test Mode (Current) | Live Mode (After Switch) |
|---------|-------------------|------------------------|
| Payment Methods | Only test cards | All real payment methods |
| Money Deducted | No | Yes - Real money |
| Netbanking | Fake banks only | Real banks |
| UPI | Test UPI IDs only | Real UPI payments |
| Settlement | No real money | Money settled to your bank |

### Security Checklist

- [ ] KYC completed and approved
- [ ] Live keys generated
- [ ] Keys stored securely in .env
- [ ] .env added to .gitignore
- [ ] Test a small transaction first
- [ ] Set up webhooks (optional but recommended)

### Webhook Setup (Recommended)

Webhooks ensure payment status is updated even if user closes browser:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/v1/payment/webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Copy the webhook secret
5. Add to .env: `RAZORPAY_WEBHOOK_SECRET=your_webhook_secret`

## Testing Live Payments Safely

Before going fully live:

1. **Test with small amount**: Try ₹1 or ₹10 first
2. **Use your own account**: Make a test purchase yourself
3. **Verify in dashboard**: Check if payment appears in Razorpay dashboard
4. **Check database**: Verify purchase is recorded in your database
5. **Test refunds**: Try issuing a refund from dashboard

## Current Configuration

Your current setup:
```
Mode: TEST
Key ID: rzp_test_Sev5BpRrghvDI3
Status: ✅ Working (test mode only)
```

To enable real payments:
```
Mode: LIVE
Key ID: rzp_live_XXXXXXXXXX (Get from Razorpay)
Status: ⏳ Pending activation
```

## Need Help?

If you need help with:
- KYC verification → Contact Razorpay support
- Getting live keys → Check Razorpay dashboard after KYC approval
- Technical issues → Check the error logs in browser console

## Quick Switch Command

Once you have live keys, just update .env and restart:

```bash
# Edit backend/.env
# Replace rzp_test_* with rzp_live_*

# Restart backend
cd backend
npm run dev
```

That's it! Your payment system will now accept real payments via netbanking, UPI, cards, and all other methods.
