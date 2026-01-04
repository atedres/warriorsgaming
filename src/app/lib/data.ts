

export type Station = {
  id: string;
  type: 'PC' | 'PS5' | 'PS5 VIP' | 'VR' | 'Simulator';
  status: 'available' | 'in use' | 'maintenance';
  currentClientId?: string | null;
  sessionStartTime?: string | null;
  sessionEndTime?: string | null; // Heure de fin de session (si limitée)
  games?: string[];
  currentUsageLogId?: string | null;
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
  avatarUrl?: string;
};

export type Reservation = {
  clientId: string;
  stationId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

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

export type HistoryLogDescription = {
    key: string;
    metadata: Record<string, string | number>;
}

export type ClientHistoryLog = {
    id: string;
    timestamp: string;
    type: 'bonus' | 'recharge' | 'check-in' | 'check-out' | 'system';
    description: string | HistoryLogDescription;
}

export type Promotion = {
    id: string;
    title: string;
    description: string;
    image: string;
    imageHint: string;
}

export type Price = {
    id: string;
    stationType: 'PC' | 'PS5' | 'PS5 VIP' | 'VR' | 'Simulator';
    startHour: number; // 0-23
    endHour: number;   // 1-24
    pricePerHourWeekday: number;
    pricePerHourWeekend: number;
}

    