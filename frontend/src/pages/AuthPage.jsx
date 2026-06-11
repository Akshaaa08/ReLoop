import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Sparkles, MessageSquare, MapPin } from 'lucide-react';

const AuthPage = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const { t, showToast, language } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('customer'); // 'customer', 'vendor', 'delivery'
  
  // Basic Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Vendor Specific States
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [acquiringLocation, setAcquiringLocation] = useState(false);

  // Auto locate vendor store
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser');
      return;
    }

    setAcquiringLocation(true);
    showToast('Acquiring store coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setAcquiringLocation(false);
        showToast('📍 Location secured successfully!');
      },
      (error) => {
        console.error(error);
        setAcquiringLocation(false);
        showToast('Failed to secure location. Will fallback to default New Delhi coordinates.');
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegister) {
      const userData = {
        name,
        email,
        password,
        role,
        ...(role === 'vendor' && {
          storeName,
          storeAddress,
          storePhone,
          coordinates
        })
      };

      const result = await register(userData);
      if (result.success) {
        showToast(t('authSuccess'));
        onSuccess(role === 'vendor' ? 'vendor-dashboard' : role === 'delivery' ? 'delivery-earnings' : 'home');
      } else {
        showToast(result.message);
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        showToast(t('authSuccess'));
        
        // Fetch role from result or check user profile state
        // To be safe, wait a brief moment for context to populate, then redirect
        setTimeout(() => {
          onSuccess('home'); // Redirect helper handles dashboard vs home based on active user context
        }, 100);
      } else {
        showToast(result.message);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2 style={{ fontSize: '24px' }}>
          {isRegister ? t('signUpTitle') : t('signInTitle')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {isRegister ? 'Register your account to start rescuing items' : 'Welcome back to ReLoop hyperlocal network'}
        </p>
      </div>

      {/* Role Selector Tabs (Only show during register) */}
      {isRegister && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="form-label">{t('chooseRole')}</label>
          <div className="role-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <button
              type="button"
              className={`role-btn ${role === 'customer' ? 'active' : ''}`}
              onClick={() => setRole('customer')}
            >
              {t('customer')}
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'vendor' ? 'active' : ''}`}
              onClick={() => setRole('vendor')}
            >
              {t('vendor')}
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'delivery' ? 'active' : ''}`}
              onClick={() => setRole('delivery')}
            >
              {language === 'en' ? 'Delivery' : 'डिलिवरी'}
            </button>
          </div>
        </div>
      )}

      {/* Form Submission */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Full Name */}
        {isRegister && (
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aakash Sharma"
              required
            />
          </div>
        )}

        {/* Email */}
        <div className="form-group">
          <label className="form-label">{t('emailAddress')}</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aakash@example.com"
            required
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label">{t('password')}</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {/* VENDOR Registration Fields */}
        {isRegister && role === 'vendor' && (
          <>
            <div className="form-group">
              <label className="form-label">{t('storeName')}</label>
              <input
                type="text"
                className="form-control"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="ABC Bakery"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('storeAddress')}</label>
              <input
                type="text"
                className="form-control"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Shop 12, Connaught Place, New Delhi"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('storePhone')}</label>
              <input
                type="text"
                className="form-control"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="919999999999 (with country code)"
                required
              />
            </div>

            {/* Geolocation Button */}
            <div className="form-group">
              <label className="form-label">Store Location Coordinates</label>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAutoLocate}
                disabled={acquiringLocation}
                style={{ width: '100%', fontSize: '13px', padding: '10px' }}
              >
                <MapPin size={14} />
                <span>{coordinates ? '📍 Coordinates Secured' : 'Auto-locate Store Location'}</span>
              </button>
            </div>
          </>
        )}

        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
          <span>{isRegister ? t('register') : t('login')}</span>
        </button>
      </form>

      {/* Switch Toggles */}
      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <span>{isRegister ? t('alreadyHaveAccount') : t('dontHaveAccount')} </span>
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--primary-green)',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isRegister ? t('login') : t('register')}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
