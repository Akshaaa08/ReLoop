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
