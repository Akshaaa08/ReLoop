import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Navigation, Clock, MapPin, Phone, Truck, User } from 'lucide-react';

const DeliveryEarnings = () => {
  const { showToast } = useApp();
  const { user, token } = useAuth();
  
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch completed deliveries
      const completedRes = await fetch('/api/orders/delivery/completed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (completedRes.ok) {
        const completedData = await completedRes.json();
        setCompletedDeliveries(completedData);
      }

      // 2. Fetch active delivery
      const activeRes = await fetch('/api/orders/delivery/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveDelivery(activeData);
      }

      // 3. Fetch available orders
      const availableRes = await fetch('/api/orders/delivery/available', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (availableRes.ok) {
        const availableData = await availableRes.json();
        setAvailableOrders(availableData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  // Accept Delivery Job
  const handleAcceptJob = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Delivery job claimed! You are now busy.");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.message || "Failed to claim job.");
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Failed to accept job.");
    }
  };

  // Pickup Order
  const handlePickup = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Order picked up from vendor. Out for delivery!");
        loadData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Mark as Delivered
  const handleDeliver = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Delivery completed successfully! You are now free.");
        loadData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Stats calculation
  const totalLifetimeEarnings = (completedDeliveries || []).reduce((sum, d) => sum + (d?.earnings || 0), 0);
  const totalTripsCompleted = (completedDeliveries || []).length;
  
  // Calculate today's earnings
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayDeliveries = (completedDeliveries || []).filter(d => d && d.createdAt && new Date(d.createdAt) >= todayStart);
  const todayEarnings = todayDeliveries.reduce((sum, d) => sum + (d.earnings || 0), 0);
  const todayTrips = todayDeliveries.length;

  const averageEarnedPerDelivery = totalTripsCompleted > 0 
    ? parseFloat((totalLifetimeEarnings / totalTripsCompleted).toFixed(1)) 
    : 0;

  if (loading) {
    return (
      <div className="content-body" style={{ padding: '32px 48px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
          Earnings & Delivery Panel
        </h1>
        <div className="skeleton skeleton-title" style={{ marginTop: '20px' }}></div>
        <div className="skeleton skeleton-card" style={{ height: '350px' }}></div>
      </div>
    );
  }

  const isBusy = activeDelivery !== null;

  return (
    <div className="content-body" style={{ padding: '32px 48px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: 0, color: 'var(--text-primary)' }}>
          Earnings & Deliveries
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Welcome back, {user?.name}. Status: <span style={{ fontWeight: 700, color: isBusy ? '#EF4444' : 'var(--primary-green)' }}>{isBusy ? 'BUSY (on active delivery)' : 'FREE (awaiting job)'}</span>
        </p>
      </div>

      {/* Stats tiles */}
      <div className="delivery-grid">
        <div className="delivery-tile">
          <span className="delivery-tile-val">₹{totalLifetimeEarnings}</span>
          <span className="delivery-tile-lbl">Lifetime Earnings</span>
        </div>
        <div className="delivery-tile">
          <span className="delivery-tile-val">{totalTripsCompleted}</span>
          <span className="delivery-tile-lbl">Trips Completed</span>
        </div>
        <div className="delivery-tile">
          <span className="delivery-tile-val">₹{todayEarnings} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-light)' }}>({todayTrips} trips)</span></span>
          <span className="delivery-tile-lbl">Today's Earnings</span>
        </div>
        <div className="delivery-tile">
          <span className="delivery-tile-val">₹{averageEarnedPerDelivery}</span>
          <span className="delivery-tile-lbl">Avg / Delivery</span>
        </div>
      </div>

      {/* Active Delivery Card */}
      {isBusy && (
        <div className="review-card" style={{ border: '2px solid var(--warning-color)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={18} />
              <span>Current Delivery Task</span>
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--warning-color)' }}>
              {activeDelivery.status === 'assigned' ? 'Assigned (Pickup Awaiting)' : 'Picked Up (In Transit)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Store details (Pickup) */}
            <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-light)' }}>1. Pickup (Vendor)</h4>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeDelivery.order?.vendor?.storeName || 'Local Shop'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} />
                <span>{activeDelivery.order?.vendor?.storeAddress}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={11} />
                <span>{activeDelivery.order?.vendor?.storePhone || 'N/A'}</span>
              </div>
            </div>

            {/* Customer details (Dropoff) */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-light)' }}>2. Dropoff (Customer)</h4>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeDelivery.order?.customer?.name || 'Anonymous Customer'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={11} />
                <span>Client notes: {activeDelivery.order?.deliveryNotes || 'None'}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={11} />
                <span>Payout for delivery: ₹{activeDelivery.earnings}</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            {activeDelivery.status === 'assigned' ? (
              <button 
                className="btn-primary" 
                onClick={() => activeDelivery.order?._id && handlePickup(activeDelivery.order._id)}
                disabled={!activeDelivery.order?._id}
                style={{ backgroundColor: 'var(--primary-green)', padding: '10px 20px', fontSize: '13px', opacity: activeDelivery.order?._id ? 1 : 0.5, cursor: activeDelivery.order?._id ? 'pointer' : 'not-allowed' }}
              >
                Confirm Pickup from Store
              </button>
            ) : (
              <button 
                className="btn-primary" 
                onClick={() => activeDelivery.order?._id && handleDeliver(activeDelivery.order._id)}
                disabled={!activeDelivery.order?._id}
                style={{ backgroundColor: 'var(--primary-green)', padding: '10px 20px', fontSize: '13px', opacity: activeDelivery.order?._id ? 1 : 0.5, cursor: activeDelivery.order?._id ? 'pointer' : 'not-allowed' }}
              >
                Mark as Delivered (Complete Trip)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Jobs list (Only if not busy) */}
      {!isBusy && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>Available Jobs Near You</h2>
          {availableOrders.length === 0 ? (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              <Clock size={36} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No orders currently awaiting delivery boys. Check back in a few minutes!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(availableOrders || []).map((order) => {
                if (!order) return null;
                const itemsCount = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
                return (
                  <div 
                    key={order._id || Math.random().toString()} 
                    className="review-card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      padding: '16px 20px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {order.vendor?.storeName || 'Local Shop'} &rarr; Dropoff
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Pickup address: {order.vendor?.storeAddress}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                        <span>Items: {itemsCount} units</span>
                        <span>Notes: {order.deliveryNotes || 'None'}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--primary-green)', fontFamily: 'Outfit, sans-serif' }}>
                        Payout: ₹{order.deliveryFee}
                      </div>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleAcceptJob(order._id)}
                        style={{ padding: '6px 14px', fontSize: '11.5px', borderRadius: '6px', backgroundColor: 'var(--primary-green)' }}
                      >
                        Accept Job
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ten Most Recent Completed Deliveries list */}
      <div>
        <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>Trips Log (Last 10 Completed)</h2>
        {completedDeliveries.length === 0 ? (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
            <Truck size={36} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>You haven't completed any trips yet.</p>
          </div>
        ) : (
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Vendor (Store)</th>
                  <th>Date Completed</th>
                  <th style={{ textAlign: 'right' }}>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {(completedDeliveries || []).map((deliv) => {
                  if (!deliv) return null;
                  const compDate = deliv.createdAt 
                    ? new Date(deliv.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';
                  const displayId = deliv._id 
                    ? deliv._id.substring(deliv._id.length - 6).toUpperCase()
                    : 'N/A';
                  return (
                    <tr key={deliv._id || Math.random().toString()} className="inventory-row">
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        #{displayId}
                      </td>
                      <td>
                        {deliv.order?.vendor?.storeName || 'Local Shop'}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{compDate}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-green)' }}>
                        ₹{deliv.earnings}
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

export default DeliveryEarnings;
