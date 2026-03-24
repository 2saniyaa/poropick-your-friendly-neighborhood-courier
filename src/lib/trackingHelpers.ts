// Helper functions for parcel tracking

export const PARCEL_STATUS = {
  NEW: null,
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
} as const;

export type ParcelStatus = typeof PARCEL_STATUS[keyof typeof PARCEL_STATUS];

// Update parcel status
export const updateParcelStatus = async (
  supabase: any,
  parcelId: string,
  newStatus: ParcelStatus
): Promise<{ success: boolean; error?: any }> => {
  try {
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('parcels')
      .update(updateData)
      .eq('id', parcelId);

    if (error) throw error;
    return { success: true };
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

// Generate tracking URL
export const getParcelTrackingUrl = (trackingId: string): string => {
  return `${window.location.origin}/track/${trackingId}`;
};
