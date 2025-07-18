import express from 'express';
import paymentController from '../controllers/paymentController.js';

const router = express.Router();

// Initiate payment
router.post("/initiate", paymentController.initiatePayment);

// Verify payment
router.get("/verify", paymentController.verifyPayment); // Changed to GET since eSewa redirects with query params

// Get payment status
router.get("/status/:orderId", paymentController.getPaymentStatus);

// Process cash payment
router.post("/cash", paymentController.processCashPayment);

export default router;