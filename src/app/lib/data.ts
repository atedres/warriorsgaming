export type Station = {
  id: string;
  type: 'PC' | 'PS5' | 'PS5 VIP' | 'VR Simulator';
  status: 'available' | 'in use' | 'maintenance';
  currentClientId?: string | null;
  games?: string[];
};

export type Client = {
  id:string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  subscriptionTier: 'Basic' | 'Premium' | 'VIP';
  subscriptionHours: number;
  usageData: string;
  currentStationId?: string;
};

export type Game = {
    id: string;
    name: string;
}

export type UsageLog = {
    id?: string;
    clientId: string;
    stationId: string;
    startTime: string;
    endTime: string | null;
}
