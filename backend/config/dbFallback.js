import { loadDb } from './inMemoryDb.js';

export class MockQuery {
  constructor(data) {
    this.data = data;
  }

  populate(path, select) {
    const isArray = Array.isArray(this.data);
    const items = isArray ? this.data : [this.data];

    const targetPath = typeof path === 'object' ? path.path : path;

    if (targetPath === 'vendor') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.vendor) {
          const vendorId = typeof item.vendor === 'object' ? item.vendor._id || item.vendor : item.vendor;
          const vendorObj = db.users.find(u => u._id === vendorId.toString());
          if (vendorObj) {
            const { password, ...vendorSafe } = vendorObj;
            return { ...item, vendor: vendorSafe };
          }
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    } else if (targetPath === 'savedDeals') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.savedDeals) {
          const populatedDeals = item.savedDeals.map(dealId => {
            const productObj = db.products.find(p => p._id === dealId.toString() && p.status === 'active');
            if (productObj) {
              const vendorObj = db.users.find(u => u._id === productObj.vendor);
              const { password, ...vendorSafe } = vendorObj || {};
              return { ...productObj, vendor: vendorSafe };
            }
            return null;
          }).filter(Boolean);
          return { ...item, savedDeals: populatedDeals };
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    } else if (targetPath === 'customer') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.customer) {
          const custId = typeof item.customer === 'object' ? item.customer._id || item.customer : item.customer;
          const custObj = db.users.find(u => u._id === custId.toString());
          if (custObj) {
            const { password, ...custSafe } = custObj;
            return { ...item, customer: custSafe };
          }
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    } else if (targetPath === 'deliveryBoy') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.deliveryBoy) {
          const dbId = typeof item.deliveryBoy === 'object' ? item.deliveryBoy._id || item.deliveryBoy : item.deliveryBoy;
          const dbObj = db.users.find(u => u._id === dbId.toString());
          if (dbObj) {
            const { password, ...dbSafe } = dbObj;
            return { ...item, deliveryBoy: dbSafe };
          }
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    } else if (targetPath === 'order') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.order) {
          const orderId = typeof item.order === 'object' ? item.order._id || item.order : item.order;
          const orderObj = db.orders.find(o => o._id === orderId.toString());
          if (orderObj) {
            const customerObj = db.users.find(u => u._id === orderObj.customer);
            const { password: cp, ...customerSafe } = customerObj || {};
            
            const vendorObj = db.users.find(u => u._id === orderObj.vendor);
            const { password: vp, ...vendorSafe } = vendorObj || {};

            const populatedItems = (orderObj.items || []).map(orderItem => {
              const productObj = db.products.find(p => p._id === orderItem.product.toString());
              let productPop = productObj;
              if (productObj) {
                const prodVendor = db.users.find(u => u._id === productObj.vendor);
                const { password: pvp, ...prodVendorSafe } = prodVendor || {};
                productPop = { ...productObj, vendor: prodVendorSafe };
              }
              return { ...orderItem, product: productPop };
            });

            return { 
              ...item, 
              order: { 
                ...orderObj, 
                subtotal: orderObj.productTotal,
                total: orderObj.grandTotal,
                deliveryFee: orderObj.deliveryFeeCustomer,
                customer: customerSafe, 
                vendor: vendorSafe,
                items: populatedItems
              } 
            };
          }
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    } else if (targetPath === 'items.product' || targetPath === 'product') {
      const db = loadDb();
      const updated = items.map(item => {
        if (item && item.items && Array.isArray(item.items)) {
          const populatedItems = item.items.map(orderItem => {
            if (orderItem.product) {
              const prodId = typeof orderItem.product === 'object' ? orderItem.product._id || orderItem.product : orderItem.product;
              const productObj = db.products.find(p => p._id === prodId.toString());
              if (productObj) {
                const vendorObj = db.users.find(u => u._id === productObj.vendor);
                const { password, ...vendorSafe } = vendorObj || {};
                return { 
                  ...orderItem, 
                  product: { ...productObj, vendor: vendorSafe } 
                };
              }
            }
            return orderItem;
          });
          return { ...item, items: populatedItems };
        }
        return item;
      });
      this.data = isArray ? updated : updated[0];
    }

    return this;
  }

  sort(sortObj) {
    if (Array.isArray(this.data) && sortObj) {
      if (sortObj.createdAt === -1) {
        this.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    }
    return this;
  }

  select(selectStr) {
    // Mock select (e.g. -password)
    if (selectStr === '-password') {
      const filterPassword = (item) => {
        if (item) {
          const { password, ...safe } = item;
          return safe;
        }
        return item;
      };
      this.data = Array.isArray(this.data) ? this.data.map(filterPassword) : filterPassword(this.data);
    }
    return this;
  }

  exec() {
    return Promise.resolve(this.data);
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}
