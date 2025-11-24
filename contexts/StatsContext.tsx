import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import type { BasketballStats, ShotCategory } from "@/types/stats";
import { useSubscription } from "./SubscriptionContext";

const STORAGE_KEY = "basketball_stats";

const initialStats: BasketballStats = {
  freeThrows: { makes: 0, misses: 0, total: 0, percentage: 0 },
  threePointers: { makes: 0, misses: 0, total: 0, percentage: 0 },
  midrange: { makes: 0, misses: 0, total: 0, percentage: 0 },
  layups: { makes: 0, misses: 0, total: 0, percentage: 0 },
};

const calculatePercentage = (makes: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((makes / total) * 100);
};

export const [StatsProvider, useStats] = createContextHook(() => {
  const [stats, setStats] = useState<BasketballStats>(initialStats);
  const [sessionStats, setSessionStats] = useState<BasketballStats>(initialStats);
  const [currentCategory, setCurrentCategory] = useState<ShotCategory | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [history, setHistory] = useState<Array<{ stats: BasketballStats; sessionStats: BasketballStats; category: ShotCategory; action: 'make' | 'miss' }>>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { isPro } = useSubscription();

  const statsQuery = useQuery({
    queryKey: ["basketball-stats"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : initialStats;
    },
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: async (newStats: BasketballStats) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      return newStats;
    },
  });

  const { mutate: saveToStorage } = saveMutation;

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data);
      setIsInitialized(true);
    }
  }, [statsQuery.data]);

  const saveStats = useCallback(
    (newStats: BasketballStats) => {
      setStats(newStats);
      if (isPro) {
        saveToStorage(newStats);
      }
    },
    [saveToStorage, isPro]
  );

  const recordMake = useCallback(() => {
    if (!currentCategory) return;

    setHistory([...history, { stats, sessionStats, category: currentCategory, action: 'make' }]);

    const updateStats = (currentStats: BasketballStats) => {
      const category = currentStats[currentCategory];
      const newMakes = category.makes + 1;
      const newTotal = category.total + 1;

      return {
        ...currentStats,
        [currentCategory]: {
          makes: newMakes,
          misses: category.misses,
          total: newTotal,
          percentage: calculatePercentage(newMakes, newTotal),
        },
      };
    };

    const newStats = updateStats(stats);
    const newSessionStats = updateStats(sessionStats);

    setSessionStats(newSessionStats);
    saveStats(newStats);

    const categoryName = 
      currentCategory === "freeThrows" ? "Free Throw" :
      currentCategory === "threePointers" ? "Three Pointer" :
      currentCategory === "midrange" ? "Midrange" : "Layup";
    setLastCommand(`✓ ${categoryName} Made`);
  }, [currentCategory, stats, sessionStats, saveStats, history]);

  const recordMiss = useCallback(() => {
    if (!currentCategory) return;

    setHistory([...history, { stats, sessionStats, category: currentCategory, action: 'miss' }]);

    const updateStats = (currentStats: BasketballStats) => {
      const category = currentStats[currentCategory];
      const newMisses = category.misses + 1;
      const newTotal = category.total + 1;

      return {
        ...currentStats,
        [currentCategory]: {
          makes: category.makes,
          misses: newMisses,
          total: newTotal,
          percentage: calculatePercentage(category.makes, newTotal),
        },
      };
    };

    const newStats = updateStats(stats);
    const newSessionStats = updateStats(sessionStats);

    setSessionStats(newSessionStats);
    saveStats(newStats);

    const categoryName = 
      currentCategory === "freeThrows" ? "Free Throw" :
      currentCategory === "threePointers" ? "Three Pointer" :
      currentCategory === "midrange" ? "Midrange" : "Layup";
    setLastCommand(`✗ ${categoryName} Missed`);
  }, [currentCategory, stats, sessionStats, saveStats, history]);

  const setCategory = useCallback((category: ShotCategory) => {
    setCurrentCategory(category);
    const categoryName = 
      category === "freeThrows" ? "Free Throws" :
      category === "threePointers" ? "Three Pointers" :
      category === "midrange" ? "Midrange" : "Layups";
    setLastCommand(`📍 Tracking ${categoryName}`);
  }, []);

  const resetStats = useCallback(() => {
    saveStats(initialStats);
    setSessionStats(initialStats);
    setCurrentCategory(null);
    setLastCommand("Stats Reset");
    setHistory([]);
  }, [saveStats]);

  const undoLastShot = useCallback(() => {
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];
    saveStats(lastEntry.stats);
    setSessionStats(lastEntry.sessionStats);
    setHistory(history.slice(0, -1));
    setLastCommand("↩️ Undo Last Shot");
  }, [history, saveStats]);

  return {
    stats,
    sessionStats,
    currentCategory,
    isRecording,
    lastCommand,
    recordMake,
    recordMiss,
    undoLastShot,
    canUndo: history.length > 0,
    setCategory,
    setIsRecording,
    resetStats,
    isLoading: statsQuery.isLoading,
    isInitialized,
  };
});
