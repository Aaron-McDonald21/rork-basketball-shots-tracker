export type ShotCategory = "freeThrows" | "threePointers" | "midrange" | "layups";

export interface Shot {
  id: string;
  category: ShotCategory;
  made: boolean;
  timestamp: number;
}

export interface CategoryStats {
  makes: number;
  misses: number;
  total: number;
  percentage: number;
}

export interface PlayerStats {
  freeThrows: CategoryStats;
  threePointers: CategoryStats;
  midrange: CategoryStats;
  layups: CategoryStats;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number | null;
  isPaused: boolean;
  shots: Shot[];
  stats: PlayerStats;
}

export interface Player {
  id: string;
  name: string;
  createdAt: number;
  stats: PlayerStats;
  shotHistory: Shot[];
  sessions: Session[];
}
