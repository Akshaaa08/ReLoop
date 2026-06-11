import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowRight, Calendar, Tag, Info } from 'lucide-react';

const OrderHistory = ({ onExploreDeals }) => {
  const { showToast } = useApp();
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/customer', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        showToast("Failed to fetch order history.");
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  // Color map for status badges
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return { bg: 'rgba(107, 114, 128, 0.12)', fg: '#6B7280', label: 'Pending' };
      case 'confirmed':
        return { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3B82F6', label: 'Confirmed' };
      case 'on the way':
        return { bg: 'rgba(245, 158, 11, 0.12)', fg: '#F59E0B', label: 'On The Way' };
      case 'picked up':
        return { bg: 'rgba(249, 115, 22, 0.12)', fg: '#F97316', label: 'Picked Up' };
      case 'delivered':
        return { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10B981', label: 'Delivered' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.12)', fg: '#EF4444', label: 'Cancelled' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.12)', fg: '#6B7280', label: status };
    }
  };

  if (loading) {
    return (
      <div className="content-body" style={{ padding: '32px 48px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
          Order History
        </h1>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </div>
    );
  }

  return (
    <div className="content-body" style={{ padding: '32px 48px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
        Order History
      </h1>

      {orders.length === 0 ? (
        <div 
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: 'var(--text-secondary)'
          }}
        >
          <ShoppingBag size={48} style={{ color: 'var(--text-light)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>No Orders Yet</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>You haven't placed any surplus rescue orders yet. Join the circular economy today!</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={onExploreDeals}
            style={{ fontSize: '13px', padding: '10px 20px', borderRadius: '24px' }}
          >
            <span>Explore Surplus Deals</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => {
            const statusStyle = getStatusBadgeStyle(order.status);
            const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div 
                key={order._id} 
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {order.vendor?.storeName || 'Local Shop'}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                      <Calendar size={11} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <span 
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.fg,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      border: `1px solid ${statusStyle.fg}33`
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {item.product?.image ? (
                        <img 
                          src={item.product.image} 
                          alt={item.product.name || 'product'} 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-color)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-light)',
                          border: '1px solid var(--border-color)'
                        }}>
                          <Tag size={16} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.product?.name || 'Surplus Item'}
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                          ₹{item.price} &times; {item.quantity} units
                        </span>
                      </div>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.deliveryNotes && (
                  <div 
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px'
                    }}
                  >
                    <Info size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-light)' }} />
                    <div>
                      <strong>Delivery Notes:</strong> {order.deliveryNotes}
                    </div>
                  </div>
                )}

                {/* Footer Totals */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: '12px',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', color: 'var(--text-light)' }}>
                    <span>Subtotal: ₹{order.subtotal}</span>
                    <span>Delivery: ₹{order.deliveryFee}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>
                    Total Paid: <span style={{ color: 'var(--primary-green)' }}>₹{order.total}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
