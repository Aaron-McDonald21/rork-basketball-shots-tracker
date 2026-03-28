import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { CategoryStats } from "@/types/stats";
import colors from "@/constants/colors";

interface StatCardProps {
  title: string;
  stats: CategoryStats;
  color: string;
}

export function StatCard({ title, stats, color }: StatCardProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.percentageContainer}>
          <Text style={styles.percentage}>{stats.percentage}%</Text>
          <Text style={styles.percentageLabel}>Shooting</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.makes}</Text>
            <Text style={styles.statLabel}>Makes</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.misses}</Text>
            <Text style={styles.statLabel}>Misses</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    overflow: "hidden" as const,
    marginVertical: 8,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.palette.text,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
  },
  percentageContainer: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  percentage: {
    fontSize: 48,
    fontWeight: "800" as const,
    color: colors.palette.text,
    lineHeight: 56,
  },
  percentageLabel: {
    fontSize: 14,
    color: colors.palette.mutedText,
    fontWeight: "500" as const,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    alignItems: "center" as const,
  },
  statItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.palette.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "500" as const,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.palette.border,
  },
});
