// Common types used throughout the application

export interface User {
  id: string;
  username: string;
  gender: 'male' | 'female' | 'other' | null;
  country: string | null;
  coins: number;
  createdAt: string;
  lastSeen: string;
  isOnline: boolean;
  isBanned: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'spend';
  reason: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface Match {
  id: string;
  peerA: string;
  peerB: string | null; // Null if matched with fake video
  isFake: boolean;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string | null;
  matchId: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
}

export interface FilterOptions {
  gender: 'male' | 'female' | 'other' | null;
  country: string | null;
}

export interface CoinPackage {
  id: number;
  name: string;
  coins: number;
  price: number;
  discountPercentage: number | null;
}

export type ChatState = 'idle' | 'requesting' | 'connecting' | 'matched' | 'ended';