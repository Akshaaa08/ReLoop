import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Clock, TrendingUp, CheckCircle, Package, RefreshCw, XCircle } from 'lucide-react';

const VendorOrderInbox = () => {
  const { showToast } = useApp();
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    try {
      const res = await fetch('/api/orders/vendor', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [token]);

  // Handle Confirm Order
  const handleConfirmOrder = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast("Order confirmed successfully!");
        fetchOrders();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to confirm order.");
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Failed to confirm order.");
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast("Order cancelled successfully.");
        fetchOrders();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to cancel order.");
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Failed to cancel order.");
    }
  };

  // Stats calculation
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length;
  const inProgressCount = orders.filter(o => o.status === 'on the way' || o.status === 'picked up').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  
  // Net payout = subtotal - delivery deduction
  const completedRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.subtotal - o.deliveryFee), 0);

  // Urgent orders (confirmed, unassigned) at the top, then pending, then in-progress, delivered, cancelled
  const getSortScore = (order) => {
    if (order.status === 'confirmed') return 0; // Confirmed, awaiting delivery boy pickup
    if (order.status === 'pending') return 1;   // Pending confirmation
    if (order.status === 'on the way' || order.status === 'picked up') return 2; // In delivery progress
    if (order.status === 'delivered') return 3; // Delivered
    return 4; // Cancelled
  };

  const sortedOrders = [...orders].sort((a, b) => {
    const scoreA = getSortScore(a);
    const scoreB = getSortScore(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return new Date(b.createdAt) - new Date(a.createdAt); // newest first
  });

  const getStatusText = (order) => {
    switch (order.status) {
      case 'pending':
        return { text: 'Awaiting Confirmation', className: 'text-warning' };
      case 'confirmed':
        return { text: 'Confirmed (Awaiting Delivery Partner)', className: 'text-primary' };
      case 'on the way':
        return { text: 'Agent Assigned (On Way to Store)', className: 'text-orange' };
      case 'picked up':
        return { text: 'Out for Delivery (Agent Picked Up)', className: 'text-orange' };
      case 'delivered':
        return { text: 'Delivered', className: 'text-success' };
      case 'cancelled':
        return { text: 'Order Cancelled', className: 'text-danger' };
      default:
        return { text: order.status, className: '' };
    }
  };

  if (loading) {
    return (
      <div className="content-body" style={{ padding: '32px 48px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: 0, color: 'var(--text-primary)' }}>
          Order Inbox
        </h1>
        <div className="skeleton skeleton-title" style={{ marginTop: '20px' }}></div>
        <div className="skeleton skeleton-card" style={{ height: '350px' }}></div>
      </div>
    );
  }

  return (
    <div className="content-body" style={{ padding: '32px 48px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: 0, color: 'var(--text-primary)' }}>
            Order Inbox
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Manage customer clearances, confirm incoming orders, and track active deliveries.
          </p>
        </div>
        <button 
          onClick={() => fetchOrders(true)} 
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <RefreshCw size={13} className={refreshing ? 'spin-anim' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Metrics dashboard summary bar */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
            <ClipboardList size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{confirmedCount}</span>
            <span className="stat-label">Confirmed</span>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{inProgressCount}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{deliveredCount}</span>
            <span className="stat-label">Delivered</span>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--light-green)', color: 'var(--primary-green)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">₹{completedRevenue}</span>
            <span className="stat-label">Net Revenue</span>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {sortedOrders.length === 0 ? (
        <div 
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)'
          }}
        >
          <Package size={40} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>No incoming orders yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedOrders.map((order) => {
            const status = getStatusText(order);
            const payout = order.subtotal - order.deliveryFee;
            const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
          });

            return (
              <div 
                key={order._id} 
                className="review-card"
                style={{
                  border: order.status === 'confirmed' ? '2px solid var(--primary-green)' : '1px solid var(--border-color)',
                  boxShadow: order.status === 'confirmed' ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                {order.status === 'confirmed' && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '20px',
                      backgroundColor: 'var(--primary-green)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 850,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Awaiting Agent Pickup
                  </span>
                )}

                {/* Top header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Customer: {order.customer?.name || 'Anonymous Rescuer'}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                      Order Placed: {orderDate}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={status.className} style={{ fontSize: '12.5px', fontWeight: 700 }}>
                      {status.text}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                      <div>
                        <strong>{item.quantity}x</strong> {item.product?.name || 'Surplus Item'}
                      </div>
                      <div>
                        ₹{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.deliveryNotes && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '14px'
                  }}>
                    <strong>Instructions:</strong> {order.deliveryNotes}
                  </div>
                )}

                {/* Footer totals & action buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 850, color: 'var(--text-primary)' }}>
                      Your Payout: <span style={{ color: 'var(--primary-green)' }}>₹{payout}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '2px' }}>
                      Subtotal: ₹{order.subtotal} (Deductions: ₹{order.deliveryFee} delivery charge)
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCancelOrder(order._id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          borderColor: 'var(--danger-color)',
                          color: 'var(--danger-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <XCircle size={14} />
                        <span>Decline</span>
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => handleConfirmOrder(order._id)}
                        style={{
                          padding: '6px 16px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--primary-green)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>Confirm</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorOrderInbox;
