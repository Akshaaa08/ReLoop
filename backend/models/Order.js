import mongoose from 'mongoose';
import { loadDb, saveDb } from '../config/inMemoryDb.js';
import { MockQuery } from '../config/dbFallback.js';

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  productTotal: {
    type: Number,
    required: true,
  },
  deliveryFeeTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  deliveryFeeCustomer: {
    type: Number,
    required: true,
    default: 0,
  },
  deliveryFeeVendor: {
    type: Number,
    required: true,
    default: 0,
  },
  grandTotal: {
    type: Number,
    required: true,
  },
  deliveryAddress: {
    type: String,
    required: true,
  },
  deliveryCoordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  distance: {
    type: Number,
    required: true,
  },
  deliveryNotes: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'on the way', 'picked up', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentSessionId: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtuals for backward compatibility (subtotal, total, deliveryFee)
OrderSchema.virtual('subtotal').get(function() { return this.productTotal; });
OrderSchema.virtual('total').get(function() { return this.grandTotal; });
OrderSchema.virtual('deliveryFee').get(function() { return this.deliveryFeeCustomer; });
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

const MongooseOrder = mongoose.model('Order', OrderSchema);

const Order = {
  find: (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseOrder.find(query);
    }

    const db = loadDb();
    let results = [...db.orders];

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
      subtotal: item.productTotal,
      total: item.grandTotal,
      deliveryFee: item.deliveryFeeCustomer,
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
      return MongooseOrder.findById(id);
    }

    const idStr = id ? id.toString() : '';
    const db = loadDb();
    const order = db.orders.find(o => o._id === idStr);

    if (!order) {
      return new MockQuery(null);
    }

    // Mock Document Instance
    const docInstance = {
      ...order,
      subtotal: order.productTotal,
      total: order.grandTotal,
      deliveryFee: order.deliveryFeeCustomer,
      toObject: function() {
        const { ...plain } = this;
        delete plain.toObject;
        delete plain.save;
        return plain;
      },
      save: async function() {
        const currentDb = loadDb();
        const index = currentDb.orders.findIndex(o => o._id === idStr);
        if (index !== -1) {
          currentDb.orders[index] = {
            _id: this._id,
            customer: this.customer.toString(),
            vendor: this.vendor.toString(),
            items: this.items.map(item => ({
              product: typeof item.product === 'object' ? (item.product._id || item.product).toString() : item.product.toString(),
              quantity: parseInt(item.quantity),
              price: parseFloat(item.price)
            })),
            productTotal: parseFloat(this.productTotal),
            deliveryFeeTotal: parseFloat(this.deliveryFeeTotal),
            deliveryFeeCustomer: parseFloat(this.deliveryFeeCustomer),
            deliveryFeeVendor: parseFloat(this.deliveryFeeVendor),
            grandTotal: parseFloat(this.grandTotal),
            deliveryAddress: this.deliveryAddress,
            deliveryCoordinates: this.deliveryCoordinates,
            distance: parseFloat(this.distance),
            status: this.status,
            deliveryNotes: this.deliveryNotes,
            paymentSessionId: this.paymentSessionId || '',
            createdAt: this.createdAt
          };
          saveDb(currentDb);
        }
        return this;
      }
    };

    return new MockQuery(docInstance);
  },

  create: async (orderData) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseOrder.create(orderData);
    }

    const db = loadDb();
    
    const newOrder = {
      _id: new mongoose.Types.ObjectId().toString(),
      customer: orderData.customer.toString(),
      vendor: orderData.vendor.toString(),
      items: orderData.items.map(item => ({
        product: typeof item.product === 'object' ? (item.product._id || item.product).toString() : item.product.toString(),
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price)
      })),
      productTotal: parseFloat(orderData.productTotal),
      deliveryFeeTotal: parseFloat(orderData.deliveryFeeTotal) || 0,
      deliveryFeeCustomer: parseFloat(orderData.deliveryFeeCustomer) || 0,
      deliveryFeeVendor: parseFloat(orderData.deliveryFeeVendor) || 0,
      grandTotal: parseFloat(orderData.grandTotal),
      deliveryAddress: orderData.deliveryAddress,
      deliveryCoordinates: orderData.deliveryCoordinates,
      distance: parseFloat(orderData.distance),
      status: orderData.status || 'pending',
      deliveryNotes: orderData.deliveryNotes || '',
      paymentSessionId: orderData.paymentSessionId || '',
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    saveDb(db);

    return {
      ...newOrder,
      subtotal: newOrder.productTotal,
      total: newOrder.grandTotal,
      deliveryFee: newOrder.deliveryFeeCustomer,
      toObject: function() {
        return newOrder;
      }
    };
  },

  countDocuments: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseOrder.countDocuments(query);
    }
    const db = loadDb();
    return db.orders.length;
  }
};

export default Order;
