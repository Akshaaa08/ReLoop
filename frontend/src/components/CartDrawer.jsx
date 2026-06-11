import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { X, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import QuantityControl from './QuantityControl';

const CartDrawer = ({ onProceed }) => {
  const { 
    cart, 
    cartOpen, 
    setCartOpen, 
    updateCartQuantity, 
    removeFromCart, 
    t 
  } = useApp();
  
  const { user, isAuthenticated } = useAuth();

  if (!cartOpen) return null;

  // Calculate stats
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.product.discountedPrice), 0);
  
  // Group cart items by vendor to compute subtotal per vendor
  const vendorSubtotals = {};
  cart.forEach(item => {
    const vendor = item.product.vendor;
    const vendorId = vendor?._id || vendor;
    if (vendorId) {
      const vendorIdStr = vendorId.toString();
      vendorSubtotals[vendorIdStr] = (vendorSubtotals[vendorIdStr] || 0) + (item.quantity * item.product.discountedPrice);
    }
  });

  const numVendors = Object.keys(vendorSubtotals).length;
  const vendorList = Object.values(vendorSubtotals);
  const hasMultipleVendors = numVendors > 1;

  // Expiry states helper
  const getExpiryState = (expiryDate) => {
    const diff = new Date(expiryDate) - new Date();
    if (diff <= 0) return { type: 'expired', label: 'Expired', className: 'danger-expiry' };
    const hours = diff / (1000 * 60 * 60);
    if (hours < 4) return { type: 'critical', label: 'Expires under 4h!', className: 'critical-expiry' };
    if (hours < 24) return { type: 'warning', label: 'Expires under 24h', className: 'warning-expiry' };
    return { type: 'fresh', label: 'Fresh Deal', className: 'fresh-expiry' };
  };

  const hasExpiredItems = cart.some(item => getExpiryState(item.product.expiryDate).type === 'expired');
  
  const isCustomer = isAuthenticated && user?.role === 'customer';
  
  // Validation checks:
  // 1. Each vendor group subtotal must be >= 49
  const allGroupsMeetMin = vendorList.every(sub => sub >= 49);

  // 2. Overall total check:
  // if 1 vendor: overall subtotal >= 49
  // if >= 2 vendors: overall subtotal >= 99
  const overallMinMet = numVendors === 1 ? subtotal >= 49 : subtotal >= 99;

  const isCartPriceValid = allGroupsMeetMin && overallMinMet;
  const canCheckout = isCustomer && isCartPriceValid && !hasExpiredItems && cart.length > 0;

  return (
    <div 
      className="cart-drawer-overlay" 
      onClick={() => setCartOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '450px',
          height: '100%',
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
              Your Cart
            </h3>
            <span 
              style={{
                backgroundColor: 'var(--primary-green)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          <button 
            onClick={() => setCartOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--bg-hover)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Multiple Vendors Warning */}
          {hasMultipleVendors && (
            <div 
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--warning-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                gap: '10px',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                lineHeight: '1.4'
              }}
            >
              <AlertTriangle size={18} style={{ color: 'var(--warning-color)', flexShrink: 0 }} />
              <div>
                <strong>Separate Orders Required:</strong> You have items from multiple vendors. Each vendor's items will be processed as a separate order.
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '15px', fontWeight: 500 }}>Your cart is empty.</p>
              <button 
                className="btn-primary" 
                onClick={() => setCartOpen(false)}
                style={{ marginTop: '12px', fontSize: '12px', padding: '8px 16px' }}
              >
                Browse Deals
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const expiry = getExpiryState(item.product.expiryDate);
              const lineTotal = item.quantity * item.product.discountedPrice;
              
              return (
                <div 
                  key={item.product._id} 
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative'
                  }}
                >
                  {/* Remove Button */}
                  <button 
                    onClick={() => removeFromCart(item.product._id)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-light)',
                      cursor: 'pointer',
                      fontSize: '18px'
                    }}
                  >
                    &times;
                  </button>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        border: '1px solid var(--border-color)'
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>
                        {item.product.vendor?.storeName || 'Local Vendor'}
                      </div>
                      <h4 style={{ margin: '2px 0 4px 0', fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product.name}
                      </h4>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-green)' }}>
                        ₹{item.product.discountedPrice}{' '}
                        <span style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--text-light)', fontWeight: 400 }}>
                          ₹{item.product.originalPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Warning Row */}
                  <div className={`expiry-badge ${expiry.className}`} style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    alignSelf: 'flex-start'
                  }}>
                    <AlertTriangle size={11} />
                    <span>{expiry.label}</span>
                  </div>

                  {/* Quantity Control Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Quantity:</span>
                    <QuantityControl
                      quantity={item.quantity}
                      maxStock={item.product.quantity}
                      unitPrice={item.product.discountedPrice}
                      onChange={(newQty) => updateCartQuantity(item.product._id, newQty)}
                      isCartItem={true}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Receipt Summary */}
        {cart.length > 0 && (
          <div 
            style={{
              padding: '20px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Subtotal Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>₹{subtotal}</span>
            </div>

            {/* Note Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-light)' }}>
              <Info size={12} />
              <span>Delivery fees will be calculated at checkout based on distance.</span>
            </div>

            {/* Checkout Validation Warnings */}
            {!isCustomer && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                Please login as a customer to proceed to checkout.
              </div>
            )}
            
            {isCustomer && !allGroupsMeetMin && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12.5px', fontWeight: 600, textAlign: 'center' }}>
                ⚠️ Each shop must have a minimum order value of ₹49.
              </div>
            )}
            
            {isCustomer && allGroupsMeetMin && !overallMinMet && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12.5px', fontWeight: 600, textAlign: 'center' }}>
                ⚠️ Total cart value must be above ₹99 when ordering from multiple shops.
              </div>
            )}

            {isCustomer && hasExpiredItems && (
              <div style={{ color: 'var(--danger-color)', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                Your cart contains expired items. Remove them to checkout.
              </div>
            )}

            {/* Proceed Button */}
            <button
              onClick={() => {
                setCartOpen(false);
                onProceed();
              }}
              disabled={!canCheckout}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '8px',
                backgroundColor: canCheckout ? 'var(--primary-green)' : 'var(--text-light)',
                color: 'white',
                border: 'none',
                cursor: canCheckout ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'var(--transition)'
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
