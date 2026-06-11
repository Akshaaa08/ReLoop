import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'local_db.json');

export const loadDb = () => {
  if (fs.existsSync(dbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      let modified = false;
      const now = new Date();

      const offsets = [
        2.25 * 60 * 60 * 1000, // 2.25h (Red)
        24 * 60 * 60 * 1000,   // 24h (Green)
        5 * 60 * 60 * 1000,    // 5h (Orange)
        3 * 60 * 60 * 1000,    // 3h (Red)
        48 * 60 * 60 * 1000,   // 48h (Green)
        6 * 60 * 60 * 1000,    // 6h (Orange)
        72 * 60 * 60 * 1000,   // 72h (Green)
        4 * 60 * 60 * 1000,    // 4h (Orange)
      ];

      if (data.products && Array.isArray(data.products)) {
        data.products.forEach((product, index) => {
          const expiry = new Date(product.expiryDate);
          if (expiry < now) {
            const offset = offsets[index % offsets.length];
            product.expiryDate = new Date(Date.now() + offset).toISOString();
            product.createdAt = new Date().toISOString();
            modified = true;
          }
        });
      }

      if (!data.orders) {
        data.orders = [];
        modified = true;
      }

      if (!data.deliveries) {
        data.deliveries = [];
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        console.log('🔄 loadDb: Automatically refreshed expired mock products or initialized tables in local_db.json');
      }

      return data;
    } catch (e) {
      console.error('Failed to parse local DB, resetting:', e);
    }
  }
  return { users: [], products: [], orders: [], deliveries: [] };
};

export const saveDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
};

export const initializeLocalDb = () => {
  const data = loadDb();
  if (data.users.length === 0) {
    console.log('🌱 Initializing local JSON database seed...');
    
    // Seed Users
    const users = [
      {
        _id: '665f12345678901234567801',
        name: 'ABC Bakery Manager',
        email: 'bakery@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2', // hashed 'password123'
        role: 'vendor',
        storeName: 'ABC Bakery',
        storeAddress: 'Shop 12, Gangadham Chowk, Bibwewadi, Pune',
        storePhone: '919999999999',
        coordinates: { lat: 18.4812, lng: 73.8690 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f12345678901234567802',
        name: 'Daily Bread Manager',
        email: 'bread@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2',
        role: 'vendor',
        storeName: 'Daily Bread Co.',
        storeAddress: 'G-4, Satara Road, near Salisbury Park, Pune',
        storePhone: '918888888888',
        coordinates: { lat: 18.4942, lng: 73.8620 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f12345678901234567803',
        name: 'Green Grocery Manager',
        email: 'green@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2',
        role: 'vendor',
        storeName: 'Fruit Hub',
        storeAddress: 'A-21, Bibwewadi-Kondhwa Road, near Gangadham, Pune',
        storePhone: '917777777777',
        coordinates: { lat: 18.4795, lng: 73.8745 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f12345678901234567804',
        name: 'Office Needs Manager',
        email: 'office@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2',
        role: 'vendor',
        storeName: 'Office Needs Inc.',
        storeAddress: 'Shop 105, Satara Road, near Padmavati, Pune',
        storePhone: '916666666666',
        coordinates: { lat: 18.4835, lng: 73.8530 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f12345678901234567805',
        name: 'Aakash Sharma',
        email: 'customer@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2',
        role: 'customer',
        coordinates: { lat: 18.4850, lng: 73.8630 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f12345678901234567806',
        name: 'Raju Delivery Partner',
        email: 'delivery@reloop.com',
        password: '$2a$10$U7vN/g24LpI/79Lly91vhuNfSsnH2vB7B5.p0241UfQ9q1n4P01H2', // hashed 'password123'
        role: 'delivery',
        deliveryStatus: 'free',
        coordinates: { lat: 18.4850, lng: 73.8630 },
        savedDeals: [],
        createdAt: new Date().toISOString()
      }
    ];

    // Seed Products
    const products = [
      {
        _id: '665f56789012345678900001',
        name: 'Butter Croissant',
        category: 'Bakery',
        description: 'Freshly baked butter croissants nearing end-of-day inventory. Perfectly flaky, golden-brown, and delicious to eat today!',
        originalPrice: 50,
        discountedPrice: 15,
        discountPercentage: 70,
        quantity: 12,
        expiryDate: new Date(Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
        vendor: '665f12345678901234567801',
        coordinates: { lat: 18.4812, lng: 73.8690 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900002',
        name: 'Whole Wheat Bread',
        category: 'Bakery',
        description: 'Fresh baked whole wheat sliced bread. Extremely soft and rich in fiber. Ideal for breakfast toast and healthy sandwiches.',
        originalPrice: 50,
        discountedPrice: 20,
        discountPercentage: 60,
        quantity: 8,
        expiryDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
        vendor: '665f12345678901234567802',
        coordinates: { lat: 18.4942, lng: 73.8620 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900003',
        name: 'Black Forest Cake',
        category: 'Bakery',
        description: 'A decadent chocolate layer cake layered with fresh whipped cream and sweet cherries. Baked fresh yesterday, clearing today.',
        originalPrice: 500,
        discountedPrice: 250,
        discountPercentage: 50,
        quantity: 2,
        expiryDate: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
        vendor: '665f12345678901234567801',
        coordinates: { lat: 18.4812, lng: 73.8690 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900004',
        name: 'Organic Milk 1L',
        category: 'Dairy',
        description: 'Fresh pasteurized organic milk. High calcium content. Nearing expiry in 1 day. Perfect for immediate usage, baking or milkshakes.',
        originalPrice: 60,
        discountedPrice: 36,
        discountPercentage: 40,
        quantity: 15,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80',
        vendor: '665f12345678901234567802',
        coordinates: { lat: 18.4942, lng: 73.8620 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900005',
        name: 'Fresh Bananas 1 Doz',
        category: 'Produce',
        description: 'A dozen fully ripe organic bananas. Perfectly sweet and soft. Ideal for eating immediately or baking banana breads.',
        originalPrice: 35,
        discountedPrice: 25,
        discountPercentage: 29,
        quantity: 6,
        expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80',
        vendor: '665f12345678901234567803',
        coordinates: { lat: 18.4795, lng: 73.8745 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900006',
        name: 'Ergonomic Office Chair',
        category: 'Office Needs',
        description: 'Comfortable mesh-back ergonomic office chair. Adjustable height and armrests. Showroom display model being cleared for space.',
        originalPrice: 10000,
        discountedPrice: 3500,
        discountPercentage: 65,
        quantity: 1,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=600&q=80',
        vendor: '665f12345678901234567804',
        coordinates: { lat: 18.4835, lng: 73.8530 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900007',
        name: 'Study Table',
        category: 'Furniture',
        description: 'Sturdy wooden student study table with drawer storage. Excellent condition, long-shelved inventory clear-out deal!',
        originalPrice: 5000,
        discountedPrice: 2250,
        discountPercentage: 55,
        quantity: 1,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80',
        vendor: '665f12345678901234567804',
        coordinates: { lat: 18.4835, lng: 73.8530 },
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        _id: '665f56789012345678900008',
        name: 'Assorted Cookies',
        category: 'Bakery',
        description: 'A large box of oven-fresh assorted bakery cookies (oats, raisin, and double choc-chip). Crispy and ready to enjoy!',
        originalPrice: 300,
        discountedPrice: 90,
        discountPercentage: 70,
        quantity: 4,
        expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80',
        vendor: '665f12345678901234567801',
        coordinates: { lat: 18.4812, lng: 73.8690 },
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];

    saveDb({ users, products, orders: [], deliveries: [] });
    console.log('🌱 Local JSON database successfully seeded!');
  }
};
