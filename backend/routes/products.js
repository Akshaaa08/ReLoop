import express from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';

const router = express.Router();

// Helper: Haversine distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

// @desc    Get all active products with filters and distance sorting
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  const { category, search, lat, lng } = req.query;

  try {
    let query = { status: 'active' };

    // Filter by category
    if (category && category !== 'All' && category !== 'सभी') {
      // Support both English and Hindi categories
      query.category = category;
    }

    let products = await Product.find(query)
      .populate('vendor', 'name storeName storeAddress storePhone coordinates')
      .sort({ createdAt: -1 });

    // Filter by search query (Product name, category, or vendor store name)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      products = products.filter(product => {
        return (
          searchRegex.test(product.name) ||
          searchRegex.test(product.category) ||
          (product.vendor && searchRegex.test(product.vendor.storeName))
        );
      });
    }

    // Convert products to clean JSON and inject distance
    let results = products.map(product => {
      const productObj = product.toObject();
      let distance = 0;

      if (lat && lng && product.coordinates) {
        distance = getDistance(
          parseFloat(lat),
          parseFloat(lng),
          product.coordinates.lat,
          product.coordinates.lng
        );
      } else if (product.vendor && product.vendor.coordinates) {
        // Fallback to vendor coordinates
        distance = getDistance(
          lat ? parseFloat(lat) : 28.6139,
          lng ? parseFloat(lng) : 77.2090,
          product.vendor.coordinates.lat,
          product.vendor.coordinates.lng
        );
      }

      productObj.distance = parseFloat(distance.toFixed(1)); // 1 decimal place e.g. 1.2 km
      return productObj;
    });

    // If coordinates provided, sort by distance (nearest first)
    if (lat && lng) {
      results.sort((a, b) => a.distance - b.distance);
    }

    res.json(results);
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'name storeName storeAddress storePhone coordinates');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productObj = product.toObject();
    
    // Add default distance
    productObj.distance = 0.5; // Default mock distance if coordinates not queried

    res.json(productObj);
  } catch (error) {
    console.error('Fetch product details error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
