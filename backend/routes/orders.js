import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';
import Delivery from '../models/Delivery.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { getDistance, calculateDeliveryFee, MIN_ORDER_SINGLE_VENDOR, MIN_ORDER_MULTI_VENDOR_TOTAL } from '../utils/distance.js';

const router = express.Router();

// Helper: Initialize Razorpay only if key environment variables are set
const getRazorpayInstance = () => {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } catch (e) {
      console.error('Error initializing Razorpay:', e);
      return null;
    }
  }
  return null;
};

// @desc    Create a list of pending orders and a Razorpay session
// @route   POST /api/orders
// @access  Private (Customer only)
router.post('/', protect, authorize('customer'), async (req, res) => {
  const { groups, deliveryAddress, deliveryCoordinates, deliveryNotes } = req.body;

  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ message: 'Cart items grouped by vendor are required.' });
  }

  if (!deliveryAddress || !deliveryCoordinates || deliveryCoordinates.lat === undefined || deliveryCoordinates.lng === undefined) {
    return res.status(400).json({ message: 'Valid delivery address and coordinates are required.' });
  }

  try {
    const validatedGroups = [];
    let grandTotal = 0;

    // 1. Validate all vendor groups
    for (const group of groups) {
      const { vendor: vendorId, items } = group;

      // Find vendor coordinates
      const vendorUser = await User.findById(vendorId);
      if (!vendorUser || vendorUser.role !== 'vendor') {
        return res.status(400).json({ message: `Vendor ID ${vendorId} not found.` });
      }

      // Calculate distance using shared utility
      const distance = getDistance(
        deliveryCoordinates.lat,
        deliveryCoordinates.lng,
        vendorUser.coordinates?.lat || 18.4850,
        vendorUser.coordinates?.lng || 73.8630
      );

      // Verify distance limit
      const feeDetails = calculateDeliveryFee(distance);
      if (!feeDetails.available) {
        return res.status(400).json({ 
          message: `Vendor ${vendorUser.storeName || 'Local Shop'} is too far (${distance} km). ${feeDetails.error}` 
        });
      }

      let groupProductTotal = 0;
      const validatedItems = [];

      // Validate each product in the group
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ message: `Product ID ${item.product} not found.` });
        }

        if (product.status !== 'active') {
          return res.status(400).json({ message: `Product "${product.name}" is no longer active.` });
        }

        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}.` 
          });
        }

        const itemPrice = product.discountedPrice;
        groupProductTotal += itemPrice * item.quantity;

        validatedItems.push({
          product: product._id,
          quantity: item.quantity,
          price: itemPrice
        });
      }

      // Verify minimum order value of ₹49 per vendor group
      if (groupProductTotal < MIN_ORDER_SINGLE_VENDOR) {
        return res.status(400).json({ 
          message: `Vendor group "${vendorUser.storeName || 'Local Shop'}" does not meet the minimum order value of ₹${MIN_ORDER_SINGLE_VENDOR}. Current total: ₹${groupProductTotal}.` 
        });
      }

      const groupGrandTotal = groupProductTotal + feeDetails.customer;
      grandTotal += groupGrandTotal;

      validatedGroups.push({
        vendor: vendorUser,
        items: validatedItems,
        productTotal: groupProductTotal,
        deliveryFeeTotal: feeDetails.total,
        deliveryFeeCustomer: feeDetails.customer,
        deliveryFeeVendor: feeDetails.vendor,
        grandTotal: groupGrandTotal,
        distance
      });
    }

    // 1.5 Validate overall aggregate totals across all groups
    const totalProductTotal = validatedGroups.reduce((sum, g) => sum + g.productTotal, 0);
    const minThreshold = groups.length === 1 ? MIN_ORDER_SINGLE_VENDOR : MIN_ORDER_MULTI_VENDOR_TOTAL;
    if (totalProductTotal < minThreshold) {
      return res.status(400).json({
        message: `Order does not meet the minimum value requirement. Total items must be at least ₹${minThreshold} (Current total: ₹${totalProductTotal}).`
      });
    }

    // 2. Initialize Payment Session (Real or Simulated)
    const razorpay = getRazorpayInstance();
    let paymentSessionId = '';
    let isSimulated = true;

    if (razorpay) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: Math.round(grandTotal * 100), // Razorpay accepts in paise (cents equivalent)
          currency: 'INR',
          receipt: `rcpt_order_${Date.now()}`
        });
        paymentSessionId = rzpOrder.id;
        isSimulated = false;
      } catch (err) {
        console.error('Razorpay session creation failed. Falling back to simulation:', err);
        paymentSessionId = `rzp_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    } else {
      paymentSessionId = `rzp_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 3. Create pending Order documents in the database
    const createdOrders = [];
    for (const group of validatedGroups) {
      const pendingOrder = await Order.create({
        customer: req.user._id,
        vendor: group.vendor._id,
        items: group.items,
        productTotal: group.productTotal,
        deliveryFeeTotal: group.deliveryFeeTotal,
        deliveryFeeCustomer: group.deliveryFeeCustomer,
        deliveryFeeVendor: group.deliveryFeeVendor,
        grandTotal: group.grandTotal,
        deliveryAddress,
        deliveryCoordinates,
        distance: group.distance,
        deliveryNotes: deliveryNotes || '',
        status: 'pending', // Pending payment completion
        paymentSessionId
      });
      createdOrders.push(pendingOrder);
    }

    res.status(201).json({
      success: true,
      paymentSessionId,
      amount: grandTotal,
      isSimulated,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_sim_key_id',
      orders: createdOrders.map(o => o._id)
    });
  } catch (error) {
    console.error('Order checkout generation failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Verify payment confirmation and promote orders to confirmed
// @route   POST /api/orders/verify
// @access  Private (Customer only)
router.post('/verify', protect, authorize('customer'), async (req, res) => {
  const { paymentSessionId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!paymentSessionId) {
    return res.status(400).json({ message: 'Payment Session ID is required for verification.' });
  }

  try {
    const isSimulated = paymentSessionId.startsWith('rzp_sim_');

    // 1. Signature Verification
    if (!isSimulated) {
      const razorpay = getRazorpayInstance();
      if (razorpay) {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(paymentSessionId + '|' + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpaySignature) {
          return res.status(400).json({ message: 'Cryptographic signature verification failed.' });
        }
      }
    } else {
      // Mock payment check for simulation
      if (razorpaySignature !== 'simulated_payment_signature_success') {
        return res.status(400).json({ message: 'Simulated signature verification failed.' });
      }
    }

    // 2. Fetch all orders matching the paymentSessionId
    const orders = await Order.find({ paymentSessionId });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found associated with this payment session.' });
    }

    const updatedOrders = [];

    // 3. Promote each order and decrement stock count
    for (const order of orders) {
      const doc = await Order.findById(order._id);
      if (doc && doc.status === 'pending') {
        doc.status = 'confirmed';
        await doc.save();

        // Decrement product inventory
        for (const item of doc.items) {
          const product = await Product.findById(item.product);
          if (product) {
            product.quantity = Math.max(0, product.quantity - item.quantity);
            if (product.quantity === 0) {
              product.status = 'sold';
            }
            await product.save();
          }
        }
        updatedOrders.push(doc);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully and orders confirmed.',
      orders: updatedOrders.map(o => o._id)
    });
  } catch (error) {
    console.error('Payment verification failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get order history for customer
// @route   GET /api/orders/customer
// @access  Private (Customer only)
router.get('/customer', protect, authorize('customer'), async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('vendor')
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Fetch customer orders failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get incoming orders for vendor
// @route   GET /api/orders/vendor
// @access  Private (Vendor only)
router.get('/vendor', protect, authorize('vendor'), async (req, res) => {
  try {
    const orders = await Order.find({ vendor: req.user._id })
      .populate('customer')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Fetch vendor orders failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Confirm an order (by Vendor)
// @route   PUT /api/orders/:id/confirm
// @access  Private (Vendor only)
router.put('/:id/confirm', protect, authorize('vendor'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    order.status = 'confirmed';
    await order.save();

    res.json({ success: true, message: 'Order confirmed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Cancel an order (by Vendor or Customer)
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isCustomer = req.user.role === 'customer' && order.customer.toString() === req.user._id.toString();
    const isVendor = req.user.role === 'vendor' && order.vendor.toString() === req.user._id.toString();

    if (!isCustomer && !isVendor) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    order.status = 'cancelled';
    await order.save();

    // Check if there is an active delivery record for this order and cancel it
    let deliveries = await Delivery.find({ order: order._id });
    const activeDeliv = deliveries.find(d => d.status !== 'cancelled' && d.status !== 'delivered');
    if (activeDeliv) {
      const dRecord = await Delivery.findById(activeDeliv._id);
      if (dRecord) {
        dRecord.status = 'cancelled';
        await dRecord.save();
      }

      // Free the delivery boy
      const dboy = await User.findById(activeDeliv.deliveryBoy);
      if (dboy) {
        dboy.deliveryStatus = 'free';
        await dboy.save();
      }
    }

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ==========================================
// DELIVERY PARTNER SPECIFIC ROUTES
// ==========================================

// @desc    Get all confirmed, unassigned orders available for pickup
// @route   GET /api/orders/delivery/available
// @access  Private (Delivery agent only)
router.get('/delivery/available', protect, authorize('delivery'), async (req, res) => {
  try {
    // 1. Find all active/assigned delivery transactions
    const allDeliveries = await Delivery.find();
    const activeDeliveries = allDeliveries.filter(d => d.status !== 'cancelled' && d.status !== 'delivered');
    const assignedOrderIds = activeDeliveries.map(d => {
      const orderId = typeof d.order === 'object' ? d.order._id || d.order : d.order;
      return orderId ? orderId.toString() : '';
    }).filter(Boolean);

    // 2. Find orders that are 'confirmed' and not assigned to any delivery boy
    let orders = await Order.find({ status: 'confirmed' })
      .populate('customer')
      .populate('vendor')
      .populate('items.product');

    // Filter out assigned orders
    orders = orders.filter(o => o && o._id && !assignedOrderIds.includes(o._id.toString()));

    res.json(orders);
  } catch (error) {
    console.error('Fetch available orders failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get active delivery job for delivery boy
// @route   GET /api/orders/delivery/active
// @access  Private (Delivery agent only)
router.get('/delivery/active', protect, authorize('delivery'), async (req, res) => {
  try {
    let deliveries = await Delivery.find({ deliveryBoy: req.user._id }).populate('order');
    const active = deliveries.find(d => d.status === 'assigned' || d.status === 'picked_up');
    
    res.json(active || null);
  } catch (error) {
    console.error('Fetch active delivery failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get 10 most recent completed delivery jobs for delivery boy
// @route   GET /api/orders/delivery/completed
// @access  Private (Delivery agent only)
router.get('/delivery/completed', protect, authorize('delivery'), async (req, res) => {
  try {
    let deliveries = await Delivery.find({ deliveryBoy: req.user._id, status: 'delivered' }).populate('order');
    
    // Sort completed deliveries by date descending and limit to 10
    deliveries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(deliveries.slice(0, 10));
  } catch (error) {
    console.error('Fetch completed deliveries failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Assign a confirmed order to a delivery boy
// @route   POST /api/orders/:id/assign
// @access  Private (Delivery agent only)
router.post('/:id/assign', protect, authorize('delivery'), async (req, res) => {
  try {
    // 1. Verify delivery boy is free
    const deliveryBoy = await User.findById(req.user._id);
    if (!deliveryBoy || deliveryBoy.deliveryStatus === 'busy') {
      return res.status(400).json({ message: 'You are currently busy with another delivery' });
    }

    // 2. Verify order exists and is confirmed
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ message: 'Order must be confirmed by vendor before assignment' });
    }

    // 3. Verify order is not already assigned
    const existingDeliveries = await Delivery.find({ order: order._id });
    const isAssigned = existingDeliveries.some(d => d.status !== 'cancelled');
    if (isAssigned) {
      return res.status(400).json({ message: 'This order is already claimed by another delivery partner' });
    }

    // 4. Create Delivery record with full delivery fee payout
    const delivery = await Delivery.create({
      order: order._id,
      deliveryBoy: req.user._id,
      status: 'assigned',
      earnings: order.deliveryFeeTotal, // Payout is full delivery fee
    });

    // 5. Update order status and delivery boy status
    order.status = 'on the way';
    await order.save();

    deliveryBoy.deliveryStatus = 'busy';
    await deliveryBoy.save();

    res.json({ success: true, message: 'Delivery job claimed successfully', delivery });
  } catch (error) {
    console.error('Assign delivery failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Mark order as picked up by delivery boy
// @route   POST /api/orders/:id/pickup
// @access  Private (Delivery agent only)
router.post('/:id/pickup', protect, authorize('delivery'), async (req, res) => {
  try {
    let deliveries = await Delivery.find({ order: req.params.id, deliveryBoy: req.user._id });
    const active = deliveries.find(d => d.status === 'assigned');
    
    if (!active) {
      return res.status(400).json({ message: 'No active assigned delivery found for this order' });
    }

    const delivery = await Delivery.findById(active._id);
    delivery.status = 'picked_up';
    await delivery.save();

    const order = await Order.findById(req.params.id);
    order.status = 'picked up';
    await order.save();

    res.json({ success: true, message: 'Order marked as picked up from vendor', delivery });
  } catch (error) {
    console.error('Pickup order failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Mark order as delivered by delivery boy (frees up agent & aggregates earnings)
// @route   POST /api/orders/:id/deliver
// @access  Private (Delivery agent only)
router.post('/:id/deliver', protect, authorize('delivery'), async (req, res) => {
  try {
    let deliveries = await Delivery.find({ order: req.params.id, deliveryBoy: req.user._id });
    const active = deliveries.find(d => d.status === 'picked_up' || d.status === 'assigned');

    if (!active) {
      return res.status(400).json({ message: 'No active delivery found for this order to complete' });
    }

    // 1. Complete delivery
    const delivery = await Delivery.findById(active._id);
    delivery.status = 'delivered';
    await delivery.save();

    // 2. Update order
    const order = await Order.findById(req.params.id);
    order.status = 'delivered';
    await order.save();

    // 3. Set delivery agent status to free
    const deliveryBoy = await User.findById(req.user._id);
    deliveryBoy.deliveryStatus = 'free';
    await deliveryBoy.save();

    res.json({ success: true, message: 'Order successfully delivered! Payout earned.', delivery });
  } catch (error) {
    console.error('Complete delivery failed:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
