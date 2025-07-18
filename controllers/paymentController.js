import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { getEsewaPaymentHash, verifyEsewaPayment } from '../utils/esewa.js';
import crypto from 'crypto';

// Initiate payment with eSewa
export async function initiatePayment(req, res) {
  try {
    const { orderId } = req.body;

    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: "Order not found",
      });
    }

    // Get the amount from localStorage if available, or use the order total
    const amount = order.total_amount;
    
    // Generate transaction UUID
    const transaction_uuid = orderId;

    // Get eSewa payment hash
    const paymentHash = await getEsewaPaymentHash({
      amount,
      transaction_uuid,
    });

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      amount,
      method: "esewa",
      status: "pending",
      transactionId: transaction_uuid,
    });

    // Return payment data to client
    return res.status(200).json({
      success: true,
      payment: {
        amount,
        transaction_uuid,
        product_code: process.env.ESEWA_PRODUCT_CODE,
        ...paymentHash,
      },
      orderId,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to initiate payment",
      error: error.message,
    });
  }
}

// Verify payment with eSewa
export async function verifyPayment(req, res) {
  try {
    const { data } = req.query; // Data received from eSewa's redirect
    
    if (!data) {
      return res.status(400).json({
        success: false,
        msg: "Missing payment data",
      });
    }

    // Verify payment with eSewa
    const paymentInfo = await verifyEsewaPayment(data);
    
    // Extract order ID from transaction_uuid
    const orderId = paymentInfo.response.transaction_uuid;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: "Order not found",
      });
    }

    // Find existing payment
    let payment = await Payment.findOne({ order: orderId, method: "esewa" });

    // If no payment record exists, create one
    if (!payment) {
      payment = await Payment.create({
        order: orderId,
        amount: paymentInfo.decodedData.total_amount,
        method: "esewa",
        status: "pending",
      });
    }

    // Update payment record
    payment.status = "paid";
    payment.refId = paymentInfo.decodedData.transaction_code;
    payment.paymentData = paymentInfo;
    payment.paymentDate = new Date();
    await payment.save();

    // Update order payment status
    order.payment_status = "paid";
    order.payment_method = "esewa";
    order.payment_transaction_id = paymentInfo.decodedData.transaction_code;
    order.payment_date = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      msg: "Payment verified successfully",
      order,
      payment,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to verify payment",
      error: error.message,
    });
  }
}

// Get payment status for an order
export async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: "Order not found",
      });
    }

    // Find payment for the order
    const payment = await Payment.findOne({ order: orderId });

    // Prepare response
    const response = {
      success: true,
      paymentStatus: payment ? payment.status : order.payment_status || "pending",
      paymentMethod: payment ? payment.method : order.payment_method || "not_paid",
    };

    // Add additional details if payment exists
    if (payment) {
      response.paymentId = payment.refId || payment.transactionId;
      response.paymentDate = payment.paymentDate;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Get payment status error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to get payment status",
      error: error.message,
    });
  }
}

// Process cash payment
export async function processCashPayment(req, res) {
  try {
    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        msg: "Order not found",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      order: orderId,
      amount: order.total_amount,
      method: "cash",
      status: "pending", // Cash payments are initially pending until confirmed
    });

    // Update order payment method
    order.payment_method = "cash";
    await order.save();

    return res.status(200).json({
      success: true,
      msg: "Cash payment recorded",
      payment,
    });
  } catch (error) {
    console.error("Cash payment error:", error);
    return res.status(500).json({
      success: false,
      msg: "Failed to process cash payment",
      error: error.message,
    });
  }
}

// Export all functions as named exports
export default {
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  processCashPayment
};