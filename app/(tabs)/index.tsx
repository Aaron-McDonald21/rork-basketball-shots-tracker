import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mic, MicOff, Target, Play, Pause, Square, Check, X, Undo2, Lock, Unlock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useStats } from "@/contexts/StatsContext";
import { usePlayers } from "@/contexts/PlayersContext";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { extractVoiceCommands } from "@/utils/voiceParser";
import colors from "@/constants/colors";
import { useSubscription } from "@/contexts/SubscriptionContext";

const COMMAND_TTL_MS = 400; // Very short window to allow rapid repeated commands

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentCategory,
    setCategory,
    recordMake,
    recordMiss,
    lastCommand,
    stats,
    undoLastShot: undoStatsShot,
    canUndo: canUndoStats,
  } = useStats();

  const {
    selectedPlayer,
    recordShot,
    recordShotInSession,
    activeSessionId,
    activeSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    undoLastShot: undoPlayerShot,
    canUndo: canUndoPlayer,
  } = usePlayers();

  const { isPro } = useSubscription();

  const [isLocked, setIsLocked] = React.useState(false);
  const [feedbackType, setFeedbackType] = React.useState<'make' | 'miss' | null>(null);
  const feedbackOpacity = React.useRef(new Animated.Value(0)).current;
  const feedbackScale = React.useRef(new Animated.Value(0.5)).current;

  // Track processed commands to avoid duplicates
  const processedCommandsRef = React.useRef<Map<string, number>>(new Map());
  const cleanupIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Cleanup old processed commands periodically
  React.useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      processedCommandsRef.current.forEach((timestamp, key) => {
        if (now - timestamp > COMMAND_TTL_MS * 3) {
          processedCommandsRef.current.delete(key);
        }
      });
    }, 2000); // Cleanup every 2 seconds

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  const showFeedback = useCallback((type: 'make' | 'miss') => {
    setFeedbackType(type);
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0.5);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(feedbackScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFeedbackType(null);
    });
  }, [feedbackOpacity, feedbackScale]);

  const recordShotOutcome = useCallback(
    (made: boolean) => {
      if (!currentCategory) {
        return;
      }
      if (made) {
        recordMake();
        showFeedback('make');
      } else {
        recordMiss();
        showFeedback('miss');
      }
      if (selectedPlayer) {
        if (activeSessionId) {
          recordShotInSession(selectedPlayer.id, currentCategory, made);
        } else {
          recordShot(selectedPlayer.id, currentCategory, made);
        }
      }
    },
    [
      currentCategory,
      recordMake,
      showFeedback,
      recordMiss,
      selectedPlayer,
      activeSessionId,
      recordShotInSession,
      recordShot,
    ],
  );

  const handlePartialTranscription = useCallback(
    (text: string) => {
      if (activeSession?.isPaused) {
        console.log("[Record] Session paused, ignoring transcript");
        return;
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) {
        return;
      }

      const now = Date.now();
      processedCommandsRef.current.forEach((timestamp, key) => {
        if (now - timestamp > COMMAND_TTL_MS) {
          processedCommandsRef.current.delete(key);
        }
      });

      const commands = extractVoiceCommands(trimmed);
      let processedAny = false;

      commands.forEach((command) => {
        const commandKey =
          command.type === "category"
            ? `category_${command.category ?? "unknown"}`
            : `result_${command.type}`;
        const lastProcessed = processedCommandsRef.current.get(commandKey);
        if (lastProcessed && now - lastProcessed < COMMAND_TTL_MS) {
          return;
        }
        processedCommandsRef.current.set(commandKey, now);
        processedAny = true;

        if (command.type === "category" && command.category) {
          console.log("[Record] Voice category detected:", command.category);
          setCategory(command.category);
        } else if (command.type === "make") {
          console.log("[Record] Voice detected make");
          recordShotOutcome(true);
        } else if (command.type === "miss") {
          console.log("[Record] Voice detected miss");
          recordShotOutcome(false);
        }
      });

      if (!processedAny) {
        console.log("[Record] No actionable voice command:", trimmed);
      }
    },
    [activeSession?.isPaused, recordShotOutcome, setCategory],
  );

  const [localError, setError] = React.useState<string | null>(null);

  const { isRecording, isProcessing, latestTranscript, startRecording, stopRecording, error: voiceError } =
    useVoiceRecorder({
      onPartialTranscription: handlePartialTranscription,
      chunkDurationMs: 2500, // Reduced from 4000ms to improve responsiveness
    });

  // Clear local error when voice error clears
  React.useEffect(() => {
    if (!voiceError) {
      setError(null);
    }
  }, [voiceError]);

  React.useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);



  const handleRecordPress = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (isRecording) {
        processedCommandsRef.current.clear();
        await stopRecording();
      } else {
        processedCommandsRef.current.clear();
        await startRecording();
      }
    } catch (err) {
      console.error("[Record] Error toggling recording:", err);
      setError(err instanceof Error ? err.message : "Failed to toggle recording");
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleCategorySelect = useCallback(
    (category: "freeThrows" | "threePointers" | "midrange" | "layups") => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      setCategory(category);
    },
    [setCategory]
  );

  const categoryStats = currentCategory
    ? activeSession
      ? activeSession.stats[currentCategory]
      : selectedPlayer
      ? selectedPlayer.stats[currentCategory]
      : stats[currentCategory]
    : null;

  const handleStartSession = useCallback(() => {
    if (!selectedPlayer) return;
    startSession();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [selectedPlayer, startSession]);

  const handlePauseSession = useCallback(() => {
    pauseSession();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [pauseSession]);

  const handleResumeSession = useCallback(() => {
    resumeSession();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [resumeSession]);

  const handleEndSession = useCallback(() => {
    endSession();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [endSession]);

  const handleManualMake = useCallback(() => {
    if (!currentCategory || isLocked) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    recordShotOutcome(true);
  }, [currentCategory, isLocked, recordShotOutcome]);

  const handleManualMiss = useCallback(() => {
    if (!currentCategory || isLocked) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    recordShotOutcome(false);
  }, [currentCategory, isLocked, recordShotOutcome]);

  const handleUndo = useCallback(() => {
    if (isLocked) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    if (selectedPlayer) {
      undoPlayerShot();
    } else {
      undoStatsShot();
    }
  }, [isLocked, selectedPlayer, undoPlayerShot, undoStatsShot]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(!isLocked);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isLocked]);

  // Display the latest transcript for user feedback
  React.useEffect(() => {
    if (latestTranscript && !activeSession?.isPaused) {
      console.log("[Record] Latest transcript:", latestTranscript);
    }
  }, [latestTranscript, activeSession?.isPaused]);

  // Display voice errors
  React.useEffect(() => {
    if (voiceError) {
      console.error("[Record] Voice error:", voiceError);
    }
  }, [voiceError]);

  const canUndo = selectedPlayer ? canUndoPlayer : canUndoStats;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: "Record Stats",
          headerStyle: { backgroundColor: colors.palette.background },
          headerTintColor: colors.palette.text,
        }}
      />

      {feedbackType && (
        <Animated.View
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackOpacity,
              transform: [{ scale: feedbackScale }],
              backgroundColor:
                feedbackType === 'make'
                  ? 'rgba(45, 155, 150, 0.95)'
                  : 'rgba(239, 68, 68, 0.95)',
            },
          ]}
        >
          <View style={styles.feedbackContent}>
            {feedbackType === 'make' ? (
              <Check size={80} color={colors.palette.text} strokeWidth={3} />
            ) : (
              <X size={80} color={colors.palette.text} strokeWidth={3} />
            )}
            <Text style={styles.feedbackText}>
              {feedbackType === 'make' ? 'MAKE!' : 'MISS'}
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Basketball Stats Tracker</Text>
          {selectedPlayer && (
            <View style={styles.playerBadgeContainer}>
              <View style={styles.playerBadge}>
                <Text style={styles.playerBadgeText}>
                  Recording for: {selectedPlayer.name}
                </Text>
              </View>
              {activeSession && (
                <View>
                  <View
                    style={[
                      styles.sessionBadge,
                      activeSession.isPaused && styles.sessionBadgePaused,
                    ]}
                  >
                    <Text style={styles.sessionBadgeText}>
                      {activeSession.isPaused ? "Session Paused" : "Session Active"}
                    </Text>
                  </View>
                  {!isPro && (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>Demo: Result won't save</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          <Text style={styles.headerSubtitle}>
            Voice commands: &quot;free throws&quot;, &quot;three pointers&quot;, &quot;midrange&quot;, &quot;layups&quot;, &quot;make&quot;, &quot;miss&quot;
          </Text>
        </View>

        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Select Category</Text>
          <View style={styles.categoryButtonsGrid}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                currentCategory === "freeThrows" && styles.categoryButtonActive,
              ]}
              onPress={() => handleCategorySelect("freeThrows")}
            >
              <Target
                size={24}
                color={
                  currentCategory === "freeThrows" ? colors.palette.text : colors.palette.primary
                }
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory === "freeThrows" &&
                    styles.categoryButtonTextActive,
                ]}
              >
                Free Throws
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryButton,
                currentCategory === "threePointers" &&
                  styles.categoryButtonActive,
              ]}
              onPress={() => handleCategorySelect("threePointers")}
            >
              <Target
                size={24}
                color={
                  currentCategory === "threePointers" ? colors.palette.text : colors.palette.primaryBright
                }
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory === "threePointers" &&
                    styles.categoryButtonTextActive,
                ]}
              >
                Three Pointers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryButton,
                currentCategory === "midrange" &&
                  styles.categoryButtonActive,
              ]}
              onPress={() => handleCategorySelect("midrange")}
            >
              <Target
                size={24}
                color={
                  currentCategory === "midrange" ? colors.palette.text : colors.palette.primary
                }
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory === "midrange" &&
                    styles.categoryButtonTextActive,
                ]}
              >
                Midrange
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryButton,
                currentCategory === "layups" &&
                  styles.categoryButtonActive,
              ]}
              onPress={() => handleCategorySelect("layups")}
            >
              <Target
                size={24}
                color={
                  currentCategory === "layups" ? colors.palette.text : colors.palette.primaryBright
                }
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  currentCategory === "layups" &&
                    styles.categoryButtonTextActive,
                ]}
              >
                Layups
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedPlayer && !activeSessionId && (
          <View style={styles.sessionControls}>
            <TouchableOpacity
              style={styles.startSessionButton}
              onPress={handleStartSession}
            >
              <Play size={20} color={colors.palette.text} />
              <Text style={styles.startSessionButtonText}>Start New Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSession && (
          <View style={styles.sessionControls}>
            {activeSession.isPaused ? (
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={handleResumeSession}
              >
                <Play size={20} color={colors.palette.text} />
                <Text style={styles.sessionButtonText}>Resume Session</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={handlePauseSession}
              >
                <Pause size={20} color={colors.palette.text} />
                <Text style={styles.sessionButtonText}>Pause Session</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sessionButton, styles.endSessionButton]}
              onPress={handleEndSession}
            >
              <Square size={20} color={colors.palette.text} />
              <Text style={styles.sessionButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {categoryStats && (
          <View style={styles.currentStats}>
            <Text style={styles.currentStatsTitle}>
              {activeSession ? "Session Stats" : "Current Stats"}
            </Text>
            <View style={styles.currentStatsGrid}>
              <View style={styles.currentStatItem}>
                <Text style={styles.currentStatValue}>
                  {categoryStats.percentage}%
                </Text>
                <Text style={styles.currentStatLabel}>Shooting</Text>
              </View>
              <View style={styles.currentStatItem}>
                <Text style={[styles.currentStatValue, { color: colors.palette.primary }]}>
                  {categoryStats.makes}
                </Text>
                <Text style={styles.currentStatLabel}>Makes</Text>
              </View>
              <View style={styles.currentStatItem}>
                <Text style={[styles.currentStatValue, { color: colors.palette.danger }]}>
                  {categoryStats.misses}
                </Text>
                <Text style={styles.currentStatLabel}>Misses</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.recordSection}>
          <Animated.View
            style={[
              styles.recordButtonContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                isProcessing && styles.recordButtonProcessing,
              ]}
              onPress={handleRecordPress}
              disabled={isProcessing || (activeSession?.isPaused ?? false)}
            >
              {isRecording ? (
                <MicOff size={48} color={colors.palette.text} />
              ) : (
                <Mic size={48} color={colors.palette.text} />
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.recordButtonLabel}>
            {isProcessing
              ? "Processing..."
              : isRecording
              ? "Stop Recording"
              : "Start Recording"}
          </Text>
        </View>

        {lastCommand && (
          <View style={styles.commandFeedback}>
            <Text style={styles.commandFeedbackText}>{lastCommand}</Text>
          </View>
        )}

        {(voiceError || localError) && (
          <View style={styles.errorFeedback}>
            <Text style={styles.errorFeedbackText}>Error: {voiceError || localError}</Text>
          </View>
        )}

        {latestTranscript && isRecording && (
          <View style={styles.transcriptFeedback}>
            <Text style={styles.transcriptFeedbackTitle}>Heard:</Text>
            <Text style={styles.transcriptFeedbackText}>{latestTranscript}</Text>
          </View>
        )}

        {currentCategory && (
          <View style={styles.manualControls}>
            <Text style={styles.sectionTitle}>Manual Entry</Text>
            <View style={styles.manualButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.manualButton,
                  styles.makeButton,
                  isLocked && styles.manualButtonLocked,
                ]}
                onPress={handleManualMake}
                disabled={isLocked || (activeSession?.isPaused ?? false)}
              >
                <Check size={32} color={colors.palette.text} />
                <Text style={styles.manualButtonText}>Make</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.manualButton,
                  styles.missButton,
                  isLocked && styles.manualButtonLocked,
                ]}
                onPress={handleManualMiss}
                disabled={isLocked || (activeSession?.isPaused ?? false)}
              >
                <X size={32} color={colors.palette.text} />
                <Text style={styles.manualButtonText}>Miss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.manualButton,
                  styles.undoButton,
                  (!canUndo || isLocked) && styles.manualButtonDisabled,
                ]}
                onPress={handleUndo}
                disabled={!canUndo || isLocked || (activeSession?.isPaused ?? false)}
              >
                <Undo2 size={32} color={colors.palette.text} />
                <Text style={styles.manualButtonText}>Undo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.lockButton}
              onPress={handleToggleLock}
            >
              {isLocked ? (
                <Lock size={20} color={colors.palette.danger} />
              ) : (
                <Unlock size={20} color={colors.palette.primary} />
              )}
              <Text style={[styles.lockButtonText, isLocked && styles.lockButtonTextLocked]}>
                {isLocked ? "Buttons Locked" : "Buttons Unlocked"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to Use</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1</Text>
            <Text style={styles.instructionText}>
              Select a shot category or say &quot;free throws&quot;, &quot;three pointers&quot;, &quot;midrange&quot;, or &quot;layups&quot;
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2</Text>
            <Text style={styles.instructionText}>
              Press the mic button to start recording
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3</Text>
            <Text style={styles.instructionText}>
              Say &quot;make&quot; or &quot;miss&quot; after each shot
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4</Text>
            <Text style={styles.instructionText}>
              Press again to stop and process your command
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.palette.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.palette.mutedText,
    lineHeight: 20,
  },
  playerBadgeContainer: {
    marginVertical: 8,
    gap: 8,
  },
  playerBadge: {
    backgroundColor: colors.palette.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start" as const,
  },
  playerBadgeText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.palette.text,
  },
  sessionBadge: {
    backgroundColor: colors.palette.primaryBright,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start" as const,
  },
  sessionBadgePaused: {
    backgroundColor: colors.palette.mutedText,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.palette.text,
  },
  demoBadge: {
    backgroundColor: colors.palette.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start" as const,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  demoBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: '#f59e0b',
  },
  sessionControls: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 24,
  },
  startSessionButton: {
    flex: 1,
    backgroundColor: colors.palette.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  startSessionButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  sessionButton: {
    flex: 1,
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.palette.primary,
  },
  sessionButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.palette.text,
  },
  endSessionButton: {
    borderColor: colors.palette.danger,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.palette.text,
    marginBottom: 12,
  },
  categoryButtonsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  categoryButton: {
    width: "48%" as const,
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.palette.surface,
  },
  categoryButtonActive: {
    borderColor: colors.palette.primary,
    backgroundColor: colors.palette.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.palette.mutedText,
  },
  categoryButtonTextActive: {
    color: colors.palette.text,
  },
  currentStats: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  currentStatsTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.palette.text,
    marginBottom: 16,
  },
  currentStatsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
  },
  currentStatItem: {
    alignItems: "center" as const,
  },
  currentStatValue: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: colors.palette.text,
    marginBottom: 4,
  },
  currentStatLabel: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "500" as const,
  },
  recordSection: {
    alignItems: "center" as const,
    marginVertical: 32,
  },
  recordButtonContainer: {
    marginBottom: 16,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.palette.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.palette.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: colors.palette.danger,
    shadowColor: colors.palette.danger,
  },
  recordButtonProcessing: {
    backgroundColor: colors.palette.mutedText,
    shadowColor: colors.palette.mutedText,
  },
  recordButtonLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.palette.text,
  },
  commandFeedback: {
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.palette.primary,
  },
  commandFeedbackText: {
    fontSize: 16,
    color: colors.palette.text,
    fontWeight: "600" as const,
  },
  instructions: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.palette.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row" as const,
    marginBottom: 12,
    alignItems: "flex-start" as const,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.palette.primary,
    color: colors.palette.text,
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.palette.mutedText,
    lineHeight: 20,
  },
  manualControls: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  manualButtonsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 16,
  },
  manualButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 2,
  },
  makeButton: {
    backgroundColor: colors.palette.primary,
    borderColor: colors.palette.primary,
  },
  missButton: {
    backgroundColor: colors.palette.danger,
    borderColor: colors.palette.danger,
  },
  undoButton: {
    backgroundColor: colors.palette.surfaceAlt,
    borderColor: colors.palette.border,
  },
  manualButtonLocked: {
    opacity: 0.3,
  },
  manualButtonDisabled: {
    opacity: 0.3,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  lockButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.palette.surfaceAlt,
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.palette.primary,
  },
  lockButtonTextLocked: {
    color: colors.palette.danger,
  },
  feedbackOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 1000,
    borderRadius: 24,
    margin: 20,
  },
  feedbackContent: {
    alignItems: "center" as const,
    gap: 20,
  },
  feedbackText: {
    fontSize: 48,
    fontWeight: "900" as const,
    color: colors.palette.text,
    letterSpacing: 2,
  },
  errorFeedback: {
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.palette.danger,
  },
  errorFeedbackText: {
    fontSize: 14,
    color: colors.palette.danger,
    fontWeight: "600" as const,
  },
  transcriptFeedback: {
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.palette.primaryBright,
  },
  transcriptFeedbackTitle: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  transcriptFeedbackText: {
    fontSize: 16,
    color: colors.palette.text,
    fontWeight: "500" as const,
  },
});
