/**
 * Haversine formula to compute exact distance in km between two GPS coordinates
 */
export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0.5; // default fallback if coordinates are missing
  }
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1)); // Rounded to 1 decimal place
};

/**
 * Calculates delivery fee based on distance
 * Under 1 km: ₹14 total
 * 1 to 2 km: ₹18 total
 * 2 to 3 km: ₹24 total
 * Beyond 3 km: delivery not available
 * Splits fee 50/50 between customer and vendor
 */
export const calculateDeliveryFee = (distance) => {
  if (distance < 1) {
    return {
      total: 14,
      customer: 7,
      vendor: 7,
      available: true
    };
  } else if (distance <= 2) {
    return {
      total: 18,
      customer: 9,
      vendor: 9,
      available: true
    };
  } else if (distance <= 3) {
    return {
      total: 24,
      customer: 12,
      vendor: 12,
      available: true
    };
  } else {
    return {
      total: 0,
      customer: 0,
      vendor: 0,
      available: false,
      error: `Distance (${distance} km) exceeds maximum delivery radius of 3 km`
    };
  }
};

export const MIN_ORDER_SINGLE_VENDOR = 49; // Minimum order value of ₹49 per vendor group
export const MIN_ORDER_MULTI_VENDOR_TOTAL = 99; // Minimum order value of ₹99 overall when ordering from multi-vendors
