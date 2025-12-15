export type Station = {
  id: number;
  name: string;
  type: 'PC' | 'PS5' | 'PS5 VIP' | 'VR Simulator';
  status: 'Available' | 'In Use';
};

export const stations: Station[] = [
  { id: 1, name: 'PC Station 1', type: 'PC', status: 'Available' },
  { id: 2, name: 'PC Station 2', type: 'PC', status: 'In Use' },
  { id: 3, name: 'PS5 Station 1', type: 'PS5', status: 'Available' },
  { id: 4, name: 'PS5 Station 2', type: 'PS5', status: 'Available' },
  { id: 5, name: 'PS5 VIP Lounge', type: 'PS5 VIP', status: 'In Use' },
  { id: 6, name: 'VR Simulator', type: 'VR Simulator', status: 'Available' },
];

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  subscriptionTier: 'Basic' | 'Premium' | 'VIP';
  subscriptionHours: number;
  usageData: string;
};

export const clients: Client[] = [
  {
    id: 'cl-001',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '123-456-7890',
    memberSince: '2023-01-15',
    subscriptionTier: 'Premium',
    subscriptionHours: 12,
    usageData: 'Prefers PC games, especially FPS. Average session: 3 hours. Visits on weekends.',
  },
  {
    id: 'cl-002',
    name: 'Bob Williams',
    email: 'bob@example.com',
    phone: '234-567-8901',
    memberSince: '2023-03-22',
    subscriptionTier: 'VIP',
    subscriptionHours: 40,
    usageData: 'Exclusively uses the PS5 VIP lounge. Plays sports games. Visits frequently on weekday evenings.',
  },
  {
    id: 'cl-003',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '345-678-9012',
    memberSince: '2023-05-30',
    subscriptionTier: 'Basic',
    subscriptionHours: 2,
    usageData: 'Uses both PS5 and PC. Short sessions of 1-2 hours. Infrequent visitor.',
  },
  {
    id: 'cl-004',
    name: 'Diana Prince',
    email: 'diana@example.com',
    phone: '456-789-0123',
    memberSince: '2023-08-11',
    subscriptionTier: 'Premium',
    subscriptionHours: 8,
    usageData: 'Frequent VR Simulator user. Also plays adventure games on PS5. Average session: 2.5 hours.',
  },
];


export const usageAnalytics = {
  dailyRevenue: [
    { date: 'Mon', revenue: 650 },
    { date: 'Tue', revenue: 520 },
    { date: 'Wed', revenue: 880 },
    { date: 'Thu', revenue: 730 },
    { date: 'Fri', revenue: 1100 },
    { date: 'Sat', revenue: 1540 },
    { date: 'Sun', revenue: 1210 },
  ],
  popularStations: [
    { station: 'PC', users: 400 },
    { station: 'PS5', users: 300 },
    { station: 'PS5 VIP', users: 180 },
    { station: 'VR', users: 120 },
  ],
};
