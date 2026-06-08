import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Search, Sun, Moon, Globe, LogOut, User as UserIcon, MapPin, Leaf, Heart, Users, ShoppingBag } from 'lucide-react';

const Navbar = ({ onNavClick }) => {
  const { theme, toggleTheme, language, toggleLanguage, searchQuery, setSearchQuery, locationName, locateUser, t } = useApp();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Brand Logo & Location Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div 
          onClick={() => onNavClick('home')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div 
            className="logo-icon" 
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px',
              background: 'var(--pastel-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(var(--shadow-color-rgb), 0.3)',
              color: '#FFFFFF'
            }}
          >
            <Leaf size={18} fill="#FFFFFF" />
          </div>
          <span 
            className="logo-text" 
            style={{ 
              fontSize: '22px', 
              fontWeight: 900, 
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.03em'
            }}
          >
            ReLoop
          </span>
        </div>

        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--primary-green)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onClick={locateUser}
          title="Auto-detect your location"
        >
          <MapPin size={13} />
          <span>{locationName}</span>
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '12px' }}>
          <button 
            onClick={() => {
              setSearchQuery('');
              onNavClick('home');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'var(--transition)'
            }}
            className="nav-btn-link"
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {t('dealsFeed')}
          </button>
          <button 
            onClick={() => onNavClick('map')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'var(--transition)'
            }}
            className="nav-btn-link"
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {t('clearanceMap')}
          </button>
          <button 
            onClick={() => setIsAboutOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'var(--transition)'
            }}
            className="nav-btn-link"
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {t('aboutUs')}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar" style={{ width: '380px' }}>
        <Search className="nav-icon" size={16} />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      {/* Action Toggles */}
      <div className="nav-actions">
        {/* For Vendors Action Link (Only show if not logged in as vendor) */}
        {(!isAuthenticated || user?.role !== 'vendor') && (
          <button 
            className="btn-toggle" 
            onClick={() => {
              if (isAuthenticated && user?.role === 'customer') {
                // If customer wants to see vendor, log them out or show message.
                // For demo, just redirect to auth page to log in as vendor.
                logout();
              }
              onNavClick('auth');
            }}
            style={{ fontWeight: 600 }}
          >
            {t('vendor')}
          </button>
        )}

        {/* Language Translate Toggle */}
        <button className="btn-toggle" onClick={toggleLanguage}>
          <Globe size={15} />
          <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Theme Toggle */}
        <button className="btn-toggle" onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Quick access Bookmarks/Saved Deals icon */}
        {isAuthenticated && user?.role === 'customer' && (
          <button className="btn-toggle" onClick={() => onNavClick('saved')} style={{ padding: '8px' }}>
            <Heart size={15} fill="var(--danger-color)" color="var(--danger-color)" />
          </button>
        )}

        {/* Profile Trigger */}
        {isAuthenticated ? (
          <div style={{ position: 'relative' }}>
            <div className="profile-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
                alt="avatar"
                className="profile-avatar"
              />
              <span className="profile-name">{user.name}</span>
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-lg)',
                  width: '180px',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px 0',
                }}
              >
                <div
                  style={{
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-light)',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '4px',
                  }}
                >
                  {user.role === 'vendor' ? t('vendor') : t('customer')}
                </div>
                
                {user.role === 'vendor' && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onNavClick('vendor-dashboard');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                  >
                    <UserIcon size={14} />
                    <span>{t('dashboard')}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                    onNavClick('home');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    color: 'var(--danger-color)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    borderTop: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = 'var(--bg-secondary)')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="btn-primary" 
            onClick={() => onNavClick('auth')} 
            style={{ 
              padding: '8px 18px', 
              fontSize: '13px', 
              borderRadius: '18px', 
              background: 'var(--pastel-gradient)',
              boxShadow: '0 4px 12px rgba(var(--shadow-color-rgb), 0.3)'
            }}
          >
            {t('login')}
          </button>
        )}
      </div>

      {/* Impressive About Us Modal Overlay */}
      {isAboutOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 64, 12, 0.45)', // Matching light theme green
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease-out forwards'
          }}
          onClick={() => setIsAboutOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '620px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              position: 'relative',
              animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative stripe */}
            <div 
              style={{
                height: '6px',
                background: 'linear-gradient(90deg, var(--primary-green), var(--accent-green))'
              }}
            />
            
            {/* Close X */}
            <button
              onClick={() => setIsAboutOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '24px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                transition: 'background-color 0.2s',
                zIndex: 10
              }}
            >
              &times;
            </button>

            <div style={{ padding: '40px 32px 32px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-green)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(10,64,12,0.2)'
                }}>
                  <Leaf size={18} />
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                  {t('aboutTitle')}
                </h2>
              </div>

              <p style={{ 
                fontSize: '14.5px', 
                lineHeight: 1.6, 
                color: 'var(--text-secondary)',
                marginBottom: '28px'
              }}>
                {t('aboutText')}
              </p>

              <h3 style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                color: 'var(--text-light)',
                marginBottom: '16px',
                fontFamily: 'Outfit, sans-serif'
              }}>
                {t('puneImpact')}
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '28px'
              }}>
                {/* KPI Card 1 */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>12,450+</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('dealsRescuedText')}</div>
                  </div>
                </div>

                {/* KPI Card 2 */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    <Leaf size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>4.2 Tons</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('wasteDivertedText')}</div>
                  </div>
                </div>

                {/* KPI Card 3 */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ₹
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>3.8 L</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('revenueRecoveredText')}</div>
                  </div>
                </div>

                {/* KPI Card 4 */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>1,800+</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('activeNeighborsText')}</div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  style={{
                    padding: '10px 28px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: 'var(--primary-green)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(10,64,12,0.2)',
                    transition: 'transform 0.2s'
                  }}
                  className="banner-btn"
                >
                  {t('exploreDealsCta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
