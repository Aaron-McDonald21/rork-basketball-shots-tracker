export type ShotCategory = "freeThrows" | "threePointers" | "midrange" | "layups";

export interface CategoryStats {
  makes: number;
  misses: number;
  total: number;
  percentage: number;
}

export interface BasketballStats {
  freeThrows: CategoryStats;
  threePointers: CategoryStats;
  midrange: CategoryStats;
  layups: CategoryStats;
}

export interface StatsState {
  stats: BasketballStats;
  sessionStats: BasketballStats;
  currentCategory: ShotCategory | null;
  isRecording: boolean;
  lastCommand: string;
}
