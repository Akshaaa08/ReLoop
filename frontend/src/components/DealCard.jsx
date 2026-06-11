import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, Clock, MapPin } from 'lucide-react';
import QuantityControl from './QuantityControl';

const DealCard = ({ product, onClick }) => {
  const { savedDeals, toggleBookmark, t, addToCart } = useApp();
  const [timeLeft, setTimeLeft] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [selectedQty, setSelectedQty] = useState(1);

  const isSaved = savedDeals.some(deal => deal._id === product._id);

  // Dynamic ticking countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(product.expiryDate) - new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
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
        setIsCritical(hours < 6); // Highlight red if less than 6 hours
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [product.expiryDate, t]);

  // Determine badge type based on category or expiry
  const getBadgeTextAndClass = () => {
    const difference = new Date(product.expiryDate) - new Date();
    const hours = difference / (1000 * 60 * 60);
    
    if (hours > 0 && hours < 4) {
      return { text: t('lastChance'), className: 'danger' };
    }
    if (hours >= 4 && hours < 24) {
      return { text: t('nearExpiry'), className: 'expiry' };
    }
    return { text: t('freshDeal'), className: 'fresh' };
  };

  const badge = getBadgeTextAndClass();

  // Resolve Image URL
  const imageUrl = product.image.startsWith('http')
    ? product.image
    : product.image; // /uploads/file is proxied or full route

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    toggleBookmark(product._id);
  };

  // Format distance
  const formatDistance = (dist) => {
    if (dist === undefined) return '300m';
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist}km`;
  };

  return (
    <div className="deal-card" onClick={onClick}>
      <div className="deal-image-container">
        {/* Deal Expiry Status Badge */}
        <span className={`deal-badge ${badge.className}`}>{badge.text}</span>
        
        {/* Bookmark Heart Button */}
        <button className="save-badge" onClick={handleBookmarkClick}>
          <Heart size={16} fill={isSaved ? 'var(--danger-color)' : 'none'} color={isSaved ? 'var(--danger-color)' : 'currentColor'} />
        </button>

        <img src={imageUrl} alt={product.name} className="deal-image" loading="lazy" />
      </div>

      <div className="deal-info">
        {/* Store Name */}
        <div className="deal-vendor">
          {product.vendor?.storeName || 'Local Shop'}
        </div>

        {/* Title */}
        <h4 className="deal-title">{product.name}</h4>

        {/* Quantity and Add to Cart Section */}
        {product.quantity > 0 && product.status !== 'sold' && timeLeft !== 'Expired' ? (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="deal-pricing" style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <span className="deal-price-discounted">₹{product.discountedPrice}</span>
                <span className="deal-price-original" style={{ fontSize: '11px' }}>₹{product.originalPrice}</span>
                <span className="deal-discount" style={{ fontSize: '10px', display: 'block', width: '100%', marginTop: '2px' }}>{product.discountPercentage || 0}% OFF</span>
              </div>
              <QuantityControl
                quantity={selectedQty}
                maxStock={product.quantity}
                unitPrice={undefined}
                onChange={(newQty) => setSelectedQty(newQty)}
                style={{ width: 'auto', padding: '4px 8px', gap: '6px' }}
              />
            </div>
            <button
              className="btn-primary card-add-btn"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                backgroundColor: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, selectedQty);
              }}
            >
              <span>{t('addToCart') || 'Add to Cart'}</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="deal-pricing" style={{ margin: 0 }}>
              <span className="deal-price-discounted">₹{product.discountedPrice}</span>
              <span className="deal-price-original">₹{product.originalPrice}</span>
              <span className="deal-discount">{product.discountPercentage || 0}% OFF</span>
            </div>
            <div style={{ 
              padding: '8px 12px', 
              textAlign: 'center', 
              backgroundColor: 'var(--bg-secondary)', 
              color: 'var(--text-light)', 
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {timeLeft === 'Expired' ? 'EXPIRED' : 'SOLD OUT'}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="deal-meta">
          {/* Distance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} color="var(--text-light)" />
            <span>{formatDistance(product.distance)} {t('distanceFromYou')}</span>
          </div>

          {/* Countdown Clock */}
          <div className="deal-countdown" style={{ color: isCritical ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
            <Clock size={12} />
            <span>{timeLeft}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealCard;
