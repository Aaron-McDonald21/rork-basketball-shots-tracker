import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserPlus, Trash2, ChevronRight, X, Check, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { usePlayers } from "@/contexts/PlayersContext";
import colors from "@/constants/colors";

import { Paywall } from "@/components/Paywall";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function PlayersScreen() {
  const insets = useSafeAreaInsets();
  const { isPro } = useSubscription();
  const {
    players,
    selectedPlayerId,
    addPlayer,
    deletePlayer,
    selectPlayer,
  } = usePlayers();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState<
    string | null
  >(null);

  const handleAddPlayer = useCallback(() => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName("");
      setShowAddModal(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [newPlayerName, addPlayer]);

  const handleDeletePlayer = useCallback(
    (playerId: string, playerName: string) => {
      if (Platform.OS === "web") {
        const confirmed = confirm(`Delete ${playerName}? This cannot be undone.`);
        if (confirmed) {
          deletePlayer(playerId);
        }
      } else {
        Alert.alert("Delete Player", `Delete ${playerName}? This cannot be undone.`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deletePlayer(playerId),
          },
        ]);
      }
    },
    [deletePlayer]
  );

  const selectedHistoryPlayer = players.find(
    (p) => p.id === selectedPlayerForHistory
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: "Players",
          headerStyle: { backgroundColor: colors.palette.background },
          headerTintColor: colors.palette.text,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Players</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <UserPlus size={20} color={colors.palette.text} />
          <Text style={styles.addButtonText}>Add Player</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <UserPlus size={64} color={colors.palette.mutedText} />
            <Text style={styles.emptyStateTitle}>No Players Yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first player to start tracking their stats
            </Text>
          </View>
        ) : (
          players.map((player) => {
            const totalShots = Object.values(player.stats).reduce(
              (sum, stat) => sum + stat.total,
              0
            );
            const totalMakes = Object.values(player.stats).reduce(
              (sum, stat) => sum + stat.makes,
              0
            );
            const overallPercentage =
              totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;
            const isSelected = selectedPlayerId === player.id;

            return (
              <View key={player.id} style={styles.playerCard}>
                <TouchableOpacity
                  style={[
                    styles.playerCardMain,
                    isSelected && styles.playerCardMainSelected,
                  ]}
                  onPress={() => {
                    selectPlayer(player.id);
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <View style={styles.playerCardLeft}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Check size={14} color={colors.palette.text} />
                        </View>
                      )}
                    </View>
                    <View style={styles.playerStatsRow}>
                      <View style={styles.playerStat}>
                        <Text style={styles.playerStatValue}>
                          {overallPercentage}%
                        </Text>
                        <Text style={styles.playerStatLabel}>Overall</Text>
                      </View>
                      <View style={styles.playerStat}>
                        <Text
                          style={[
                            styles.playerStatValue,
                            { color: colors.palette.primary },
                          ]}
                        >
                          {totalMakes}
                        </Text>
                        <Text style={styles.playerStatLabel}>Makes</Text>
                      </View>
                      <View style={styles.playerStat}>
                        <Text style={styles.playerStatValue}>{totalShots}</Text>
                        <Text style={styles.playerStatLabel}>Total</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.playerCardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setSelectedPlayerForHistory(player.id)}
                  >
                    <ChevronRight size={20} color={colors.palette.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeletePlayer(player.id, player.name)}
                  >
                    <Trash2 size={20} color={colors.palette.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Player</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color={colors.palette.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Player Name"
              placeholderTextColor={colors.palette.mutedText}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              autoFocus
              onSubmitEditing={handleAddPlayer}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.modalButtonTextConfirm}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedPlayerForHistory !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPlayerForHistory(null)}
      >
        {!isPro ? (
           <View style={{ flex: 1, paddingTop: insets.top }}>
             <View style={styles.historyHeader}>
               <Text style={styles.historyTitle}>Player History</Text>
               <TouchableOpacity onPress={() => setSelectedPlayerForHistory(null)}>
                 <X size={28} color={colors.palette.text} />
               </TouchableOpacity>
             </View>
             <Paywall 
               title="Unlock Player History"
               subtitle="View detailed stats and session history for each player."
             />
           </View>
        ) : selectedHistoryPlayer && (
          <View
            style={[styles.historyContainer, { paddingTop: insets.top + 20 }]}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>
                {selectedHistoryPlayer.name}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedPlayerForHistory(null)}
              >
                <X size={28} color={colors.palette.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.historyStatsGrid}>
              {Object.entries(selectedHistoryPlayer.stats).map(
                ([key, stat]) => {
                  const categoryLabel =
                    key === "freeThrows"
                      ? "Free Throws"
                      : key === "threePointers"
                      ? "Three Pointers"
                      : key === "midrange"
                      ? "Midrange"
                      : "Layups";
                  return (
                    <View key={key} style={styles.historyStatCard}>
                      <Text style={styles.historyStatCategory}>
                        {categoryLabel}
                      </Text>
                      <Text style={styles.historyStatPercentage}>
                        {stat.percentage}%
                      </Text>
                      <Text style={styles.historyStatDetail}>
                        {stat.makes}/{stat.total}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>

            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Sessions</Text>
            </View>

            <ScrollView
              style={styles.sessionsScrollView}
              contentContainerStyle={styles.sessionsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedHistoryPlayer.sessions.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>
                    No sessions recorded yet
                  </Text>
                </View>
              ) : (
                selectedHistoryPlayer.sessions.map((session) => {
                  const sessionDuration = session.endTime
                    ? Math.round((session.endTime - session.startTime) / 60000)
                    : null;
                  const totalShots = Object.values(session.stats).reduce(
                    (sum, stat) => sum + stat.total,
                    0
                  );
                  const totalMakes = Object.values(session.stats).reduce(
                    (sum, stat) => sum + stat.makes,
                    0
                  );
                  const percentage =
                    totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;

                  return (
                    <View key={session.id} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionHeaderLeft}>
                          <Clock size={16} color={colors.palette.primary} />
                          <Text style={styles.sessionDate}>
                            {new Date(session.startTime).toLocaleDateString()}
                          </Text>
                          <Text style={styles.sessionTime}>
                            {new Date(session.startTime).toLocaleTimeString()}
                          </Text>
                        </View>
                        {session.endTime && sessionDuration !== null ? (
                          <Text style={styles.sessionDuration}>
                            {sessionDuration} min
                          </Text>
                        ) : null}
                        {!session.endTime ? (
                          <View style={styles.activeSessionBadge}>
                            <Text style={styles.activeSessionBadgeText}>
                              Active
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.sessionStatsRow}>
                        <View style={styles.sessionStat}>
                          <Text style={styles.sessionStatValue}>{percentage}%</Text>
                          <Text style={styles.sessionStatLabel}>Overall</Text>
                        </View>
                        <View style={styles.sessionStat}>
                          <Text
                            style={[
                              styles.sessionStatValue,
                              { color: colors.palette.primary },
                            ]}
                          >
                            {totalMakes}
                          </Text>
                          <Text style={styles.sessionStatLabel}>Makes</Text>
                        </View>
                        <View style={styles.sessionStat}>
                          <Text style={styles.sessionStatValue}>{totalShots}</Text>
                          <Text style={styles.sessionStatLabel}>Total</Text>
                        </View>
                      </View>

                      <View style={styles.sessionCategoriesGrid}>
                        {Object.entries(session.stats).map(([key, stat]) => {
                          if (stat.total === 0) return null;
                          const categoryLabel =
                            key === "freeThrows"
                              ? "FT"
                              : key === "threePointers"
                              ? "3PT"
                              : key === "midrange"
                              ? "Mid"
                              : "Layup";
                          return (
                            <View key={key} style={styles.sessionCategoryChip}>
                              <Text style={styles.sessionCategoryLabel}>
                                {categoryLabel}
                              </Text>
                              <Text style={styles.sessionCategoryValue}>
                                {stat.makes}/{stat.total}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.palette.text,
  },
  addButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: colors.palette.text,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.palette.mutedText,
    textAlign: "center" as const,
  },
  playerCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.palette.surface,
    overflow: "hidden" as const,
  },
  playerCardMain: {
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent" as const,
    borderRadius: 12,
  },
  playerCardMainSelected: {
    borderColor: colors.palette.primary,
  },
  playerCardLeft: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
    gap: 8,
  },
  playerName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  selectedBadge: {
    backgroundColor: colors.palette.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playerStatsRow: {
    flexDirection: "row" as const,
    gap: 24,
  },
  playerStat: {
    alignItems: "center" as const,
  },
  playerStatValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  playerStatLabel: {
    fontSize: 12,
    color: colors.palette.mutedText,
    marginTop: 2,
  },
  playerCardActions: {
    flexDirection: "row" as const,
    borderTopWidth: 1,
    borderTopColor: colors.palette.border,
  },
  actionButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%" as const,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  modalInput: {
    backgroundColor: colors.palette.background,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.palette.text,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row" as const,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  modalButtonCancel: {
    backgroundColor: colors.palette.surfaceAlt,
  },
  modalButtonConfirm: {
    backgroundColor: colors.palette.primary,
  },
  modalButtonTextCancel: {
    color: colors.palette.text,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  modalButtonTextConfirm: {
    color: colors.palette.text,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  historyHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.border,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.palette.text,
  },
  historyStatsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    padding: 20,
    gap: 12,
  },
  historyStatCard: {
    width: "48%" as const,
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
  },
  historyStatCategory: {
    fontSize: 12,
    color: colors.palette.mutedText,
    marginBottom: 8,
  },
  historyStatPercentage: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.palette.text,
    marginBottom: 4,
  },
  historyStatDetail: {
    fontSize: 14,
    color: colors.palette.mutedText,
  },
  historySection: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  emptyHistory: {
    alignItems: "center" as const,
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.palette.mutedText,
  },
  sessionsScrollView: {
    maxHeight: 300,
  },
  sessionsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sessionCard: {
    backgroundColor: colors.palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  sessionHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.palette.text,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.palette.mutedText,
  },
  sessionDuration: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "600" as const,
  },
  activeSessionBadge: {
    backgroundColor: colors.palette.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeSessionBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  sessionStatsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    marginBottom: 12,
  },
  sessionStat: {
    alignItems: "center" as const,
  },
  sessionStatValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
  sessionStatLabel: {
    fontSize: 11,
    color: colors.palette.mutedText,
    marginTop: 2,
  },
  sessionCategoriesGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  sessionCategoryChip: {
    backgroundColor: colors.palette.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  sessionCategoryLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.palette.mutedText,
  },
  sessionCategoryValue: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.palette.text,
  },
});
