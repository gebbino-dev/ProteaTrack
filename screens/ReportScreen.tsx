import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import {
  FinancialSummary,
  GreenhouseStats,
  Activity,
  Treatment,
  Bench,
} from "@/types";
import { ReportStackParamList } from "@/navigation/ReportStackNavigator";

type ReportScreenProps = {
  navigation: NativeStackNavigationProp<ReportStackParamList, "Report">;
};

export default function ReportScreen({ navigation }: ReportScreenProps) {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [greenhouseStats, setGreenhouseStats] = useState<GreenhouseStats | null>(null);
  const [activityStats, setActivityStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
  });
  const [treatmentStats, setTreatmentStats] = useState({
    total: 0,
    byProduct: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
  ];

  const loadData = useCallback(async () => {
    try {
      const [summary, benches, activities, treatments] = await Promise.all([
        storage.getFinancialSummary(
          selectedYear,
          selectedMonth !== null ? selectedMonth : undefined
        ),
        storage.getBenches(),
        storage.getActivities(),
        storage.getTreatments(),
      ]);

      setFinancialSummary(summary);

      const totalPlants = benches.reduce((sum, b) => sum + b.plantCount, 0);
      const activeSectors = new Set(
        benches.filter((b) => b.plantCount > 0).map((b) => `${b.greenhouse}-${b.sector}`)
      ).size;
      const todayActivities = activities.filter(
        (a) => a.date === new Date().toISOString().split("T")[0]
      ).length;
      setGreenhouseStats({ totalPlants, activeSectors, todayActivities });

      const periodActivities = filterByPeriod(activities, selectedYear, selectedMonth);
      const byType: Record<string, number> = {};
      for (const a of periodActivities) {
        byType[a.type] = (byType[a.type] || 0) + 1;
      }
      setActivityStats({ total: periodActivities.length, byType });

      const periodTreatments = filterByPeriod(treatments, selectedYear, selectedMonth);
      const byProduct: Record<string, number> = {};
      for (const t of periodTreatments) {
        const name = t.productName || "Sconosciuto";
        byProduct[name] = (byProduct[name] || 0) + 1;
      }
      setTreatmentStats({ total: periodTreatments.length, byProduct });
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  const filterByPeriod = <T extends { date: string }>(
    items: T[],
    year: number,
    month: number | null
  ): T[] => {
    return items.filter((item) => {
      const date = new Date(item.date);
      if (month !== null) {
        return date.getFullYear() === year && date.getMonth() === month;
      }
      return date.getFullYear() === year;
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);

  const activityLabels: Record<string, string> = {
    innaffiatura: "Innaffiatura",
    concimazione: "Concimazione",
    potatura: "Potatura",
    trattamento: "Trattamento",
    altro: "Altro",
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Periodo
        </ThemedText>
        <Spacer height={Spacing.sm} />

        <View style={styles.periodSelector}>
          <Pressable
            onPress={() => setSelectedYear(selectedYear - 1)}
            style={[styles.periodButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="chevron-left" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">{selectedYear}</ThemedText>
          <Pressable
            onPress={() => setSelectedYear(selectedYear + 1)}
            style={[styles.periodButton, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="chevron-right" size={20} color={theme.text} />
          </Pressable>
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.monthsGrid}>
          <Pressable
            onPress={() => setSelectedMonth(null)}
            style={[
              styles.monthChip,
              {
                backgroundColor:
                  selectedMonth === null ? theme.primary : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              style={{
                color: selectedMonth === null ? "#FFFFFF" : theme.text,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              Anno
            </ThemedText>
          </Pressable>
          {months.map((month, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedMonth(index)}
              style={[
                styles.monthChip,
                {
                  backgroundColor:
                    selectedMonth === index ? theme.primary : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                style={{
                  color: selectedMonth === index ? "#FFFFFF" : theme.text,
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                {month.substring(0, 3)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Spacer height={Spacing["2xl"]} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Riepilogo Finanziario
        </ThemedText>
        <Spacer height={Spacing.md} />

        {financialSummary ? (
          <Card>
            <View style={styles.financialRow}>
              <View style={styles.financialItem}>
                <Feather name="trending-up" size={20} color="#4CAF50" />
                <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
                  Ricavi
                </ThemedText>
                <ThemedText type="h3" style={{ color: "#4CAF50" }}>
                  {formatCurrency(financialSummary.income)}
                </ThemedText>
              </View>
              <View style={styles.financialItem}>
                <Feather name="trending-down" size={20} color="#F44336" />
                <ThemedText style={[styles.financialLabel, { color: theme.textSecondary }]}>
                  Costi
                </ThemedText>
                <ThemedText type="h3" style={{ color: "#F44336" }}>
                  {formatCurrency(financialSummary.expenses)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.marginRow, { borderTopColor: theme.backgroundSecondary }]}>
              <ThemedText style={styles.marginLabel}>Margine</ThemedText>
              <ThemedText
                type="h2"
                style={{
                  color: financialSummary.margin >= 0 ? "#4CAF50" : "#F44336",
                }}
              >
                {formatCurrency(financialSummary.margin)}
              </ThemedText>
            </View>
          </Card>
        ) : null}

        <Spacer height={Spacing["2xl"]} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Statistiche Serre
        </ThemedText>
        <Spacer height={Spacing.md} />

        {greenhouseStats ? (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="sun" size={24} color={theme.primary} />
              <ThemedText type="h3">{greenhouseStats.totalPlants}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Piante
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="grid" size={24} color={theme.activityFertilizing} />
              <ThemedText type="h3">{greenhouseStats.activeSectors}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Settori Attivi
              </ThemedText>
            </View>
          </View>
        ) : null}

        <Spacer height={Spacing["2xl"]} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Attività nel Periodo
        </ThemedText>
        <Spacer height={Spacing.md} />

        <Card>
          <View style={styles.statHeader}>
            <Feather name="activity" size={20} color={theme.activityWatering} />
            <ThemedText type="h3" style={styles.statHeaderText}>
              {activityStats.total}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>attività</ThemedText>
          </View>
          {Object.entries(activityStats.byType).length > 0 ? (
            <View style={styles.breakdownList}>
              {Object.entries(activityStats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <View key={type} style={styles.breakdownRow}>
                    <ThemedText>{activityLabels[type] || type}</ThemedText>
                    <ThemedText type="h4">{count}</ThemedText>
                  </View>
                ))}
            </View>
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessuna attività nel periodo
            </ThemedText>
          )}
        </Card>

        <Spacer height={Spacing.xl} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Trattamenti nel Periodo
        </ThemedText>
        <Spacer height={Spacing.md} />

        <Card>
          <View style={styles.statHeader}>
            <Feather name="shield" size={20} color={theme.activityTreatment} />
            <ThemedText type="h3" style={styles.statHeaderText}>
              {treatmentStats.total}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>trattamenti</ThemedText>
          </View>
          {Object.entries(treatmentStats.byProduct).length > 0 ? (
            <View style={styles.breakdownList}>
              {Object.entries(treatmentStats.byProduct)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([product, count]) => (
                  <View key={product} style={styles.breakdownRow}>
                    <ThemedText numberOfLines={1} style={{ flex: 1 }}>
                      {product}
                    </ThemedText>
                    <ThemedText type="h4">{count}</ThemedText>
                  </View>
                ))}
            </View>
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessun trattamento nel periodo
            </ThemedText>
          )}
        </Card>

        <Spacer height={100} />
      </ScreenScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  periodButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  monthChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 50,
    alignItems: "center",
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  financialItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  financialLabel: {
    fontSize: 12,
  },
  marginRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marginLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statHeaderText: {
    marginLeft: Spacing.xs,
  },
  breakdownList: {
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
});
