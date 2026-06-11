import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, Truck, Info, FileText, CheckCircle2, CreditCard, X } from 'lucide-react';

const CheckoutReview = ({ onOrderPlaced }) => {
  const { cart, userLocation, clearCart, showToast } = useApp();
  const { user, token } = useAuth();
  
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.storeAddress || '102 Green Meadows, Bibwewadi, Pune');
  const [isPlacing, setIsPlacing] = useState(false);

  // States for payment simulator
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [activeAmount, setActiveAmount] = useState(0);

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Haversine formula to compute exact distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0.5; // default fallback
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Group cart items by vendor
  const vendorGroups = {};
  cart.forEach(item => {
    const vendor = item.product.vendor;
    const vendorId = vendor?._id || vendor;
    if (!vendorId) return;

    if (!vendorGroups[vendorId]) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        vendor.coordinates?.lat || 18.4850,
        vendor.coordinates?.lng || 73.8630
      );

      // Determine delivery fee tier
      let deliveryFeeTotal = 0;
      let deliveryFeeCustomer = 0;
      let deliveryFeeVendor = 0;
      let blockingMsg = '';

      if (distance < 1) {
        deliveryFeeTotal = 14;
        deliveryFeeCustomer = 7;
        deliveryFeeVendor = 7;
      } else if (distance <= 2) {
        deliveryFeeTotal = 18;
        deliveryFeeCustomer = 9;
        deliveryFeeVendor = 9;
      } else if (distance <= 3) {
        deliveryFeeTotal = 24;
        deliveryFeeCustomer = 12;
        deliveryFeeVendor = 12;
      } else {
        blockingMsg = `This vendor (${vendor.storeName || 'Local Store'}) is ${distance} km away. We only support deliveries within 3 km.`;
      }

      vendorGroups[vendorId] = {
        vendor,
        distance,
        deliveryFeeTotal,
        deliveryFeeCustomer,
        deliveryFeeVendor,
        blockingMsg,
        items: [],
        subtotal: 0
      };
    }

    vendorGroups[vendorId].items.push(item);
    vendorGroups[vendorId].subtotal += item.quantity * item.product.discountedPrice;
  });

  const vendorList = Object.values(vendorGroups);
  
  // Calculate Totals
  const productsSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.product.discountedPrice), 0);
  const totalDeliveryFeeCustomer = vendorList.reduce((sum, group) => sum + (group.blockingMsg ? 0 : group.deliveryFeeCustomer), 0);
  const totalDeliveryFeeTotal = vendorList.reduce((sum, group) => sum + (group.blockingMsg ? 0 : group.deliveryFeeTotal), 0);
  const grandTotal = productsSubtotal + totalDeliveryFeeCustomer;

  const hasBlockingDistance = vendorList.some(group => group.blockingMsg !== '');
  const hasExpired = cart.some(item => {
    const diff = new Date(item.product.expiryDate) - new Date();
    return diff <= 0;
  });

  const allGroupsMeetMin = vendorList.every(group => group.subtotal >= 49);
  const overallMinMet = vendorList.length === 1 ? productsSubtotal >= 49 : productsSubtotal >= 99;
  const isCartPriceValid = allGroupsMeetMin && overallMinMet;

  const canPlaceOrder = 
    cart.length > 0 && 
    !hasBlockingDistance && 
    !hasExpired && 
    isCartPriceValid && 
    deliveryAddress.trim() !== '' &&
    !isPlacing;

  // Triggers order generation and opens payment flow
  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) return;
    setIsPlacing(true);

    try {
      // Create backend orders payload in one request
      const payload = {
        groups: vendorList.map(group => ({
          vendor: group.vendor._id,
          items: group.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity
          }))
        })),
        deliveryAddress,
        deliveryCoordinates: userLocation,
        deliveryNotes
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const sessionData = await res.json();
        
        if (sessionData.isSimulated) {
          // Open customized payment simulation sandbox
          setActiveSessionId(sessionData.paymentSessionId);
          setActiveAmount(sessionData.amount);
          setShowSimulator(true);
        } else {
          // Open real Razorpay popup checkout
          openRealRazorpayCheckout(sessionData);
        }
      } else {
        const errorData = await res.json();
        showToast(errorData.message || "Failed to generate checkout session.");
        setIsPlacing(false);
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Failed to place order.");
      setIsPlacing(false);
    }
  };

  // Triggers verification for simulated sandbox
  const handleSimulatedPaymentSuccess = async () => {
    try {
      const res = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentSessionId: activeSessionId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: 'simulated_payment_signature_success'
        })
      });

      if (res.ok) {
        setShowSimulator(false);
        clearCart();
        showToast("✨ Payment successful! Orders confirmed.");
        onOrderPlaced();
      } else {
        const err = await res.json();
        showToast(err.message || "Simulated payment verification failed.");
        setIsPlacing(false);
      }
    } catch (error) {
      console.error(error);
      showToast("Network error verifying payment.");
      setIsPlacing(false);
    }
  };

  const handleSimulatedPaymentCancel = () => {
    setShowSimulator(false);
    showToast("⚠️ Payment session cancelled. Cart items retained.");
    setIsPlacing(false);
  };

  // Open Real Razorpay Checkout Window
  const openRealRazorpayCheckout = (sessionData) => {
    const options = {
      key: sessionData.keyId,
      amount: Math.round(sessionData.amount * 100),
      currency: 'INR',
      name: 'ReLoop Network',
      description: 'Rescue Surplus Items Checkout',
      order_id: sessionData.paymentSessionId,
      handler: async function (response) {
        try {
          const verifyRes = await fetch('/api/orders/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              paymentSessionId: sessionData.paymentSessionId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })
          });

          if (verifyRes.ok) {
            clearCart();
            showToast("✨ Order successfully placed!");
            onOrderPlaced();
          } else {
            const err = await verifyRes.json();
            showToast(err.message || "Payment verification failed.");
            setIsPlacing(false);
          }
        } catch (error) {
          console.error(error);
          showToast("Failed to verify transaction signature.");
          setIsPlacing(false);
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || ''
      },
      theme: {
        color: '#10B981'
      },
      modal: {
        ondismiss: function () {
          showToast("⚠️ Payment window closed. Cart retained.");
          setIsPlacing(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="content-body" style={{ padding: '32px 48px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'Outfit, sans-serif', margin: 0, color: 'var(--text-primary)' }}>
          Order Review
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Please review your items, vendor distances, delivery fees, and add instructions before placing your order.
        </p>
      </div>

      <div className="checkout-grid">
        {/* Left Col: Vendor Groups */}
        <div>
          {vendorList.map((group) => (
            <div 
              key={group.vendor._id} 
              className="review-card" 
              style={{
                border: group.blockingMsg ? '2px solid var(--danger-color)' : '1px solid var(--border-color)',
                position: 'relative',
                marginBottom: '20px'
              }}
            >
              {/* Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  borderBottom: '1px solid var(--border-color)', 
                  paddingBottom: '14px', 
                  marginBottom: '14px' 
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--primary-green)', fontFamily: 'Outfit, sans-serif' }}>
                    {group.vendor.storeName || 'Local Shop'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    <MapPin size={12} />
                    <span>{group.vendor.storeAddress}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Distance: {group.distance} km
                  </div>
                  {!group.blockingMsg && (
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', justifyContent: 'flex-end' }}>
                      <Truck size={12} />
                      <span>Delivery (You): ₹{group.deliveryFeeCustomer} <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>(Split 50%)</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Distant vendor blocked */}
              {group.blockingMsg && (
                <div 
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: 'var(--danger-color)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    marginBottom: '16px',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  ⚠️ Checkout Blocked: {group.blockingMsg}
                </div>
              )}

              {/* Group Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.items.map((item) => {
                  const savings = (item.product.originalPrice - item.product.discountedPrice) * item.quantity;
                  const discountPct = item.product.discountPercentage || Math.round(((item.product.originalPrice - item.product.discountedPrice) / item.product.originalPrice) * 100);
                  return (
                    <div key={item.product._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.product.name}</h4>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span>₹{item.product.discountedPrice} &times; {item.quantity} units</span>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-light)', marginLeft: '8px' }}>₹{item.product.originalPrice}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{item.quantity * item.product.discountedPrice}
                        </div>
                        {savings > 0 && (
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary-green)', marginTop: '2px' }}>
                            Saved ₹{savings} ({discountPct}% OFF)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed Delivery Fare Calculation Block */}
              {!group.blockingMsg && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px dashed var(--border-color)',
                  fontSize: '12.5px'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                    <Truck size={14} color="var(--primary-green)" />
                    <span>Delivery Fare Calculation ({group.distance} km)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Total Fare Tier:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{group.deliveryFeeTotal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Customer Pays (50% Split):</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-green)' }}>₹{group.deliveryFeeCustomer}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Vendor Pays (50% Split):</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{group.deliveryFeeVendor}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Col: Price summary */}
        <div>
          <div className="review-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
              Receipt Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="receipt-row">
                <span>Items Subtotal</span>
                <span>₹{productsSubtotal}</span>
              </div>

              {vendorList.map(group => (
                <div key={group.vendor._id} className="receipt-row" style={{ fontSize: '13px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                  <span>{group.vendor.storeName || 'Local Shop'} ({group.distance} km)</span>
                  <span>{group.blockingMsg ? 'Blocked' : `+ ₹${group.deliveryFeeCustomer}`}</span>
                </div>
              ))}

              <div className="receipt-row" style={{ marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                <span>Delivery (Your Share)</span>
                <span>₹{totalDeliveryFeeCustomer}</span>
              </div>

              <div className="receipt-row grand-total">
                <span>Grand Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {/* Delivery address input */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} />
                <span>Delivery Address</span>
              </label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '13px' }}
                placeholder="E.g., Flat 12, building A, Gangadham, Pune"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>

            {/* Delivery Instructions notes */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={14} />
                <span>Delivery Notes</span>
              </label>
              <textarea
                className="form-control"
                style={{ resize: 'none', height: '60px', fontSize: '13px' }}
                placeholder="E.g., Ring bell twice, drop off at guard, near landmark etc."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>

            {/* Block Warnings */}
            {!allGroupsMeetMin && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12.5px', fontWeight: 600, marginTop: '16px', textAlign: 'center' }}>
                ⚠️ Each shop must have a minimum order value of ₹49.
              </div>
            )}

            {allGroupsMeetMin && !overallMinMet && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12.5px', fontWeight: 600, marginTop: '16px', textAlign: 'center' }}>
                ⚠️ Total cart value must be above ₹99 when ordering from multiple shops.
              </div>
            )}
            
            {hasBlockingDistance && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12px', fontWeight: 600, marginTop: '16px', textAlign: 'center' }}>
                ⚠️ Distant vendor present. Remove items outside 3 km to checkout.
              </div>
            )}

            {hasExpired && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12px', fontWeight: 600, marginTop: '16px', textAlign: 'center' }}>
                ⚠️ Expired items detected. Remove them to place order.
              </div>
            )}

            {/* Submit Order */}
            <button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              className="btn-primary"
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: '8px',
                backgroundColor: canPlaceOrder ? 'var(--primary-green)' : 'var(--text-light)',
                color: 'white',
                border: 'none',
                cursor: canPlaceOrder ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              <CheckCircle2 size={18} />
              <span>{isPlacing ? 'Initializing Checkout...' : 'Place Order'}</span>
            </button>
            <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-light)', marginTop: '8px' }}>
              *Secure Virtual Checkout Integration
            </div>
          </div>
        </div>
      </div>

      {/* SECURE SIMULATED PAYMENT OVERLAY / SANDBOX MODAL */}
      {showSimulator && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 15000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '450px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              fontFamily: 'sans-serif'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(90deg, #1f2937, #111827)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#10B981" />
                <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em' }}>RAZORPAY CHECKOUT SANDBOX</span>
              </div>
              <button 
                onClick={handleSimulatedPaymentCancel}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', fontWeight: 600 }}>Amount to pay</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary-green)', margin: '4px 0', fontFamily: 'Outfit, sans-serif' }}>₹{activeAmount}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Session Ref: {activeSessionId}</div>
              </div>

              {/* Simulation Disclaimer Alert */}
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--warning-color)',
                lineHeight: 1.5
              }}>
                ℹ️ <strong>Sandbox Mode:</strong> Razorpay private API credentials are not set in the environment. This interactive window simulates a secure transaction using token signatures.
              </div>

              {/* Simulated Card Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CARD NUMBER</label>
                  <input 
                    type="text" 
                    readOnly 
                    className="form-control" 
                    value="4111 2222 3333 4444" 
                    style={{ fontSize: '13px', backgroundColor: 'var(--bg-secondary)', letterSpacing: '0.05em' }} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>EXPIRY</label>
                    <input 
                      type="text" 
                      readOnly 
                      className="form-control" 
                      value="12 / 29" 
                      style={{ fontSize: '13px', backgroundColor: 'var(--bg-secondary)' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CVV</label>
                    <input 
                      type="password" 
                      readOnly 
                      className="form-control" 
                      value="•••" 
                      style={{ fontSize: '13px', backgroundColor: 'var(--bg-secondary)' }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <button 
                className="btn-secondary" 
                onClick={handleSimulatedPaymentCancel}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSimulatedPaymentSuccess}
                style={{ 
                  fontSize: '13px', 
                  padding: '8px 20px', 
                  backgroundColor: 'var(--primary-green)',
                  borderColor: 'var(--primary-green)',
                  color: 'white',
                  fontWeight: 700
                }}
              >
                Simulate Success
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutReview;
