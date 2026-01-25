// Helper functions for parcel tracking and GPS location

export const PARCEL_STATUS = {
  NEW: null,
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
} as const;

export type ParcelStatus = typeof PARCEL_STATUS[keyof typeof PARCEL_STATUS];

// Get GPS location from browser
export const getCurrentLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

// Update parcel status with optional GPS location
export const updateParcelStatus = async (
  supabase: any,
  parcelId: string,
  newStatus: ParcelStatus,
  includeLocation: boolean = true
): Promise<{ success: boolean; location?: any; error?: any }> => {
  try {
    let location = null;

    if (includeLocation) {
      try {
        location = await getCurrentLocation();
      } catch (error) {
        console.warn('Failed to get GPS location:', error);
        // Continue without location
      }
    }

    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (location) {
      updateData.location = location;
    }

    const { error } = await supabase
      .from('parcels')
      .update(updateData)
      .eq('id', parcelId);

    if (error) {
      throw error;
    }

    return { success: true, location };
  } catch (error: any) {
    return { success: false, error };
  }
};

// Format status for display
export const formatParcelStatus = (status: ParcelStatus): string => {
  if (status === null) return 'New';
  if (status === PARCEL_STATUS.PICKED_UP) return 'Picked Up';
  if (status === PARCEL_STATUS.IN_TRANSIT) return 'In Transit';
  if (status === PARCEL_STATUS.DELIVERED) return 'Delivered';
  return status;
};

// Get status color
export const getStatusColor = (status: ParcelStatus): string => {
  if (status === null) return '#6c757d'; // Gray
  if (status === PARCEL_STATUS.PICKED_UP) return '#28a745'; // Green
  if (status === PARCEL_STATUS.IN_TRANSIT) return '#007bff'; // Blue
  if (status === PARCEL_STATUS.DELIVERED) return '#20c997'; // Teal
  return '#6c757d';
};

// Get status icon
export const getStatusIcon = (status: ParcelStatus): string => {
  if (status === null) return '⏳';
  if (status === PARCEL_STATUS.PICKED_UP) return '📦';
  if (status === PARCEL_STATUS.IN_TRANSIT) return '🚚';
  if (status === PARCEL_STATUS.DELIVERED) return '✅';
  return '⏳';
};

// Format location for display
export const formatLocationSimple = (location: { lat: number; lng: number; accuracy?: number } | null): string => {
  if (!location) return 'Location not available';

  // Basic region detection
  const { lat, lng } = location;
  
  // Finland approximate bounds
  if (lat >= 59.5 && lat <= 70.1 && lng >= 20.5 && lng <= 31.6) {
    return 'Finland';
  }
  
  // Europe approximate bounds
  if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) {
    return 'Europe';
  }
  
  // United States approximate bounds
  if (lat >= 24.5 && lat <= 49.4 && lng >= -125 && lng <= -66.9) {
    return 'United States';
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// Get Google Maps URL
export const getGoogleMapsUrl = (location: { lat: number; lng: number } | null): string | null => {
  if (!location) return null;
  return `https://maps.google.com/?q=${location.lat},${location.lng}`;
};

// Generate tracking URL
export const getParcelTrackingUrl = (trackingId: string): string => {
  return `${window.location.origin}/track/${trackingId}`;
};

