import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Alert, Platform } from "react-native";
import type { Player, PlayerStats, Shot, ShotCategory, Session } from "@/types/player";
import { useSubscription } from "./SubscriptionContext";

const PLAYERS_STORAGE_KEY = "basketball_players";
const SELECTED_PLAYER_KEY = "selected_player_id";

const initialStats: PlayerStats = {
  freeThrows: { makes: 0, misses: 0, total: 0, percentage: 0 },
  threePointers: { makes: 0, misses: 0, total: 0, percentage: 0 },
  midrange: { makes: 0, misses: 0, total: 0, percentage: 0 },
  layups: { makes: 0, misses: 0, total: 0, percentage: 0 },
};

const calculatePercentage = (makes: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((makes / total) * 100);
};

export const [PlayersProvider, usePlayers] = createContextHook(() => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [shotHistory, setShotHistory] = useState<{ playerId: string; players: Player[]; inSession: boolean }[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track player state before session starts to revert for free users
  const [sessionStartSnapshot, setSessionStartSnapshot] = useState<Player | null>(null);

  const { isPro } = useSubscription();

  const playersQuery = useQuery({
    queryKey: ["basketball-players"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PLAYERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    },
    staleTime: Infinity,
  });

  const selectedPlayerQuery = useQuery({
    queryKey: ["selected-player"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(SELECTED_PLAYER_KEY);
      return stored;
    },
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: async (newPlayers: Player[]) => {
      await AsyncStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(newPlayers));
      return newPlayers;
    },
  });

  const { mutate: saveToStorage } = saveMutation;

  const saveSelectedPlayerMutation = useMutation({
    mutationFn: async (playerId: string | null) => {
      if (playerId) {
        await AsyncStorage.setItem(SELECTED_PLAYER_KEY, playerId);
      } else {
        await AsyncStorage.removeItem(SELECTED_PLAYER_KEY);
      }
      return playerId;
    },
  });

  const { mutate: saveSelectedPlayer } = saveSelectedPlayerMutation;

  useEffect(() => {
    if (playersQuery.data !== undefined) {
      setPlayers(playersQuery.data);
      if (selectedPlayerQuery.data !== undefined) {
        setIsInitialized(true);
      }
    }
  }, [playersQuery.data, selectedPlayerQuery.data]);

  useEffect(() => {
    if (selectedPlayerQuery.data !== undefined) {
      setSelectedPlayerId(selectedPlayerQuery.data);
      if (playersQuery.data !== undefined) {
        setIsInitialized(true);
      }
    }
  }, [selectedPlayerQuery.data, playersQuery.data]);

  const savePlayers = useCallback(
    (newPlayers: Player[]) => {
      setPlayers(newPlayers);
      saveToStorage(newPlayers);
    },
    [saveToStorage]
  );

  const addPlayer = useCallback(
    (name: string) => {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name,
        createdAt: Date.now(),
        stats: initialStats,
        shotHistory: [],
        sessions: [],
      };
      const updatedPlayers = [...players, newPlayer];
      savePlayers(updatedPlayers);
      return newPlayer.id;
    },
    [players, savePlayers]
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      const updatedPlayers = players.filter((p) => p.id !== playerId);
      savePlayers(updatedPlayers);
      if (selectedPlayerId === playerId) {
        setSelectedPlayerId(null);
        saveSelectedPlayer(null);
      }
    },
    [players, selectedPlayerId, savePlayers, saveSelectedPlayer]
  );

  const selectPlayer = useCallback(
    (playerId: string) => {
      setSelectedPlayerId(playerId);
      saveSelectedPlayer(playerId);
    },
    [saveSelectedPlayer]
  );

  const recordShot = useCallback(
    (playerId: string, category: ShotCategory, made: boolean) => {
      setShotHistory([...shotHistory, { playerId, players, inSession: false }]);

      const playerIndex = players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return;

      const player = players[playerIndex];
      const shot: Shot = {
        id: Date.now().toString(),
        category,
        made,
        timestamp: Date.now(),
      };

      const categoryStats = player.stats[category];
      const newMakes = made ? categoryStats.makes + 1 : categoryStats.makes;
      const newMisses = made ? categoryStats.misses : categoryStats.misses + 1;
      const newTotal = categoryStats.total + 1;

      const updatedPlayer: Player = {
        ...player,
        stats: {
          ...player.stats,
          [category]: {
            makes: newMakes,
            misses: newMisses,
            total: newTotal,
            percentage: calculatePercentage(newMakes, newTotal),
          },
        },
        shotHistory: [shot, ...player.shotHistory],
      };

      const updatedPlayers = [...players];
      updatedPlayers[playerIndex] = updatedPlayer;
      savePlayers(updatedPlayers);
    },
    [players, savePlayers, shotHistory]
  );

  const clearPlayerHistory = useCallback(
    (playerId: string) => {
      const playerIndex = players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return;

      const updatedPlayer: Player = {
        ...players[playerIndex],
        stats: initialStats,
        shotHistory: [],
      };

      const updatedPlayers = [...players];
      updatedPlayers[playerIndex] = updatedPlayer;
      savePlayers(updatedPlayers);
    },
    [players, savePlayers]
  );

  const startSession = useCallback(() => {
    if (!selectedPlayerId) return null;

    const playerIndex = players.findIndex((p) => p.id === selectedPlayerId);
    if (playerIndex === -1) return null;

    // Snapshot current state for free users
    if (!isPro) {
      setSessionStartSnapshot(players[playerIndex]);
    } else {
      setSessionStartSnapshot(null);
    }

    const sessionId = Date.now().toString();
    const newSession: Session = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      isPaused: false,
      shots: [],
      stats: initialStats,
    };

    const updatedPlayer: Player = {
      ...players[playerIndex],
      sessions: [newSession, ...players[playerIndex].sessions],
    };

    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = updatedPlayer;
    savePlayers(updatedPlayers);
    setActiveSessionId(sessionId);
    return sessionId;
  }, [selectedPlayerId, players, savePlayers, isPro]);

  const pauseSession = useCallback(() => {
    if (!activeSessionId || !selectedPlayerId) return;

    const playerIndex = players.findIndex((p) => p.id === selectedPlayerId);
    if (playerIndex === -1) return;

    const player = players[playerIndex];
    const sessionIndex = player.sessions.findIndex(
      (s) => s.id === activeSessionId
    );
    if (sessionIndex === -1) return;

    const updatedSession = {
      ...player.sessions[sessionIndex],
      isPaused: true,
    };

    const updatedSessions = [...player.sessions];
    updatedSessions[sessionIndex] = updatedSession;

    const updatedPlayer: Player = {
      ...player,
      sessions: updatedSessions,
    };

    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = updatedPlayer;
    savePlayers(updatedPlayers);
  }, [activeSessionId, selectedPlayerId, players, savePlayers]);

  const resumeSession = useCallback(() => {
    if (!activeSessionId || !selectedPlayerId) return;

    const playerIndex = players.findIndex((p) => p.id === selectedPlayerId);
    if (playerIndex === -1) return;

    const player = players[playerIndex];
    const sessionIndex = player.sessions.findIndex(
      (s) => s.id === activeSessionId
    );
    if (sessionIndex === -1) return;

    const updatedSession = {
      ...player.sessions[sessionIndex],
      isPaused: false,
    };

    const updatedSessions = [...player.sessions];
    updatedSessions[sessionIndex] = updatedSession;

    const updatedPlayer: Player = {
      ...player,
      sessions: updatedSessions,
    };

    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = updatedPlayer;
    savePlayers(updatedPlayers);
  }, [activeSessionId, selectedPlayerId, players, savePlayers]);

  const endSession = useCallback(() => {
    if (!activeSessionId || !selectedPlayerId) return;

    const playerIndex = players.findIndex((p) => p.id === selectedPlayerId);
    if (playerIndex === -1) return;

    const player = players[playerIndex];

    if (!isPro && sessionStartSnapshot && sessionStartSnapshot.id === player.id) {
       // Revert to snapshot
       const updatedPlayers = [...players];
       updatedPlayers[playerIndex] = sessionStartSnapshot;
       savePlayers(updatedPlayers);
       
       setActiveSessionId(null);
       setSessionStartSnapshot(null);

       if (Platform.OS !== "web") {
         Alert.alert("Session Ended", "Session data was not saved. Upgrade to Pro to save your history!");
       } else {
         alert("Session Ended. Session data was not saved. Upgrade to Pro to save your history!");
       }
       return;
    }

    const sessionIndex = player.sessions.findIndex(
      (s) => s.id === activeSessionId
    );
    if (sessionIndex === -1) return;

    const updatedSession = {
      ...player.sessions[sessionIndex],
      endTime: Date.now(),
      isPaused: false,
    };

    const updatedSessions = [...player.sessions];
    updatedSessions[sessionIndex] = updatedSession;

    const updatedPlayer: Player = {
      ...player,
      sessions: updatedSessions,
    };

    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = updatedPlayer;
    savePlayers(updatedPlayers);
    setActiveSessionId(null);
    setSessionStartSnapshot(null);
  }, [activeSessionId, selectedPlayerId, players, savePlayers, isPro, sessionStartSnapshot]);

  const recordShotInSession = useCallback(
    (playerId: string, category: ShotCategory, made: boolean) => {
      setShotHistory([...shotHistory, { playerId, players, inSession: true }]);

      const playerIndex = players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return;

      const player = players[playerIndex];
      const shot: Shot = {
        id: Date.now().toString(),
        category,
        made,
        timestamp: Date.now(),
      };

      const categoryStats = player.stats[category];
      const newMakes = made ? categoryStats.makes + 1 : categoryStats.makes;
      const newMisses = made ? categoryStats.misses : categoryStats.misses + 1;
      const newTotal = categoryStats.total + 1;

      const updatedPlayerStats: PlayerStats = {
        ...player.stats,
        [category]: {
          makes: newMakes,
          misses: newMisses,
          total: newTotal,
          percentage: calculatePercentage(newMakes, newTotal),
        },
      };

      let updatedSessions = player.sessions;
      if (activeSessionId) {
        const sessionIndex = player.sessions.findIndex(
          (s) => s.id === activeSessionId
        );
        if (sessionIndex !== -1) {
          const session = player.sessions[sessionIndex];
          const sessionCategoryStats = session.stats[category];
          const sessionNewMakes = made
            ? sessionCategoryStats.makes + 1
            : sessionCategoryStats.makes;
          const sessionNewMisses = made
            ? sessionCategoryStats.misses
            : sessionCategoryStats.misses + 1;
          const sessionNewTotal = sessionCategoryStats.total + 1;

          const updatedSession: Session = {
            ...session,
            shots: [shot, ...session.shots],
            stats: {
              ...session.stats,
              [category]: {
                makes: sessionNewMakes,
                misses: sessionNewMisses,
                total: sessionNewTotal,
                percentage: calculatePercentage(
                  sessionNewMakes,
                  sessionNewTotal
                ),
              },
            },
          };

          updatedSessions = [...player.sessions];
          updatedSessions[sessionIndex] = updatedSession;
        }
      }

      const updatedPlayer: Player = {
        ...player,
        stats: updatedPlayerStats,
        shotHistory: [shot, ...player.shotHistory],
        sessions: updatedSessions,
      };

      const updatedPlayers = [...players];
      updatedPlayers[playerIndex] = updatedPlayer;
      savePlayers(updatedPlayers);
    },
    [players, savePlayers, activeSessionId, shotHistory]
  );

  const undoLastShot = useCallback(() => {
    if (shotHistory.length === 0) return;

    const lastEntry = shotHistory[shotHistory.length - 1];
    setPlayers(lastEntry.players);
    setShotHistory(shotHistory.slice(0, -1));
  }, [shotHistory]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || null;
  const activeSession =
    selectedPlayer && activeSessionId
      ? selectedPlayer.sessions.find((s) => s.id === activeSessionId) || null
      : null;

  return {
    players,
    selectedPlayer,
    selectedPlayerId,
    activeSessionId,
    activeSession,
    addPlayer,
    deletePlayer,
    selectPlayer,
    recordShot,
    recordShotInSession,
    undoLastShot,
    canUndo: shotHistory.length > 0,
    clearPlayerHistory,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    isLoading: playersQuery.isLoading,
    isInitialized,
  };
});
