# 🚀 Enable Real Payments (Netbanking, UPI, Cards)

## 📌 Current Situation

You're using **TEST MODE** which only accepts test cards like `4111 1111 1111 1111`.

**What you want**: Real payments via netbanking, UPI, real cards, wallets, etc.

## ✅ Solution: Switch to LIVE MODE

### Step 1: Activate Your Razorpay Account

1. **Login**: https://dashboard.razorpay.com/
2. **Complete KYC**:
   - Click on "Activate Account" or "Complete KYC"
   - Submit:
     - Business PAN card
     - GST certificate (if applicable)
     - Bank account details
     - Business proof documents
   - Wait for approval (24-48 hours)

3. **Activate Live Mode**:
   - After KYC approval, you'll see "Go Live" button
   - Click it to activate live payments

### Step 2: Get Your LIVE API Keys

1. Go to: **Settings → API Keys**
2. Click: **"Generate Live Keys"** or **"Regenerate Live Keys"**
3. You'll see:
   ```
   Key ID: rzp_live_XXXXXXXXXX
   Key Secret: YYYYYYYYYYYYYYYY
   ```
4. **Copy both keys** (you'll need them in next step)

### Step 3: Update Your .env File

Open `backend/.env` and replace these lines:

**BEFORE (Test Mode - Current):**
```env
RAZORPAY_KEY_ID=rzp_test_Sev5BpRrghvDI3
RAZORPAY_KEY_SECRET=V0Ix6DnYO9Jjl96jnlcVmLgi
```

**AFTER (Live Mode - For Real Payments):**
```env
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_HERE
RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET_HERE
```

### Step 4: Restart Backend

```bash
cd backend
npm run dev
```

## 🎉 Done! Now You Have:

✅ Real netbanking (SBI, HDFC, ICICI, etc.)  
✅ Real UPI payments (Google Pay, PhonePe, Paytm)  
✅ Real credit/debit cards  
✅ Wallets (Paytm, PhonePe, Mobikwik)  
✅ EMI options  
✅ Buy Now Pay Later  

## 🔒 Security Tips

1. **Never share** your live keys publicly
2. **Never commit** .env file to Git
3. **Keep backup** of your keys in a secure place
4. **Test first** with a small amount (₹1 or ₹10)

## 📊 Comparison

| Feature | TEST Mode (Current) | LIVE Mode (After Switch) |
|---------|---------------------|--------------------------|
| Netbanking | ❌ Fake banks only | ✅ All real banks |
| UPI | ❌ Test IDs only | ✅ Real UPI |
| Cards | ❌ Test cards only | ✅ Real cards |
| Money | ❌ No real money | ✅ Real money deducted |
| Settlement | ❌ No settlement | ✅ Money to your bank |

## 🧪 Test Your Live Setup

1. Make a small test purchase (₹10)
2. Use your own netbanking/UPI
3. Check Razorpay dashboard for payment
4. Verify purchase appears in your database
5. Try a refund from Razorpay dashboard

## ❓ FAQ

**Q: Do I need to change any code?**  
A: No! Just update the .env file with live keys.

**Q: Will test mode stop working?**  
A: You can switch back anytime by using test keys again.

**Q: How long does KYC take?**  
A: Usually 24-48 hours, sometimes faster.

**Q: What if I don't have GST?**  
A: You can still activate with PAN and other documents. Contact Razorpay support.

**Q: Can I test live mode without real money?**  
A: No, live mode uses real money. Test with small amounts first.

## 📞 Need Help?

- **Razorpay KYC Issues**: support@razorpay.com
- **Technical Issues**: Check browser console for errors
- **Dashboard**: https://dashboard.razorpay.com/

---

## 🎯 Quick Checklist

- [ ] Login to Razorpay Dashboard
- [ ] Complete KYC verification
- [ ] Wait for approval
- [ ] Generate live API keys
- [ ] Update backend/.env file
- [ ] Restart backend server
- [ ] Test with small amount
- [ ] Celebrate! 🎉

**Your payment system is ready for real payments!**
