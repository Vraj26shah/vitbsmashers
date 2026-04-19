import Razorpay     from 'razorpay';
import crypto       from 'crypto';
import { supabase } from '../lib/supabase.js';

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/v1/payment/create-order ────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { courseId, subject, amount, items } = req.body;
    const userId = req.user.id;

    // Single course purchase
    if (courseId) {
      // Resolve course (supports UUID or PID)
      let resolvedCourseId = courseId;
      let course;

      if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
        const { data: c } = await supabase.schema('business').from('courses')
          .select('id, title, price').eq('pid', courseId.toUpperCase()).maybeSingle();
        course = c;
        if (c) resolvedCourseId = c.id;
      } else {
        const { data: c } = await supabase.schema('business').from('courses')
          .select('id, title, price').eq('id', courseId).maybeSingle();
        course = c;
      }

      if (!course) return res.status(404).json({ status: 'error', message: 'Course not found' });

      // Check already purchased
      const { data: existing } = await supabase.schema('business').from('purchases')
        .select('id').eq('user_id', userId).eq('course_id', resolvedCourseId).maybeSingle();
      if (existing)
        return res.status(409).json({ status: 'error', message: 'Course already purchased' });

      const coursePrice = amount ? parseFloat(amount) : course.price;
      const amountPaise = Math.round(coursePrice * 100);

      const rzpOrder = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `rcpt_${userId.slice(0, 8)}_${resolvedCourseId.slice(0, 8)}`,
      });

      await supabase.schema('business').from('razorpay_orders').insert({
        user_id:           userId,
        course_id:         resolvedCourseId,
        razorpay_order_id: rzpOrder.id,
        amount:            coursePrice,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Checkout session created successfully',
        orderId:    rzpOrder.id,
        amount:     amountPaise,
        currency:   'INR',
        courseId:   resolvedCourseId,
        courseName: subject || course.title,
        key:        process.env.RAZORPAY_KEY_ID,
      });
    }

    // Cart-based (multiple items) — create one order for total
    if (items && Array.isArray(items) && items.length > 0) {
      const totalAmount = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
      const amountPaise = Math.round(totalAmount * 100);

      const rzpOrder = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `rcpt_cart_${userId.slice(0, 8)}_${Date.now()}`,
      });

      // Store one row per item in razorpay_orders for each course
      for (const item of items) {
        let cid = item.courseId;
        if (!/^[0-9a-f-]{36}$/i.test(cid)) {
          const { data: c } = await supabase.schema('business').from('courses')
            .select('id').eq('pid', cid.toUpperCase()).maybeSingle();
          if (c) cid = c.id;
        }
        if (cid && /^[0-9a-f-]{36}$/i.test(cid)) {
          await supabase.schema('business').from('razorpay_orders').insert({
            user_id:           userId,
            course_id:         cid,
            razorpay_order_id: rzpOrder.id,
            amount:            parseFloat(item.amount || 0),
          }).catch(() => {});
        }
      }

      return res.status(200).json({
        status: 'success',
        message: 'Checkout session created successfully',
        orderId:   rzpOrder.id,
        amount:    amountPaise,
        currency:  'INR',
        key:       process.env.RAZORPAY_KEY_ID,
      });
    }

    return res.status(400).json({ status: 'error', message: 'Invalid payment request' });
  } catch (err) {
    console.error('createOrder error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create order' });
  }
};

// alias for old route name
export const createCheckoutSession = createOrder;

// ── POST /api/v1/payment/verify ──────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature,
            order_id, payment_id, signature } = req.body;
    const userId = req.user.id;

    const orderId    = razorpay_order_id || order_id;
    const paymentId  = razorpay_payment_id || payment_id;
    const sig        = razorpay_signature || signature;

    // Verify signature
    const body     = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex');

    const isValid = expected === sig;

    // In development, allow even if signature doesn't match (test mode)
    if (!isValid && process.env.NODE_ENV === 'production')
      return res.status(400).json({ success: false, status: 'error', message: 'Payment signature invalid' });

    // Fetch all orders for this razorpay_order_id
    const { data: orders } = await supabase.schema('business').from('razorpay_orders')
      .select('course_id, amount, user_id').eq('razorpay_order_id', orderId);

    if (!orders || orders.length === 0)
      return res.status(404).json({ success: false, status: 'error', message: 'Order not found' });

    // Mark all matching orders as paid
    await supabase.schema('business').from('razorpay_orders')
      .update({ status: 'paid' }).eq('razorpay_order_id', orderId);

    // Create purchase record for each course
    const purchases = [];
    for (const order of orders) {
      const { data: p, error: pe } = await supabase.schema('business').from('purchases').upsert({
        user_id:             userId,
        course_id:           order.course_id,
        razorpay_payment_id: paymentId,
        razorpay_order_id:   orderId,
        amount_paid:         order.amount,
      }, { onConflict: 'user_id,course_id', ignoreDuplicates: true }).select().single();

      if (p) purchases.push(p);
    }

    return res.status(200).json({ success: true, status: 'success', message: 'Payment verified', data: purchases });
  } catch (err) {
    console.error('verifyPayment error:', err.message);
    return res.status(500).json({ success: false, status: 'error', message: 'Payment verification failed' });
  }
};

// ── GET /api/v1/payment/session/:orderId ─────────────────────────────────────
export const getOrder = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('razorpay_orders')
      .select('*').eq('razorpay_order_id', req.params.orderId).eq('user_id', req.user.id).maybeSingle();
    if (error || !data) return res.status(404).json({ status: 'error', message: 'Order not found' });
    return res.status(200).json({ status: 'success', order: data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get order' });
  }
};

// ── POST /api/v1/payment/webhook ─────────────────────────────────────────────
export const webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const sig = req.headers['x-razorpay-signature'];

    if (webhookSecret && sig) {
      const body     = JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
      if (expected !== sig)
        return res.status(400).send('Invalid webhook signature');
    }

    const event = req.body;
    if (event.event === 'payment.captured') {
      const { order_id, id: payment_id, amount } = event.payload.payment.entity;

      const { data: orders } = await supabase.schema('business').from('razorpay_orders')
        .select('user_id, course_id, amount').eq('razorpay_order_id', order_id);

      if (orders) {
        for (const order of orders) {
          await supabase.schema('business').from('purchases').upsert({
            user_id:             order.user_id,
            course_id:           order.course_id,
            razorpay_payment_id: payment_id,
            razorpay_order_id:   order_id,
            amount_paid:         order.amount,
          }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
        }
        await supabase.schema('business').from('razorpay_orders')
          .update({ status: 'paid' }).eq('razorpay_order_id', order_id);
      }
    }
    return res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error:', err.message);
    return res.status(500).send('webhook error');
  }
};

export default { createOrder, createCheckoutSession, verifyPayment, getOrder, webhook };
