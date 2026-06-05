import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import DealCard from '../components/DealCard';
import MapView from '../components/MapView';
import { ShoppingBag } from 'lucide-react';

const ClearanceBanners = ({ onSelectCategory }) => {
  const { t } = useApp();
  const banners = [
    {
      id: 1,
      title: t('banner1Title'),
      tagline: "FLAT 70% OFF",
      description: t('banner1Desc'),
      cta: t('grabCroissants'),
      category: "Bakery",
      gradient: "linear-gradient(135deg, #A44A3F, #D94625)",
      image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80"
    },
    {
      id: 2,
      title: t('banner2Title'),
      tagline: "MIN. 40% OFF",
      description: t('banner2Desc'),
      cta: t('rescueProduce'),
      category: "Produce",
      gradient: "linear-gradient(135deg, #4A5D4E, #819067)",
      image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80"
    },
    {
      id: 3,
      title: t('banner3Title'),
      tagline: "UP TO 60% OFF",
      description: t('banner3Desc'),
      cta: t('exploreDairy'),
      category: "Dairy",
      gradient: "linear-gradient(135deg, #3B5249, #5C674E)",
      image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80"
    }
  ];

  return (
    <div className="banners-container">
      {banners.map((banner) => (
        <div 
          key={banner.id}
          className="promo-banner-card"
          style={{
            background: banner.gradient,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: '280px',
            flex: 1,
            height: '160px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s'
          }}
          onClick={() => onSelectCategory(banner.category)}
        >
          {/* Background image overlay */}
          <div 
            style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-15px',
              width: '120px',
              height: '120px',
              opacity: 0.25,
              backgroundImage: `url(${banner.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '50%',
              pointerEvents: 'none',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          />
          <div style={{ zIndex: 1 }}>
            <span style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              backdropFilter: 'blur(4px)',
              padding: '3px 8px', 
              borderRadius: '12px', 
              fontSize: '10px', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-block',
              marginBottom: '8px'
            }}>
              {banner.tagline}
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 2px 0', fontFamily: 'Outfit, sans-serif' }}>
              {banner.title}
            </h3>
            <p style={{ fontSize: '11px', margin: 0, opacity: 0.85, maxWidth: '160px', lineHeight: '1.3' }}>
              {banner.description}
            </p>
          </div>
          <button 
            style={{
              alignSelf: 'flex-start',
              backgroundColor: 'white',
              color: 'var(--primary-green)',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              zIndex: 1,
              marginTop: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
            className="banner-btn"
          >
            {banner.cta} &rarr;
          </button>
        </div>
      ))}
    </div>
  );
};

const Home = ({ onProductSelect }) => {
  const {
    products,
    productsLoading,
    selectedCategory,
    setSelectedCategory,
    userLocation,
    language,
    t
  } = useApp();

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const categories = [
    { en: 'All', hi: 'सभी' },
    { en: 'Bakery', hi: 'बेकरी' },
    { en: 'Dairy', hi: 'डेयरी' },
    { en: 'Produce', hi: 'सब्जियां-फल' },
    { en: 'Groceries', hi: 'किराना' },
    { en: 'Beverages', hi: 'पेय पदार्थ' },
    { en: 'Office Needs', hi: 'दफ्तर सामान' },
    { en: 'Furniture', hi: 'फर्नीचर' },
    { en: 'Others', hi: 'अन्य' }
  ];

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 72px)', background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
      
      {/* 80/20 Layout Grid */}
      <div 
        className="home-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '80% 20%',
          gap: 0,
          minHeight: 'calc(100vh - 72px)',
          width: '100%'
        }}
      >
        
        {/* Left Col: Hero, Banners, Tabs & Pinterest Grid */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', padding: '32px 48px' }}>
          
          {/* Brand Hero Heading (tagline replaced as main title) */}
          <div style={{ marginBottom: '28px', marginTop: '8px' }}>
            <h1 
              style={{ 
                fontSize: '46px', 
                fontWeight: 900, 
                lineHeight: 1.2, 
                letterSpacing: '-0.02em',
                fontFamily: 'Outfit, sans-serif',
                color: 'var(--text-primary)'
              }}
            >
              {t('heroTitle1')} <br />
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-green), var(--accent-green))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900
                }}
              >
                {t('heroTitle2')}
              </span>
            </h1>
          </div>

          {/* Blinkit/Zomato style Clearance Banners */}
          <ClearanceBanners onSelectCategory={setSelectedCategory} />

          {/* Category Tabs */}
          <div className="category-container" style={{ marginBottom: '20px' }}>
            {categories.map((cat) => {
              const label = language === 'en' ? cat.en : cat.hi;
              const value = cat.en;
              return (
                <button
                  key={value}
                  className={`category-pill ${selectedCategory === value ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Product Feed Grid */}
          {productsLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--border-color)',
                  borderTopColor: 'var(--primary-green)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px auto'
                }}
              ></div>
              <p style={{ color: 'var(--text-secondary)' }}>{t('loadingDeals')}</p>
            </div>
          ) : products.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 40px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <ShoppingBag size={40} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
              <p>{t('noDealsFound')}</p>
            </div>
          ) : (
            <div className="pinterest-grid" style={{ flex: 1 }}>
              {products.map((product, index) => (
                <div 
                  key={product._id} 
                  className="slide-up-fade"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <DealCard
                    product={product}
                    onClick={() => onProductSelect(product._id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Hyperlocal Map View (Constant, pinned to full viewport under navbar) */}
        <div style={{ minWidth: 0, position: 'relative' }}>
          <div 
            onClick={() => setIsMapExpanded(true)}
            className="pinned-map-container"
          >
            {/* Prevent interactive zoom/pan/marker click while small by setting pointer-events to none */}
            <div style={{ pointerEvents: 'none', height: '100%' }}>
              <MapView
                products={products}
                userLocation={userLocation}
                onProductClick={onProductSelect}
              />
            </div>
            
            {/* Zoom Overlay Banner */}
            <div 
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--primary-green)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 100,
                whiteSpace: 'nowrap'
              }}
            >
              <span>{t('clickToExpand')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Map Expansion Overlay */}
      {isMapExpanded && (
        <div 
          className="map-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
          }}
          onClick={() => setIsMapExpanded(false)}
        >
          <div 
            className="map-modal-content"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              maxWidth: '1200px',
              maxHeight: '85vh',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div>
                <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  {t('clearanceMapTitle')}
                </h2>
                <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                  {t('clearanceMapDesc')}
                </p>
              </div>
              <button
                onClick={() => setIsMapExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '28px',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  transition: 'background-color 0.2s',
                  backgroundColor: 'var(--bg-hover)'
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <MapView
                products={products}
                userLocation={userLocation}
                onProductClick={(id) => {
                  onProductSelect(id);
                  setIsMapExpanded(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
