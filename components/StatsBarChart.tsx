import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import colors from "@/constants/colors";

interface ChartData {
  makes: number;
  misses: number;
  total: number;
}

interface StatsBarChartProps {
  freeThrows: ChartData;
  threePointers: ChartData;
}

const CHART_HEIGHT = 200;
const CHART_WIDTH = 280;
const BAR_WIDTH = 50;
const SPACING = 20;

const FREE_THROWS_LABEL = "Free Throws";
const THREE_POINTERS_LABEL = "Three Pointers";

export function StatsBarChart({ freeThrows, threePointers }: StatsBarChartProps) {
  const maxValue = Math.max(
    freeThrows.makes,
    freeThrows.misses,
    threePointers.makes,
    threePointers.misses,
    1
  );

  const scale = CHART_HEIGHT / maxValue;

  const ftMakesHeight = freeThrows.makes * scale;
  const ftMissesHeight = freeThrows.misses * scale;
  const tpMakesHeight = threePointers.makes * scale;
  const tpMissesHeight = threePointers.misses * scale;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shot Breakdown</Text>
      
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Rect
            x={SPACING}
            y={CHART_HEIGHT - ftMakesHeight}
            width={BAR_WIDTH}
            height={ftMakesHeight}
            fill={colors.palette.primary}
            rx={4}
          />
          {freeThrows.makes > 0 && (
            <SvgText
              x={SPACING + BAR_WIDTH / 2}
              y={CHART_HEIGHT - ftMakesHeight - 8}
              fill={colors.palette.text}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {String(freeThrows.makes)}
            </SvgText>
          )}
          
          <Rect
            x={SPACING + BAR_WIDTH + 10}
            y={CHART_HEIGHT - ftMissesHeight}
            width={BAR_WIDTH}
            height={ftMissesHeight}
            fill={colors.palette.danger}
            rx={4}
          />
          {freeThrows.misses > 0 && (
            <SvgText
              x={SPACING + BAR_WIDTH + 10 + BAR_WIDTH / 2}
              y={CHART_HEIGHT - ftMissesHeight - 8}
              fill={colors.palette.text}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {String(freeThrows.misses)}
            </SvgText>
          )}

          <Rect
            x={SPACING + (BAR_WIDTH + 10) * 2 + 20}
            y={CHART_HEIGHT - tpMakesHeight}
            width={BAR_WIDTH}
            height={tpMakesHeight}
            fill={colors.palette.primary}
            rx={4}
          />
          {threePointers.makes > 0 && (
            <SvgText
              x={SPACING + (BAR_WIDTH + 10) * 2 + 20 + BAR_WIDTH / 2}
              y={CHART_HEIGHT - tpMakesHeight - 8}
              fill={colors.palette.text}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {String(threePointers.makes)}
            </SvgText>
          )}

          <Rect
            x={SPACING + (BAR_WIDTH + 10) * 3 + 20}
            y={CHART_HEIGHT - tpMissesHeight}
            width={BAR_WIDTH}
            height={tpMissesHeight}
            fill={colors.palette.danger}
            rx={4}
          />
          {threePointers.misses > 0 && (
            <SvgText
              x={SPACING + (BAR_WIDTH + 10) * 3 + 20 + BAR_WIDTH / 2}
              y={CHART_HEIGHT - tpMissesHeight - 8}
              fill={colors.palette.text}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              {String(threePointers.misses)}
            </SvgText>
          )}

        </Svg>
        <View style={styles.labelsContainer}>
          <Text style={styles.chartLabel}>{FREE_THROWS_LABEL}</Text>
          <Text style={styles.chartLabel}>{THREE_POINTERS_LABEL}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.palette.primary }]} />
          <Text style={styles.legendText}>Makes</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.palette.danger }]} />
          <Text style={styles.legendText}>Misses</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.palette.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.palette.text,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  labelsContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    width: CHART_WIDTH,
    marginTop: 12,
  },
  chartLabel: {
    fontSize: 12,
    color: colors.palette.mutedText,
    fontWeight: "600" as const,
    flex: 1,
    textAlign: "center" as const,
  },
  legend: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    color: colors.palette.mutedText,
    fontWeight: "500" as const,
  },
});
