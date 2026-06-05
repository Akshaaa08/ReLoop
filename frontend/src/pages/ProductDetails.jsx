import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { translateDynamicContent } from '../utils/translate';
import MapView from '../components/MapView';
import { Clock, MapPin, Phone, MessageCircle, Heart, ArrowLeft } from 'lucide-react';

const ProductDetails = ({ productId, onBack }) => {
  const { savedDeals, toggleBookmark, language, t } = useApp();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Translated details state
  const [displayName, setDisplayName] = useState('');
  const [displayDesc, setDisplayDesc] = useState('');
  const [displayCat, setDisplayCat] = useState('');

  // Countdown timer states
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  // Map toggle
  const [showMap, setShowMap] = useState(false);

  // Fetch product details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
          
          // Set initial default names
          setDisplayName(data.name);
          setDisplayDesc(data.description);
          setDisplayCat(data.category);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (productId) {
      fetchDetails();
    }
  }, [productId]);

  // Handle language translation trigger
  useEffect(() => {
    if (!product) return;

    const translate = async () => {
      if (language === 'hi') {
        const translated = await translateDynamicContent(product.name, product.description, product.category, 'hi');
        setDisplayName(translated.name);
        setDisplayDesc(translated.description);
        setDisplayCat(translated.category);
      } else {
        setDisplayName(product.name);
        setDisplayDesc(product.description);
        setDisplayCat(product.category);
      }
    };

    translate();
  }, [language, product]);

  // Ticking countdown timer
  useEffect(() => {
    if (!product) return;

    const calculateTimeLeft = () => {
      const difference = new Date(product.expiryDate) - new Date();
      if (difference <= 0) {
        setTimeLeft(t('expired'));
        setIsCritical(true);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (hours === 0) {
        setTimeLeft(`${minutes}${t('minutesLeft')}`);
        setIsCritical(true);
      } else {
        setTimeLeft(`${hours}${t('hoursLeft')} ${minutes}${t('minutesLeft')}`);
        setIsCritical(hours < 6);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [product, t]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>{t('loadingDealDetails')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>{t('dealNotFound')}</h2>
        <button className="btn-primary" onClick={onBack} style={{ marginTop: '20px' }}>{t('goBack')}</button>
      </div>
    );
  }

  const isSaved = savedDeals.some(deal => deal._id === product._id);
  const savingsAmount = product.originalPrice - product.discountedPrice;
  const savingsPct = product.discountPercentage;
  
  // Format WhatsApp Link
  const phoneCleaned = product.vendor?.storePhone ? product.vendor.storePhone.replace(/\D/g, '') : '919999999999';
  const waMessage = `Hi there! I am interested in reserving the "${product.name}" deal (${savingsPct}% OFF) listed on ReLoop. Is it still available for pick up?`;
  const whatsappUrl = `https://wa.me/${phoneCleaned}?text=${encodeURIComponent(waMessage)}`;

  // Format distance
  const formatDistance = (dist) => {
    if (dist === undefined) return '300m';
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist}km`;
  };

  return (
    <div className="content-body">
      {/* Back navigation */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        <ArrowLeft size={16} />
        <span>{t('backToDeals')}</span>
      </button>

      {/* Main product detail grid */}
      <div className="product-detail-grid">
        {/* Left Col: Image Display */}
        <div className="product-gallery">
          <img src={product.image} alt={displayName} className="product-main-img" />
        </div>

        {/* Right Col: Details */}
        <div className="product-meta-panel">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {displayCat}
              </span>
              <button
                onClick={() => toggleBookmark(product._id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isSaved ? 'var(--danger-color)' : 'var(--text-secondary)'
                }}
              >
                <Heart size={20} fill={isSaved ? 'var(--danger-color)' : 'none'} />
              </button>
            </div>
            
            <h1 style={{ fontSize: '32px', marginTop: '6px', marginBottom: '12px', lineHeight: 1.2 }}>
              {displayName}
            </h1>

            {/* Pricing Panel */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary-green)' }}>
                ₹{product.discountedPrice}
              </span>
              <span style={{ fontSize: '20px', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                ₹{product.originalPrice}
              </span>
              <span className="deal-badge danger" style={{ position: 'static' }}>
                {savingsPct}% OFF
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--success-color)', fontWeight: 600 }}>
              {t('youSave')} ₹{savingsAmount} ({savingsPct}%)
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

          {/* Deal Meta Details Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                {t('expiresIn')}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: isCritical ? 'var(--danger-color)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Clock size={14} />
                <span>{timeLeft}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                {t('quantityLeft')}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {product.quantity} pcs
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                {t('distance')}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <MapPin size={14} />
                <span>{formatDistance(product.distance)}</span>
              </div>
            </div>
          </div>

          {/* About deal */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>{t('aboutDeal')}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {displayDesc}
            </p>
          </div>

          {/* Vendor Details */}
          <div className="vendor-card">
            <img
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(product.vendor?.storeName || 'Shop')}`}
              alt="vendor avatar"
              className="vendor-card-avatar"
            />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {product.vendor?.storeName || 'Local Store'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <MapPin size={12} /> {product.vendor?.storeAddress || 'Connaught Place, New Delhi'}
              </p>
            </div>
          </div>

          {/* Action Preorders buttons */}
          <div className="action-buttons">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
              <MessageCircle size={18} />
              <span>{t('contactVendor')}</span>
            </a>
            
            <button className="btn-secondary" onClick={() => setShowMap(!showMap)}>
              <MapPin size={18} />
              <span>{showMap ? t('hideMap') : t('viewOnMap')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map view toggle container */}
      {showMap && product.coordinates && (
        <div style={{ marginTop: '40px', height: '350px' }}>
          <h3 style={{ marginBottom: '12px' }}>{t('storeLocation')}</h3>
          <MapView
            products={[product]}
            userLocation={product.coordinates}
            onProductClick={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
