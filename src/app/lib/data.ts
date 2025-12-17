export type Station = {
  id: string;
  type: 'PC' | 'PS5' | 'PS5 VIP' | 'VR Simulator';
  status: 'available' | 'in use' | 'maintenance';
  currentClientId?: string | null;
  sessionStartTime?: string | null;
  games?: string[];
};

export type Client = {
  id:string; // This is the Firebase Auth UID
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  subscriptionTier: 'Basic' | 'Premium' | 'VIP';
  subscriptionHours: number;
  bonusHours?: number;
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

export type ClientHistoryLog = {
    id: string;
    timestamp: string;
    type: 'bonus' | 'recharge' | 'check-in' | 'check-out' | 'system';
    description: string;
}
