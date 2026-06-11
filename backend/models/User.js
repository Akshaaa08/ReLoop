import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadDb, saveDb } from '../config/inMemoryDb.js';
import { MockQuery } from '../config/dbFallback.js';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['customer', 'vendor', 'delivery'],
    default: 'customer',
  },
  deliveryStatus: {
    type: String,
    enum: ['free', 'busy'],
    default: 'free',
  },
  // Vendor specific details
  storeName: {
    type: String,
    default: '',
  },
  storeAddress: {
    type: String,
    default: '',
  },
  storePhone: {
    type: String,
    default: '',
  },
  // Shared coordinates for search and pins
  coordinates: {
    lat: { type: Number, default: 28.6139 }, // Default to New Delhi or similar
    lng: { type: Number, default: 77.2090 },
  },
  // Bookmarks for customer
  savedDeals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const MongooseUser = mongoose.model('User', UserSchema);

// Transparent Proxy Layer for Local JSON File Fallback
const User = {
  findOne: (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findOne(query);
    }

    const db = loadDb();
    if (query && query.email) {
      const emailLower = query.email.toLowerCase();
      const user = db.users.find(u => u.email.toLowerCase() === emailLower);

      if (!user) {
        return new MockQuery(null);
      }

      // Add instance methods
      const docInstance = {
        ...user,
        matchPassword: async function(enteredPassword) {
          return await bcrypt.compare(enteredPassword, this.password);
        }
      };

      return new MockQuery(docInstance);
    }

    return new MockQuery(null);
  },

  findById: (id) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findById(id);
    }

    const idStr = id ? id.toString() : '';
    const db = loadDb();
    const user = db.users.find(u => u._id === idStr);

    if (!user) {
      return new MockQuery(null);
    }

    // Mock Document Instance
    const docInstance = {
      ...user,
      save: async function() {
        const currentDb = loadDb();
        const index = currentDb.users.findIndex(u => u._id === idStr);
        if (index !== -1) {
          if (this.password && !this.password.startsWith('$2a$')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
          }

          currentDb.users[index] = {
            _id: this._id,
            name: this.name,
            email: this.email,
            password: this.password,
            role: this.role,
            deliveryStatus: this.deliveryStatus || 'free',
            storeName: this.storeName,
            storeAddress: this.storeAddress,
            storePhone: this.storePhone,
            coordinates: this.coordinates,
            savedDeals: this.savedDeals ? this.savedDeals.map(d => d._id || d) : [],
            createdAt: this.createdAt
          };
          saveDb(currentDb);
        }
        return this;
      }
    };

    return new MockQuery(docInstance);
  },

  create: async (userData) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.create(userData);
    }

    const db = loadDb();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      role: userData.role || 'customer',
      deliveryStatus: userData.deliveryStatus || 'free',
      storeName: userData.storeName || '',
      storeAddress: userData.storeAddress || '',
      storePhone: userData.storePhone || '',
      coordinates: userData.coordinates || { lat: 28.6139, lng: 77.2090 },
      savedDeals: [],
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    return newUser;
  },

  countDocuments: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.countDocuments(query);
    }
    const db = loadDb();
    return db.users.length;
  }
};

export default User;
