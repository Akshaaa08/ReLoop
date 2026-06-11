import mongoose from 'mongoose';
import { loadDb, saveDb } from '../config/inMemoryDb.js';
import { MockQuery } from '../config/dbFallback.js';

const DeliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  deliveryBoy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['assigned', 'picked_up', 'delivered', 'cancelled'],
    default: 'assigned',
  },
  earnings: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MongooseDelivery = mongoose.model('Delivery', DeliverySchema);

const Delivery = {
  find: (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseDelivery.find(query);
    }

    const db = loadDb();
    let results = [...db.deliveries];

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
      return MongooseDelivery.findById(id);
    }

    const idStr = id ? id.toString() : '';
    const db = loadDb();
    const deliv = db.deliveries.find(d => d._id === idStr);

    if (!deliv) {
      return new MockQuery(null);
    }

    // Mock Document Instance
    const docInstance = {
      ...deliv,
      toObject: function() {
        const { ...plain } = this;
        delete plain.toObject;
        delete plain.save;
        return plain;
      },
      save: async function() {
        const currentDb = loadDb();
        const index = currentDb.deliveries.findIndex(d => d._id === idStr);
        if (index !== -1) {
          currentDb.deliveries[index] = {
            _id: this._id,
            order: this.order.toString(),
            deliveryBoy: this.deliveryBoy.toString(),
            status: this.status,
            earnings: parseFloat(this.earnings),
            createdAt: this.createdAt
          };
          saveDb(currentDb);
        }
        return this;
      }
    };

    return new MockQuery(docInstance);
  },

  create: async (deliveryData) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseDelivery.create(deliveryData);
    }

    const db = loadDb();
    
    const newDelivery = {
      _id: new mongoose.Types.ObjectId().toString(),
      order: deliveryData.order.toString(),
      deliveryBoy: deliveryData.deliveryBoy.toString(),
      status: deliveryData.status || 'assigned',
      earnings: parseFloat(deliveryData.earnings) || 0,
      createdAt: new Date().toISOString()
    };

    db.deliveries.push(newDelivery);
    saveDb(db);

    return {
      ...newDelivery,
      toObject: function() {
        return newDelivery;
      }
    };
  },

  countDocuments: async (query) => {
    if (mongoose.connection.readyState === 1) {
      return MongooseDelivery.countDocuments(query);
    }
    const db = loadDb();
    return db.deliveries.length;
  }
};

export default Delivery;
