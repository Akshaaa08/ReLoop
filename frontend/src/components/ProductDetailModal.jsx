import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, MapPin, MessageCircle, Heart, X, Navigation } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translateDynamicContent } from '../utils/translate';

// Fix for default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Recenter Component
const ChangeMapView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], 15);
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }
  }, [center, map]);
  return null;
};

const ProductDetailModal = ({ product, onClose }) => {
  const { savedDeals, toggleBookmark, language, t, showToast } = useApp();
  
  // Translated details state
  const [displayName, setDisplayName] = useState(product?.name || '');
  const [displayDesc, setDisplayDesc] = useState(product?.description || '');
  const [displayCat, setDisplayCat] = useState(product?.category || '');

  // Countdown timer states
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  // Handle language translation trigger dynamically
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

  if (!product) return null;

  const isSaved = savedDeals.some(deal => deal._id === product._id);
  const savingsAmount = product.originalPrice - product.discountedPrice;
  const savingsPct = product.discountPercentage;
  
  // Format WhatsApp Link
  const phoneCleaned = product.vendor?.storePhone ? product.vendor.storePhone.replace(/\D/g, '') : '919999999999';
  const waMessage = `Hi there! I am interested in reserving the "${product.name}" deal (${savingsPct}% OFF) listed on ReLoop. Is it still available for pick up?`;
  const whatsappUrl = `https://wa.me/${phoneCleaned}?text=${encodeURIComponent(waMessage)}`;

  // Google Maps navigation link
  const mapCoords = product.coordinates || product.vendor?.coordinates;
  const navigationUrl = mapCoords 
    ? `https://www.google.com/maps/dir/?api=1&destination=${mapCoords.lat},${mapCoords.lng}`
    : '#';

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    toggleBookmark(product._id);
  };

  const createCustomIcon = (expiryDate) => {
    const difference = new Date(expiryDate) - new Date();
    const hours = difference / (1000 * 60 * 60);

    let color = '#2D8A4E';
    if (hours > 0 && hours < 4) {
      color = '#D94625';
    } else if (hours >= 4 && hours < 24) {
      color = '#E28743';
    }

    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        ">
          <div style="
            background-color: white;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      className: 'custom-map-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  };

  return (
    <div 
      className="map-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="map-modal-content slide-up-fade"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: '960px',
          maxHeight: '620px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Product Info */}
        <div 
          style={{ 
            padding: '28px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px',
            borderRight: '1px solid var(--border-color)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {displayCat}
            </span>
            <button
              onClick={handleBookmarkClick}
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

          {/* Product image & title */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <img 
              src={product.image} 
              alt={displayName} 
              style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {displayName}
              </h2>
              
              {/* Pricing Panel */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary-green)' }}>
                  ₹{product.discountedPrice}
                </span>
                <span style={{ fontSize: '16px', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                  ₹{product.originalPrice}
                </span>
                <span className="deal-badge danger" style={{ position: 'static' }}>
                  {savingsPct}% OFF
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--success-color)', fontWeight: 600 }}>
                {t('youSave')} ₹{savingsAmount} ({savingsPct}%)
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* Meta Information Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                {t('expiresIn')}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: isCritical ? 'var(--danger-color)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Clock size={13} />
                <span>{timeLeft}</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                {t('quantityLeft')}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {product.quantity} pcs
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>{t('aboutDeal')}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {displayDesc}
            </p>
          </div>

          {/* Vendor profile */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <img
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(product.vendor?.storeName || 'Shop')}`}
              alt="vendor avatar"
              style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
            />
            <div style={{ minWidth: 0 }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {product.vendor?.storeName || 'Local Store'}
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MapPin size={11} /> {product.vendor?.storeAddress || 'Pune'}
              </p>
            </div>
          </div>

          {/* Contact Action Preorders button */}
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '14px',
              backgroundColor: 'var(--primary-green)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              marginTop: 'auto'
            }}
          >
            <MessageCircle size={18} />
            <span>{t('contactVendor')}</span>
          </a>
        </div>

        {/* Right Side: Map and Navigate Button */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          {/* Close Button overlay */}
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 1001,
              background: 'white',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              transition: 'background-color 0.2s'
            }}
            className="close-btn"
          >
            <X size={16} />
          </button>

          {/* Leaflet Map */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {mapCoords && (
              <MapContainer
                center={[mapCoords.lat, mapCoords.lng]}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <ChangeMapView center={mapCoords} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={[mapCoords.lat, mapCoords.lng]} icon={createCustomIcon(product.expiryDate)} />
              </MapContainer>
            )}
          </div>

          {/* Navigate Action Button */}
          <a
            href={navigationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              padding: '16px',
              backgroundColor: '#1E90FF', // Navigation Blue
              color: 'white',
              fontWeight: 700,
              fontSize: '15px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <Navigation size={18} fill="white" />
            <span>Navigate to Shop</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
