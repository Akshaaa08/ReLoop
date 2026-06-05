import express from 'express';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply auth protection & customer authorization to all bookmark routes
router.use(protect);
router.use(authorize('customer'));

// @desc    Get all saved/bookmarked deals for current customer
// @route   GET /api/saved
// @access  Private (Customer)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedDeals',
      match: { status: 'active' }, // only populate active deals
      populate: {
        path: 'vendor',
        select: 'name storeName storeAddress storePhone coordinates'
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.savedDeals);
  } catch (error) {
    console.error('Fetch saved deals error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Add product to saved deals
// @route   POST /api/saved/:id
// @access  Private (Customer)
router.post('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product deal not found' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already saved
    if (user.savedDeals.includes(req.params.id)) {
      return res.status(400).json({ message: 'Deal already saved' });
    }

    user.savedDeals.push(req.params.id);
    await user.save();

    res.json({ message: 'Deal saved successfully', savedDeals: user.savedDeals });
  } catch (error) {
    console.error('Save deal error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Remove product from saved deals
// @route   DELETE /api/saved/:id
// @access  Private (Customer)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Filter out the deal
    user.savedDeals = user.savedDeals.filter(
      dealId => dealId.toString() !== req.params.id.toString()
    );

    await user.save();
    res.json({ message: 'Deal removed from saved list', savedDeals: user.savedDeals });
  } catch (error) {
    console.error('Remove saved deal error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
