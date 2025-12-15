export type Station = {
  id: string;
  type: 'PC' | 'PS5' | 'PS5 VIP' | 'VR Simulator';
  status: 'available' | 'in use' | 'maintenance';
  currentClientId?: string | null;
  games?: string[];
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  subscriptionTier: 'Basic' | 'Premium' | 'VIP';
  subscriptionHours: number;
  usageData: string;
  currentStationId?: string;
};
