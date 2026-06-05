import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, DollarSign, Award, Leaf, Trash2, CheckCircle, XCircle, Plus, Eye } from 'lucide-react';

const VendorDashboard = ({ onProductSelect, onAddClick }) => {
  const { t, showToast } = useApp();
  const { user, token } = useAuth();
  
  const [stats, setStats] = useState({
    activeListings: 0,
    revenueRecovered: 0,
    productsRescued: 0,
    wastePrevented: 0
  });
  
  const [vendorProducts, setVendorProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch stats and products
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch statistics
      const statsRes = await fetch('/api/vendor/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch vendor products list
      const productsRes = await fetch('/api/vendor/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setVendorProducts(productsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  // Toggle Sold status
  const handleToggleSold = async (id) => {
    try {
      const res = await fetch(`/api/vendor/products/${id}/sold`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast('Product status updated!');
        loadDashboardData(); // reload
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete product listing
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast('Listing deleted successfully');
        loadDashboardData(); // reload
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="content-body">
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', lineHeight: 1.1 }}>
            {t('welcomeBack')}, {user?.storeName || user?.name} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {t('impactToday')} in Connaught Place.
          </p>
        </div>
        <button className="btn-primary" onClick={onAddClick}>
          <Plus size={16} />
          <span>{t('addProduct')}</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">₹{stats.revenueRecovered.toLocaleString()}</span>
            <span className="stat-label">{t('revenueRecovered')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <ShoppingBag size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.productsRescued}</span>
            <span className="stat-label">{t('productsRescued')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Leaf size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.wastePrevented} kg</span>
            <span className="stat-label">{t('wastePrevented')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeListings}</span>
            <span className="stat-label">{t('activeListings')}</span>
          </div>
        </div>
      </div>

      {/* Notion-style Inventory Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px' }}>Inventory List</h2>
        
        {vendorProducts.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 40px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)'
            }}
          >
            <ShoppingBag size={44} style={{ color: 'var(--text-light)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Listings Yet</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              Create your first near-expiry or clearance discount deal to rescue food waste and recover revenue!
            </p>
            <button className="btn-primary" onClick={onAddClick} style={{ margin: '0 auto' }}>
              <Plus size={16} />
              <span>{t('addProduct')}</span>
            </button>
          </div>
        ) : (
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorProducts.map((product) => {
                  const isSold = product.status === 'sold';
                  return (
                    <tr key={product._id} className="inventory-row">
                      {/* Product details cell */}
                      <td>
                        <div className="product-cell">
                          <img src={product.image} alt={product.name} className="product-cell-img" />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase' }}>
                              {product.category}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Pricing cell */}
                      <td>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--primary-green)' }}>₹{product.discountedPrice}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                            ₹{product.originalPrice}
                          </div>
                        </div>
                      </td>

                      {/* Quantity cell */}
                      <td>{product.quantity} pcs</td>

                      {/* Expiry cell */}
                      <td>
                        <span style={{ fontSize: '12px', color: isSold ? 'var(--text-light)' : 'var(--danger-color)', fontWeight: 600 }}>
                          {new Date(product.expiryDate).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* Status indicator cell */}
                      <td>
                        <span className={`status-indicator ${isSold ? 'sold' : 'active'}`}>
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isSold ? 'var(--text-light)' : 'var(--success-color)'
                            }}
                          ></div>
                          <span>{isSold ? t('soldLabel') : t('activeLabel')}</span>
                        </span>
                      </td>

                      {/* Action buttons cell */}
                      <td>
                        <div className="action-menu" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="icon-btn"
                            title="Toggle status"
                            onClick={() => handleToggleSold(product._id)}
                            style={{ color: isSold ? 'var(--success-color)' : 'var(--text-light)' }}
                          >
                            {isSold ? <CheckCircle size={15} /> : <XCircle size={15} />}
                          </button>
                          
                          <button
                            className="icon-btn"
                            title="View product details"
                            onClick={() => onProductSelect(product._id)}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            className="icon-btn delete"
                            title="Delete listing"
                            onClick={() => handleDeleteProduct(product._id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
