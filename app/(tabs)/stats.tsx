import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, RotateCcw, Printer, FileText } from "lucide-react-native";
import * as Print from "expo-print";
import { generateStatsHTML } from "@/utils/generateStatsHTML";
import * as Haptics from "expo-haptics";
import { useStats } from "@/contexts/StatsContext";
import { StatCard } from "@/components/StatCard";
import { StatsBarChart } from "@/components/StatsBarChart";
import colors from "@/constants/colors";

import { Paywall } from "@/components/Paywall";
import { useSubscription } from "@/contexts/SubscriptionContext";

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { stats, sessionStats, resetStats } = useStats();
  const { isPro } = useSubscription();

  const handlePrint = async (type: 'session' | 'all-time') => {
    const data = type === 'session' ? sessionStats : stats;
    const title = type === 'session' ? 'Session Stats' : 'All-Time Stats';
    
    try {
      const html = generateStatsHTML(data, title);
      await Print.printAsync({
        html,
      });
    } catch (error: any) {
      console.error('Print error:', error);
      if (error?.message && !error.message.includes('cancelled') && !error.message.includes('dismissed')) {
        Alert.alert('Error', 'Failed to generate PDF');
      }
    }
  };

  if (!isPro) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen
          options={{
            title: "Stats Dashboard",
            headerStyle: { backgroundColor: colors.palette.background },
            headerTintColor: colors.palette.text,
            headerRight: () => null,
          }}
        />
        <Paywall 
          title="Unlock Stats"
          subtitle="Get detailed analytics and progress tracking with Pro."
        />
      </View>
    );
  }

  const handleReset = () => {
    const confirmReset = () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      resetStats();
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to reset all stats?")) {
        confirmReset();
      }
    } else {
      Alert.alert(
        "Reset Stats",
        "Are you sure you want to reset all stats? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset", style: "destructive", onPress: confirmReset },
        ]
      );
    }
  };

  const totalShots = stats.freeThrows.total + stats.threePointers.total;
  const totalMakes = stats.freeThrows.makes + stats.threePointers.makes;
  const overallPercentage =
    totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: "Stats Dashboard",
          headerStyle: { backgroundColor: colors.palette.background },
          headerTintColor: colors.palette.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
              <RotateCcw size={20} color={colors.palette.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BarChart3 size={32} color={colors.palette.primary} />
          <Text style={styles.headerTitle}>Your Performance</Text>
        </View>

        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Shooting</Text>
          <Text style={styles.overallPercentage}>{overallPercentage}%</Text>
          <View style={styles.overallStats}>
            <View style={styles.overallStatItem}>
              <Text style={styles.overallStatValue}>{totalMakes}</Text>
              <Text style={styles.overallStatLabel}>Total Makes</Text>
            </View>
            <View style={styles.overallStatDivider} />
            <View style={styles.overallStatItem}>
              <Text style={styles.overallStatValue}>{totalShots}</Text>
              <Text style={styles.overallStatLabel}>Total Shots</Text>
            </View>
          </View>
        </View>

        <StatCard
          title="Free Throws"
          stats={stats.freeThrows}
          color={colors.palette.primary}
        />

        <StatCard
          title="Three Pointers"
          stats={stats.threePointers}
          color={colors.palette.primaryBright}
        />

        <StatsBarChart
          freeThrows={stats.freeThrows}
          threePointers={stats.threePointers}
        />

        {totalShots === 0 && (
          <View style={styles.emptyState}>
            <BarChart3 size={48} color={colors.palette.surfaceAlt} />
            <Text style={styles.emptyStateTitle}>No Stats Yet</Text>
            <Text style={styles.emptyStateText}>
              Start recording shots to see your stats here
            </Text>
          </View>
        )}

        {isPro && (
          <View style={styles.exportSection}>
            <Text style={styles.sectionTitle}>Export Reports</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.printButton} 
                onPress={() => handlePrint('session')}
              >
                <Printer size={20} color="white" />
                <Text style={styles.printButtonText}>Session Report</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.printButton, styles.secondaryButton]} 
                onPress={() => handlePrint('all-time')}
              >
                <FileText size={20} color={colors.palette.primary} />
                <Text style={[styles.printButtonText, styles.secondaryButtonText]}>All-Time Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  exportSection: {
    marginTop: 24,
    marginBottom: 40,
    backgroundColor: colors.palette.surface,
    padding: 24,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.palette.text,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  printButton: {
    flex: 1,
    backgroundColor: colors.palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  printButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.palette.primary,
  },
  secondaryButtonText: {
    color: colors.palette.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  resetButton: {
    padding: 8,
    marginRight: 8,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.palette.text,
  },
  overallCard: {
    backgroundColor: colors.palette.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center" as const,
    borderWidth: 2,
    borderColor: colors.palette.primary,
  },
  overallLabel: {
    fontSize: 14,
    color: colors.palette.mutedText,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  overallPercentage: {
    fontSize: 64,
    fontWeight: "800" as const,
    color: colors.palette.text,
    lineHeight: 72,
    marginBottom: 16,
  },
  overallStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 24,
  },
  overallStatItem: {
    alignItems: "center" as const,
  },
  overallStatValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.palette.primary,
    marginBottom: 4,
  },
  overallStatLabel: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "500" as const,
  },
  overallStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.palette.border,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.palette.mutedText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.palette.border,
    textAlign: "center" as const,
  },
});
