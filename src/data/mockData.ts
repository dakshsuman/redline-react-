export interface Drive {
  id: number;
  name: string;
  date: string;
  dist: number;
  top: number;
  dur: string;
  pb: boolean;
  car: string;
}

export interface Friend {
  name: string;
  car: string;
  topSpeed: number;
  driving: boolean;
  speed?: string;
  location?: string;
  totalMiles: number;
  zeroToSixty: string;
  longest: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  car: string;
  value: string;
  isYou?: boolean;
  avatar?: string;
  move?: 'up' | 'down' | 'same';
}

export const drives: Drive[] = [
  { id: 1, name: 'Canyon Run', date: 'June 25th \· 4:12 PM', dist: 28.4, top: 88, dur: '1h 18m', pb: false, car: 'Porsche 911 GT3' },
  { id: 2, name: 'Coastal Loop', date: 'June 22nd \· 7:30 PM', dist: 42.7, top: 105, dur: '1h 15m', pb: true, car: 'Porsche 911 GT3' },
  { id: 3, name: 'Mountain Pass', date: 'April 13th \· 8:20 AM', dist: 38.6, top: 95, dur: '1h 20m', pb: false, car: 'Porsche 911 GT3' },
  { id: 4, name: 'City Loop', date: 'April 2nd \· 6:05 PM', dist: 20.1, top: 88, dur: '43m', pb: false, car: 'Nissan GT-R' },
  { id: 5, name: 'Highway Stunt', date: 'March 28th \· 9:10 AM', dist: 15.3, top: 76, dur: '30m', pb: false, car: 'Nissan GT-R' },
  { id: 6, name: 'Suburban Cruise', date: 'March 15th \· 2:00 PM', dist: 14.2, top: 64, dur: '35m', pb: false, car: 'Porsche 911 GT3' },
  { id: 7, name: 'Canyon Blast', date: 'March 8th \· 11:15 AM', dist: 32.8, top: 92, dur: '55m', pb: true, car: 'Porsche 911 GT3' },
  { id: 8, name: 'Night Run', date: 'Feb 20th \· 3:45 PM', dist: 31.2, top: 78, dur: '45m', pb: false, car: 'Porsche 911 GT3' },
];

export const friends: Friend[] = [
  { name: 'Sofia Ramirez', car: 'Porsche 718 Cayman', topSpeed: 156, driving: true, speed: '42 mph', totalMiles: 18920, zeroToSixty: '4.4 s', longest: 112, rank: 4 },
  { name: 'Marcus Chen', car: 'Nissan GT-R', topSpeed: 191, driving: true, location: 'Canyon Rd', totalMiles: 22340, zeroToSixty: '3.8 s', longest: 134, rank: 2 },
  { name: 'Ethan Brooks', car: 'GR Corolla', topSpeed: 162, driving: false, totalMiles: 8400, zeroToSixty: '5.2 s', longest: 78, rank: 7 },
  { name: 'Priya Nair', car: 'Civic Type R', topSpeed: 171, driving: false, totalMiles: 12100, zeroToSixty: '4.6 s', longest: 94, rank: 5 },
];

export const leaderboardData: { metric: string; entries: LeaderboardEntry[] }[] = [
  {
    metric: 'Miles',
    entries: [
      { rank: 1, name: 'Aisha Patel', car: 'Porsche 911 Turbo', value: '18,920 mi', move: 'same' },
      { rank: 2, name: 'Marcus Chen', car: 'Nissan GT-R', value: '16,450 mi', move: 'up' },
      { rank: 3, name: 'Jake Morrison', car: 'M2 Competition', value: '14,210 mi', move: 'down' },
    ],
  },
];

export const garageCars = [
  { name: 'Porsche 911 GT3', drives: 128, miles: 3240, top: 142, fighter: true },
  { name: 'Nissan GT-R', drives: 54, miles: 1180, top: 118, fighter: false },
  { name: 'Honda Civic Type R', drives: 86, miles: 1420, top: 105, fighter: true },
  { name: 'Toyota Corolla GR', drives: 32, miles: 640, top: 98, fighter: false },
];
