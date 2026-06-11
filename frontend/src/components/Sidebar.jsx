import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Compass, MapPin, Heart, PlusCircle, LayoutDashboard, ShoppingBag, LogOut, Leaf, User } from 'lucide-react';

const Sidebar = ({ activePage, onNavClick }) => {
  const { t } = useApp();
  const { user, isAuthenticated, logout } = useAuth();
  const [hasConfirmedOrders, setHasConfirmedOrders] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'vendor') {
      const checkOrders = async () => {
        try {
          const res = await fetch('/api/orders/vendor', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            // Show red dot if there are confirmed orders waiting for driver, or pending confirmation
            const waiting = data.some(o => o.status === 'confirmed');
            setHasConfirmedOrders(waiting);
          }
        } catch (error) {
          console.error(error);
        }
      };

      checkOrders();
      const interval = setInterval(checkOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    onNavClick('home');
  };

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Logo Section */}
        <div className="logo-section" onClick={() => onNavClick('home')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <Leaf size={18} />
          </div>
          <div>
            <span className="logo-text">{t('brandName')}</span>
            <div style={{ fontSize: '9px', color: 'var(--text-light)', fontWeight: 500, marginTop: '2px' }}>
              {t('tagline')}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <ul className="nav-links">
          {/* VENDOR Navigation */}
          {isAuthenticated && user?.role === 'vendor' ? (
            <>
              <li>
                <div
                  className={`nav-item ${activePage === 'vendor-dashboard' ? 'active' : ''}`}
                  onClick={() => onNavClick('vendor-dashboard')}
                >
                  <LayoutDashboard className="nav-icon" />
                  <span>{t('dashboard')}</span>
                </div>
              </li>
              <li>
                <div
                  className={`nav-item ${activePage === 'vendor-products' ? 'active' : ''}`}
                  onClick={() => onNavClick('vendor-products')}
                >
                  <ShoppingBag className="nav-icon" />
                  <span>{t('myProducts')}</span>
                </div>
              </li>
              <li>
                <div
                  className={`nav-item ${activePage === 'add-product' ? 'active' : ''}`}
                  onClick={() => onNavClick('add-product')}
                >
                  <PlusCircle className="nav-icon" />
                  <span>{t('addProduct')}</span>
                </div>
              </li>
              <li>
                <div
                  className={`nav-item ${activePage === 'vendor-orders' ? 'active' : ''}`}
                  onClick={() => onNavClick('vendor-orders')}
                  style={{ position: 'relative' }}
                >
                  <ShoppingBag className="nav-icon" />
                  <span>Orders Inbox</span>
                  {hasConfirmedOrders && (
                    <span 
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '8px',
                        height: '8px',
                        backgroundColor: 'var(--danger-color)',
                        borderRadius: '50%',
                        display: 'block'
                      }}
                    />
                  )}
                </div>
              </li>
            </>
          ) : (
            // CUSTOMER or ANONYMOUS Navigation
            <>
              <li>
                <div
                  className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
                  onClick={() => onNavClick('home')}
                >
                  <Compass className="nav-icon" />
                  <span>{t('home')}</span>
                </div>
              </li>
              <li>
                <div
                  className={`nav-item ${activePage === 'map' ? 'active' : ''}`}
                  onClick={() => onNavClick('map')}
                >
                  <MapPin className="nav-icon" />
                  <span>{t('map')}</span>
                </div>
              </li>
              {isAuthenticated && user?.role === 'customer' && (
                <li>
                  <div
                    className={`nav-item ${activePage === 'saved' ? 'active' : ''}`}
                    onClick={() => onNavClick('saved')}
                  >
                    <Heart className="nav-icon" />
                    <span>{t('savedDeals')}</span>
                  </div>
                </li>
              )}
            </>
          )}

          {/* Fallback login link if not authenticated */}
          {!isAuthenticated && (
            <li>
              <div
                className={`nav-item ${activePage === 'auth' ? 'active' : ''}`}
                onClick={() => onNavClick('auth')}
              >
                <User className="nav-icon" />
                <span>{t('login')} / {t('register')}</span>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* User Session Info Bottom Panel */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {isAuthenticated ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
                alt="user avatar"
                style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 500, textTransform: 'uppercase' }}>
                  {user.role === 'vendor' ? t('vendor') : t('customer')}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
            >
              <LogOut size={13} />
              <span>{t('logout')}</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: '4px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500, marginBottom: '8px' }}>
              Discover neighborhood deals!
            </div>
            <button
              onClick={() => onNavClick('auth')}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--light-green)',
                color: 'var(--primary-green)',
                border: '1px solid var(--primary-green)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {t('login')}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
