import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import { uiTranslations, translateProductsBatch } from '../utils/translate';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user, token } = useAuth();
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Language state
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  
  // Products state
  const [products, setProducts] = useState([]);
  const [translatedProducts, setTranslatedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bookmarks state (Saved deals)
  const [savedDeals, setSavedDeals] = useState([]);
  const [translatedSavedDeals, setTranslatedSavedDeals] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Cart State
  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem('reloop_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('reloop_cart', JSON.stringify(cart));
  }, [cart]);

  // Cart helper functions
  const addToCart = (product, qty = 1) => {
    if (!user) {
      showToast('Please login to add items to your cart.');
      return;
    }
    if (user.role !== 'customer') {
      showToast('Only customers can shop and purchase deals.');
      return;
    }

    const existingIdx = cart.findIndex(item => item.product._id === product._id);
    if (existingIdx > -1) {
      const currentQty = cart[existingIdx].quantity;
      const newQty = Math.min(product.quantity, currentQty + qty);
      const updated = [...cart];
      updated[existingIdx].quantity = newQty;
      setCart(updated);
      showToast(`Updated quantity of ${product.name} in cart.`);
    } else {
      const finalQty = Math.min(product.quantity, qty);
      setCart([...cart, { product, quantity: finalQty }]);
      showToast(`Added ${product.name} to cart.`);
    }
  };

  const updateCartQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product._id === productId) {
        const finalQty = Math.min(item.product.quantity, qty);
        return { ...item, quantity: finalQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product._id !== productId));
    showToast('Item removed from cart.');
  };

  const clearCart = () => {
    setCart([]);
  };

  // Handle products translation reactively
  useEffect(() => {
    const translate = async () => {
      if (language === 'hi' && products.length > 0) {
        const trans = await translateProductsBatch(products, 'hi');
        setTranslatedProducts(trans);
      } else {
        setTranslatedProducts(products);
      }
    };
    translate();
  }, [products, language]);

  // Handle saved deals translation reactively
  useEffect(() => {
    const translate = async () => {
      if (language === 'hi' && savedDeals.length > 0) {
        const trans = await translateProductsBatch(savedDeals, 'hi');
        setTranslatedSavedDeals(trans);
      } else {
        setTranslatedSavedDeals(savedDeals);
      }
    };
    translate();
  }, [savedDeals, language]);
  
  // User geolocation coordinates for sorting
  const [userLocation, setUserLocation] = useState({ lat: 28.6280, lng: 77.2150 });
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationName, setLocationName] = useState('Gangadham, Pune');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');

  // Handle Theme application
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Language storage
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Initialize Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
          setLocationLoading(false);
          console.log('Location acquired:', coords);
        },
        (error) => {
          console.warn('Geolocation failed or denied, using defaults.');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  // Sync user location when user logs in/registers and has coordinates
  useEffect(() => {
    if (user && user.coordinates && user.coordinates.lat && user.coordinates.lng) {
      setUserLocation(user.coordinates);
      console.log('Synced user coordinates to AppContext:', user.coordinates);
    }
  }, [user]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    showToast('Acquiring your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setLocationLoading(false);
        showToast('📍 Location updated successfully!');
      },
      (error) => {
        console.warn('Geolocation failed or denied:', error);
        setLocationLoading(false);
        showToast('Failed to secure location.');
      }
    );
  };


  // Geocode location coordinates whenever they change
  useEffect(() => {
    const reverseGeocode = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&zoom=16`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const placeName = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.city || addr.town || 'Pune';
            setLocationName(placeName);
          }
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      }
    };

    reverseGeocode();
  }, [userLocation]);

  // Fetch products based on category, search, and coordinates
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      let url = `/api/products?lat=${userLocation.lat}&lng=${userLocation.lng}`;
      if (selectedCategory && selectedCategory !== 'All' && selectedCategory !== 'सभी') {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch products whenever filters or location updates
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery, userLocation]);

  // Fetch saved deals (bookmarks) for customer
  const fetchSavedDeals = async () => {
    if (!token || (user && user.role !== 'customer')) return;
    setSavedLoading(true);
    try {
      const res = await fetch('/api/saved', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedDeals(data);
      }
    } catch (error) {
      console.error('Failed to fetch saved deals:', error);
    } finally {
      setSavedLoading(false);
    }
  };

  // Fetch saved deals on login
  useEffect(() => {
    if (token && user && user.role === 'customer') {
      fetchSavedDeals();
    } else {
      setSavedDeals([]);
    }
  }, [token, user]);

  // Toggle bookmark / save deal
  const toggleBookmark = async (productId) => {
    if (!token) {
      showToast('Please login to save deals');
      return;
    }
    if (user && user.role !== 'customer') {
      showToast('Only customers can bookmark deals');
      return;
    }

    const isBookmarked = savedDeals.some(deal => deal._id === productId);

    try {
      if (isBookmarked) {
        const res = await fetch(`/api/saved/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setSavedDeals(prev => prev.filter(deal => deal._id !== productId));
          showToast('Removed from saved deals');
        }
      } else {
        const res = await fetch(`/api/saved/${productId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          // Re-fetch list
          fetchSavedDeals();
          showToast('Added to saved deals!');
        }
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // Toast triggering
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Translate UI helper
  const t = (key) => {
    const langDict = uiTranslations[language] || uiTranslations['en'];
    return langDict[key] || uiTranslations['en'][key] || key;
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : 'en');
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        toggleLanguage,
        products: translatedProducts,
        productsLoading,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        savedDeals: translatedSavedDeals,
        savedLoading,
        userLocation,
        setUserLocation,
        locationName,
        setLocationName,
        locationLoading,
        locateUser,
        fetchProducts,
        toggleBookmark,
        toastMessage,
        showToast,
        t,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        token,
      }}
    >
      {children}
      {toastMessage && (
        <div className="toast">
          <span>✨</span> {toastMessage}
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
