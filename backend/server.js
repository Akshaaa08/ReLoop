import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import vendorRoutes from './routes/vendor.js';
import savedRoutes from './routes/saved.js';
import aiRoutes from './routes/ai.js';
import translateRoutes from './routes/translate.js';

// Model Imports (for seeding)
import User from './models/User.js';
import Product from './models/Product.js';

// Load Env
dotenv.config();

// Prevent unhandled errors from crashing the process
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err.message);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});

// Connect DB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve Static Uploads
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/translate', translateRoutes);

// Simple Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({ message: 'ReLoop API is running smoothly.' });
});

// Seed Data Function (Run once if database is empty)
const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already seeded or has data. Skipping seed.');
      return;
    }

    console.log('Seeding database with initial users and deals...');

    // 1. Create Mock Vendors
    const vendor1 = await User.create({
      name: 'ABC Bakery Manager',
      email: 'bakery@reloop.com',
      password: 'password123',
      role: 'vendor',
      storeName: 'ABC Bakery',
      storeAddress: 'Shop 12, Gangadham Chowk, Bibwewadi, Pune',
      storePhone: '919999999999',
      coordinates: { lat: 18.4812, lng: 73.8690 }
    });

    const vendor2 = await User.create({
      name: 'Daily Bread Manager',
      email: 'bread@reloop.com',
      password: 'password123',
      role: 'vendor',
      storeName: 'Daily Bread Co.',
      storeAddress: 'G-4, Satara Road, near Salisbury Park, Pune',
      storePhone: '918888888888',
      coordinates: { lat: 18.4942, lng: 73.8620 }
    });

    const vendor3 = await User.create({
      name: 'Green Grocery Manager',
      email: 'green@reloop.com',
      password: 'password123',
      role: 'vendor',
      storeName: 'Fruit Hub',
      storeAddress: 'A-21, Bibwewadi-Kondhwa Road, near Gangadham, Pune',
      storePhone: '917777777777',
      coordinates: { lat: 18.4795, lng: 73.8745 }
    });

    const vendor4 = await User.create({
      name: 'Office Needs Manager',
      email: 'office@reloop.com',
      password: 'password123',
      role: 'vendor',
      storeName: 'Office Needs Inc.',
      storeAddress: 'Shop 105, Satara Road, near Padmavati, Pune',
      storePhone: '916666666666',
      coordinates: { lat: 18.4835, lng: 73.8530 }
    });

    // Create a default Customer
    await User.create({
      name: 'Aakash Sharma',
      email: 'customer@reloop.com',
      password: 'password123',
      role: 'customer',
      coordinates: { lat: 18.4850, lng: 73.8630 }
    });

    // 2. Create Mock Products (Seeded active deals)
    const mockProducts = [
      {
        name: 'Butter Croissant',
        category: 'Bakery',
        description: 'Freshly baked butter croissants nearing end-of-day inventory. Perfectly flaky, golden-brown, and delicious to eat today!',
        originalPrice: 50,
        discountedPrice: 15,
        quantity: 12,
        expiryDate: new Date(Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000), // 2h 15m from now
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
        vendor: vendor1._id,
        coordinates: vendor1.coordinates,
        status: 'active'
      },
      {
        name: 'Whole Wheat Bread',
        category: 'Bakery',
        description: 'Fresh baked whole wheat sliced bread. Extremely soft and rich in fiber. Ideal for breakfast toast and healthy sandwiches.',
        originalPrice: 50,
        discountedPrice: 20,
        quantity: 8,
        expiryDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3h from now
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
        vendor: vendor2._id,
        coordinates: vendor2.coordinates,
        status: 'active'
      },
      {
        name: 'Black Forest Cake',
        category: 'Bakery',
        description: 'A decadent chocolate layer cake layered with fresh whipped cream and sweet cherries. Baked fresh yesterday, clearing today.',
        originalPrice: 500,
        discountedPrice: 250,
        quantity: 2,
        expiryDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5h from now
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
        vendor: vendor1._id,
        coordinates: vendor1.coordinates,
        status: 'active'
      },
      {
        name: 'Organic Milk 1L',
        category: 'Dairy',
        description: 'Fresh pasteurized organic milk. High calcium content. Nearing expiry in 1 day. Perfect for immediate usage, baking or milkshakes.',
        originalPrice: 60,
        discountedPrice: 36,
        quantity: 15,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day left
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80',
        vendor: vendor2._id,
        coordinates: vendor2.coordinates,
        status: 'active'
      },
      {
        name: 'Fresh Bananas 1 Doz',
        category: 'Produce',
        description: 'A dozen fully ripe organic bananas. Perfectly sweet and soft. Ideal for eating immediately or baking banana breads.',
        originalPrice: 35,
        discountedPrice: 25,
        quantity: 6,
        expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6h from now
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80',
        vendor: vendor3._id,
        coordinates: vendor3.coordinates,
        status: 'active'
      },
      {
        name: 'Ergonomic Office Chair',
        category: 'Office Needs',
        description: 'Comfortable mesh-back ergonomic office chair. Adjustable height and armrests. Showroom display model being cleared for space.',
        originalPrice: 10000,
        discountedPrice: 3500,
        quantity: 1,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days left
        image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=600&q=80',
        vendor: vendor4._id,
        coordinates: vendor4.coordinates,
        status: 'active'
      },
      {
        name: 'Study Table',
        category: 'Furniture',
        description: 'Sturdy wooden student study table with drawer storage. Excellent condition, long-shelved inventory clear-out deal!',
        originalPrice: 5000,
        discountedPrice: 2250,
        quantity: 1,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days left
        image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80',
        vendor: vendor4._id,
        coordinates: vendor4.coordinates,
        status: 'active'
      },
      {
        name: 'Assorted Cookies',
        category: 'Bakery',
        description: 'A large box of oven-fresh assorted bakery cookies (oats, raisin, and double choc-chip). Crispy and ready to enjoy!',
        originalPrice: 300,
        discountedPrice: 90,
        quantity: 4,
        expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h from now
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80',
        vendor: vendor1._id,
        coordinates: vendor1.coordinates,
        status: 'active'
      }
    ];

    await Product.insertMany(mockProducts);
    console.log('Seeded database successfully!');
  } catch (error) {
    console.error('Seeding database failed:', error.message);
  }
};

// Trigger Seeding after server startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  await seedDatabase();
});
