import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in React production builds
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
      map.setView([center.lat, center.lng], 14);
    }
  }, [center, map]);
  return null;
};

// Map Events listener for small map clicks
const MapEvents = ({ mapType, onSmallMapClick }) => {
  useMapEvents({
    click: () => {
      if (mapType === 'small' && onSmallMapClick) {
        onSmallMapClick();
      }
    }
  });
  return null;
};

const MapView = ({ products, userLocation, onProductClick, mapType = 'large', onSmallMapClick }) => {
  // Helper: Create custom HTML map pins
  const createCustomIcon = (expiryDate) => {
    const difference = new Date(expiryDate) - new Date();
    const hours = difference / (1000 * 60 * 60);

    let color = '#2D8A4E'; // Fresh Deal - Green
    if (hours > 0 && hours < 4) {
      color = '#D94625'; // Last Chance - Red
    } else if (hours >= 4 && hours < 24) {
      color = '#E28743'; // Near Expiry - Orange
    }

    return L.divIcon({
      html: `
        <div class="pin-inner-wrapper" style="
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
      popupAnchor: [0, -28],
    });
  };

  // Icon for User location
  const userIcon = L.divIcon({
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(30, 144, 255, 0.4);
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: #1E90FF;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `,
    className: 'user-location-pin',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <div className="map-container-wrapper">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={14}
        scrollWheelZoom={mapType !== 'small'}
        dragging={mapType !== 'small'}
        zoomControl={mapType !== 'small'}
        doubleClickZoom={mapType !== 'small'}
        touchZoom={mapType !== 'small'}
        boxZoom={mapType !== 'small'}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={userLocation} />
        <MapEvents mapType={mapType} onSmallMapClick={onSmallMapClick} />
        
        {/* Premium Map Tile Styles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* User Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>
              📍 Your Location
            </div>
          </Popup>
        </Marker>

        {/* Product/Deal Markers */}
        {products
          .map(product => {
            const coords = product.coordinates || product.vendor?.coordinates;
            if (!coords || !coords.lat || !coords.lng) return null;
            const imageSrc = product.image.startsWith('http') ? product.image : product.image;
            return (
              <Marker
                key={product._id}
                position={[coords.lat, coords.lng]}
                icon={createCustomIcon(product.expiryDate)}
                eventHandlers={{
                  mouseover: (e) => {
                    e.target.openPopup();
                  },
                  mouseout: (e) => {
                    e.target.closePopup();
                  },
                  click: (e) => {
                    e.target.closePopup();
                    if (mapType === 'small') {
                      if (onSmallMapClick) onSmallMapClick();
                    } else {
                      if (onProductClick) onProductClick(product._id);
                    }
                  }
                }}
              >
                <Popup>
                  <div
                    style={{
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt={product.name}
                      style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div style={{ padding: '2px 0' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>
                        {product.vendor?.storeName || 'Local Shop'}
                      </div>
                      <h4 style={{ fontSize: '13px', margin: '2px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {product.name}
                      </h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginTop: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-green)', fontSize: '14px' }}>
                          ₹{product.discountedPrice}
                        </span>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-light)', fontSize: '11px' }}>
                          ₹{product.originalPrice}
                        </span>
                        <span style={{ color: 'var(--danger-color)', fontWeight: 'bold', fontSize: '10px' }}>
                          {product.discountPercentage}% OFF
                        </span>
                      </div>
                      {mapType !== 'small' && (
                        <button
                          onClick={() => {
                            if (onProductClick) onProductClick(product._id);
                          }}
                          style={{
                            width: '100%',
                            marginTop: '8px',
                            padding: '6px',
                            backgroundColor: 'var(--primary-green)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default MapView;
