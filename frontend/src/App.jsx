import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';

// Component Imports
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Page Imports
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import SavedDeals from './pages/SavedDeals';
import VendorDashboard from './pages/VendorDashboard';
import AuthPage from './pages/AuthPage';

// Component/Additional Imports
import AddProductWizard from './components/AddProductWizard';
import MapView from './components/MapView';
import ProductDetailModal from './components/ProductDetailModal';

const AppContent = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const { products, userLocation, showToast } = useApp();
  const [activePage, setActivePage] = useState('home');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProductModalId, setSelectedProductModalId] = useState(null);
  const selectedProductForModal = products.find(p => p._id === selectedProductModalId);

  // Sync routing on authentication change
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'vendor') {
        setActivePage('vendor-dashboard');
      } else {
        setActivePage('home');
      }
    } else {
      setActivePage('home');
    }
  }, [isAuthenticated, user]);

  const handleNavClick = (page) => {
    if (page === 'profile') {
      showToast('Store Profile details coming soon!');
      return;
    }

    if (page === 'vendor-dashboard' || page === 'vendor-products' || page === 'add-product') {
      if (!isAuthenticated) {
        setActivePage('auth');
        return;
      }
    }

    setActivePage(page);
  };

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    setActivePage('product-details');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'sans-serif'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary-green)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }}
        ></div>
        <p style={{ fontWeight: 500 }}>Initializing ReLoop Network...</p>
      </div>
    );
  }

  const showSidebar = isAuthenticated && user?.role === 'vendor';

  return (
    <div className="app-container">
      {/* Background Animated Blobs */}
      <div className="glow-blob-container">
        <div className="glow-blob glow-blob-1"></div>
        <div className="glow-blob glow-blob-2"></div>
      </div>

      {/* Sidebar Navigation */}
      {showSidebar && (
        <Sidebar activePage={activePage} onNavClick={handleNavClick} />
      )}

      {/* Main Panel View */}
      <div className={`main-content ${!showSidebar ? 'no-sidebar' : ''}`}>
        {/* Navbar */}
        <Navbar onNavClick={handleNavClick} />

        {/* Dynamic Pages Routing */}
        {activePage === 'home' && (
          <Home onProductSelect={handleProductSelect} />
        )}
        
        {activePage === 'map' && (
          <div className="content-body" style={{ height: 'calc(100vh - 120px)' }}>
            <div style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: '24px' }}>Hyperlocal Deals Map</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Discover active deals near you. Click on any green/orange/red shop marker to view discount details.
              </p>
            </div>
            <div style={{ height: 'calc(100% - 60px)', minHeight: '400px' }}>
              <MapView
                products={products}
                userLocation={userLocation}
                mapType="large"
                onProductClick={(id) => setSelectedProductModalId(id)}
              />
            </div>
          </div>
        )}

        {activePage === 'saved' && (
          <SavedDeals onProductSelect={handleProductSelect} />
        )}

        {(activePage === 'vendor-dashboard' || activePage === 'vendor-products') && (
          <VendorDashboard
            onProductSelect={handleProductSelect}
            onAddClick={() => setActivePage('add-product')}
          />
        )}

        {activePage === 'add-product' && (
          <div className="content-body">
            <AddProductWizard onComplete={() => setActivePage('vendor-dashboard')} />
          </div>
        )}

        {activePage === 'product-details' && (
          <ProductDetails
            productId={selectedProductId}
            onBack={() => setActivePage(user?.role === 'vendor' ? 'vendor-dashboard' : 'home')}
          />
        )}

        {activePage === 'auth' && (
          <AuthPage
            onSuccess={(page) => setActivePage(page)}
          />
        )}
      </div>

      {/* Product Details split screen modal popup */}
      {selectedProductForModal && (
        <ProductDetailModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductModalId(null)}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
