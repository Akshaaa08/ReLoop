import mongoose from 'mongoose';
import { loadDb, saveDb } from '../config/inMemoryDb.js';
import { MockQuery } from '../config/dbFallback.js';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
    required: true,
  },
  discountPercentage: {
    type: Number,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'sold'],
    default: 'active',
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto calculate discount percentage before save
ProductSchema.pre('save', function (next) {
  if (this.originalPrice && this.discountedPrice) {
    const savings = this.originalPrice - this.discountedPrice;
    this.discountPercentage = Math.round((savings / this.originalPrice) * 100);
  }
  next();
});

const MongooseProduct = mongoose.model('Product', ProductSchema);

// Transparent Proxy Layer for Local JSON File Fallback
const Product = {
  find: (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.find(query);
    }

    const db = loadDb();
    let results = [...db.products];

    if (query) {
      results = results.filter(item => {
        for (const key in query) {
          const val = query[key];
          if (val === undefined) continue;

          const itemVal = item[key];
          const queryValStr = val ? val.toString() : '';
          const itemValStr = itemVal ? itemVal.toString() : '';

          if (queryValStr !== itemValStr) {
            return false;
          }
        }
        return true;
      });
    }

    const docResults = results.map(item => ({
      ...item,
      toObject: function() {
        const { ...plain } = this;
        delete plain.toObject;
        delete plain.save;
        return plain;
      }
    }));

    return new MockQuery(docResults);
  },

  findById: (id) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.findById(id);
    }

    const idStr = id ? id.toString() : '';
    const db = loadDb();
    const product = db.products.find(p => p._id === idStr);

    if (!product) {
      return new MockQuery(null);
    }

    // Mock Document Instance
    const docInstance = {
      ...product,
      toObject: function() {
        const { ...plain } = this;
        delete plain.toObject;
        delete plain.save;
        return plain;
      },
      save: async function() {
        const currentDb = loadDb();
        const index = currentDb.products.findIndex(p => p._id === idStr);
        if (index !== -1) {
          const orig = parseFloat(this.originalPrice);
          const disc = parseFloat(this.discountedPrice);
          const savings = orig - disc;
          this.discountPercentage = Math.round((savings / orig) * 100);

          currentDb.products[index] = {
            _id: this._id,
            name: this.name,
            category: this.category,
            description: this.description,
            originalPrice: orig,
            discountedPrice: disc,
            discountPercentage: this.discountPercentage,
            quantity: parseInt(this.quantity),
            expiryDate: new Date(this.expiryDate).toISOString(),
            image: this.image,
            vendor: this.vendor.toString(),
            coordinates: this.coordinates,
            status: this.status,
            createdAt: this.createdAt
          };
          saveDb(currentDb);
        }
        return this;
      }
    };

    return new MockQuery(docInstance);
  },

  create: async (productData) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.create(productData);
    }

    const db = loadDb();
    const orig = parseFloat(productData.originalPrice);
    const disc = parseFloat(productData.discountedPrice);
    const savings = orig - disc;
    const discountPercentage = Math.round((savings / orig) * 100);

    const newProduct = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: productData.name,
      category: productData.category,
      description: productData.description,
      originalPrice: orig,
      discountedPrice: disc,
      discountPercentage,
      quantity: parseInt(productData.quantity) || 1,
      expiryDate: new Date(productData.expiryDate).toISOString(),
      image: productData.image,
      vendor: productData.vendor.toString(),
      coordinates: productData.coordinates,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    db.products.push(newProduct);
    saveDb(db);

    return {
      ...newProduct,
      toObject: function() {
        return newProduct;
      }
    };
  },

  findByIdAndDelete: async (id) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.findByIdAndDelete(id);
    }

    const idStr = id ? id.toString() : '';
    const db = loadDb();
    db.products = db.products.filter(p => p._id !== idStr);
    saveDb(db);
    return { _id: idStr };
  },

  countDocuments: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.countDocuments(query);
    }
    const db = loadDb();
    return db.products.length;
  },

  insertMany: async (productsList) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseProduct.insertMany(productsList);
    }
    const db = loadDb();
    const seeded = productsList.map(p => {
      const orig = parseFloat(p.originalPrice);
      const disc = parseFloat(p.discountedPrice);
      const savings = orig - disc;
      const discountPercentage = Math.round((savings / orig) * 100);
      return {
        _id: p._id || new mongoose.Types.ObjectId().toString(),
        name: p.name,
        category: p.category,
        description: p.description,
        originalPrice: orig,
        discountedPrice: disc,
        discountPercentage,
        quantity: parseInt(p.quantity) || 1,
        expiryDate: p.expiryDate instanceof Date ? p.expiryDate.toISOString() : new Date(p.expiryDate).toISOString(),
        image: p.image,
        vendor: p.vendor.toString(),
        coordinates: p.coordinates,
        status: p.status || 'active',
        createdAt: new Date().toISOString()
      };
    });
    db.products.push(...seeded);
    saveDb(db);
    return seeded;
  }
};

export default Product;
