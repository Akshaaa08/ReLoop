import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import DealCard from '../components/DealCard';
import { Heart } from 'lucide-react';

const SavedDeals = ({ onProductSelect }) => {
  const { savedDeals, savedLoading, t } = useApp();

  return (
    <div className="content-body">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Heart size={26} fill="var(--danger-color)" color="var(--danger-color)" />
          <span>{t('savedDeals')}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Your bookmarked hyperlocal deals. Check countdowns and contact vendors to rescue food and save money!
        </p>
      </div>

      {savedLoading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading bookmarked deals...</p>
        </div>
      ) : savedDeals.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 40px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '40px auto 0 auto'
          }}
        >
          <Heart size={44} style={{ color: 'var(--text-light)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Saved Deals</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.5 }}>
            You haven't bookmarked any deals yet. Browse the home feed or search the map for active neighborhood discounts!
          </p>
        </div>
      ) : (
        <div className="pinterest-grid">
          {savedDeals.map((product) => (
            <DealCard
              key={product._id}
              product={product}
              onClick={() => onProductSelect(product._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedDeals;
