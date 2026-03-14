import 'dotenv/config';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.get('/api', (req, res) => {
    res.send('VOLTpark Payment Server is running');
});

// 1. Create Order
app.post('/api/create-order', async (req, res) => {
    try {
        const { booking_id, amount, currency = 'INR' } = req.body;

        if (!booking_id || !amount) {
            return res.status(400).json({ error: 'Booking ID and Amount are required' });
        }

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
            console.error("CRITICAL: Razorpay Keys are missing from Environment Variables!");
            return res.status(500).json({ error: "Server Configuration Error: Razorpay keys are missing." });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET
        });

        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency,
            receipt: booking_id,
            payment_capture: 1
        };

        const order = await razorpay.orders.create(options);

        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
});

// 2. Verify Payment
app.post('/api/verify-payment', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        if (!process.env.RAZORPAY_SECRET) {
            return res.status(500).json({ error: "Server Configuration Error: Razorpay secret is missing." });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            res.json({ status: 'success', message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ status: 'failed', message: 'Invalid signature' });
        }

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
});

export default app;
