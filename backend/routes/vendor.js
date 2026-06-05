import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Images only (jpeg, jpg, png, webp, gif)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Apply auth protection & vendor authorization to all vendor routes
router.use(protect);
router.use(authorize('vendor'));

// @desc    Get all listings for current vendor
// @route   GET /api/vendor/products
// @access  Private (Vendor)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Get statistics for vendor dashboard
// @route   GET /api/vendor/stats
// @access  Private (Vendor)
router.get('/stats', async (req, res) => {
  try {
    const products = await Product.find({ vendor: req.user._id });
    
    const activeListings = products.filter(p => p.status === 'active').length;
    const soldProducts = products.filter(p => p.status === 'sold');
    
    // Revenue recovered = sum of (discountedPrice * quantity) for sold items
    const revenueRecovered = soldProducts.reduce((acc, p) => acc + (p.discountedPrice * p.quantity), 0);
    
    // Products rescued = sum of quantity of sold items
    const productsRescued = soldProducts.reduce((acc, p) => acc + p.quantity, 0);
    
    // Waste prevented calculation (e.g. 1.2 kg average weight per item rescued)
    const wastePrevented = Math.round(productsRescued * 1.2); 

    res.json({
      activeListings,
      revenueRecovered,
      productsRescued,
      wastePrevented,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Create new product listing
// @route   POST /api/vendor/products
// @access  Private (Vendor)
router.post('/products', upload.single('image'), async (req, res) => {
  const { name, category, description, originalPrice, discountedPrice, quantity, expiryDate } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    let imagePath = `/uploads/${req.file.filename}`;

    // Upload to Cloudinary if credentials are configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'reloop',
        });
        imagePath = result.secure_url;
        // Delete temporary file from local filesystem
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to local storage:', cloudinaryError.message);
      }
    }

    const product = await Product.create({
      name,
      category,
      description,
      originalPrice: parseFloat(originalPrice),
      discountedPrice: parseFloat(discountedPrice),
      quantity: parseInt(quantity),
      expiryDate: new Date(expiryDate),
      image: imagePath,
      vendor: req.user._id,
      coordinates: req.user.coordinates, // copy coordinate from vendor for geospatial query optimization
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Update product listing
// @route   PUT /api/vendor/products/:id
// @access  Private (Vendor)
router.put('/products/:id', upload.single('image'), async (req, res) => {
  const { name, category, description, originalPrice, discountedPrice, quantity, expiryDate, status } = req.body;

  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check ownership
    if (product.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this listing' });
    }

    // Update details
    product.name = name || product.name;
    product.category = category || product.category;
    product.description = description || product.description;
    if (originalPrice) product.originalPrice = parseFloat(originalPrice);
    if (discountedPrice) product.discountedPrice = parseFloat(discountedPrice);
    if (quantity) product.quantity = parseInt(quantity);
    if (expiryDate) product.expiryDate = new Date(expiryDate);
    if (status) product.status = status;

    // Update image if new upload
    if (req.file) {
      let imageUrl = `/uploads/${req.file.filename}`;
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'reloop',
          });
          imageUrl = result.secure_url;
          // Delete temporary file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed, falling back to local storage:', cloudinaryError.message);
        }
      } else {
        // Fallback local storage: delete old local image if it existed and was local
        if (product.image && !product.image.startsWith('http')) {
          try {
            const oldPath = path.join(process.cwd(), product.image.substring(1));
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          } catch (err) {
            console.error('Failed to delete old image:', err);
          }
        }
      }
      product.image = imageUrl;
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Toggle sold status
// @route   PUT /api/vendor/products/:id/sold
// @access  Private (Vendor)
router.put('/products/:id/sold', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this listing' });
    }

    product.status = product.status === 'active' ? 'sold' : 'active';
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// @desc    Delete product listing
// @route   DELETE /api/vendor/products/:id
// @access  Private (Vendor)
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.vendor.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this listing' });
    }

    // Delete image file from server
    try {
      const oldPath = path.join(process.cwd(), product.image.substring(1));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    } catch (err) {
      console.error('Failed to delete old image:', err);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

export default router;
