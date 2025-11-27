import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { StatCard } from "@/components/StatCard";
import { ActivityCard } from "@/components/ActivityCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Activity } from "@/types";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;
};

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    totalPlants: 0,
    todayActivities: 0,
    benchesWithPlants: 0,
    recentActivities: [] as Activity[],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await storage.initializeBenches();
      const data = await storage.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedText type="h3" style={styles.sectionTitle}>
          Panoramica
        </ThemedText>
        <Spacer height={Spacing.md} />

        <View style={styles.statsRow}>
          <StatCard
            icon="sun"
            value={stats.totalPlants.toString()}
            label="Piante Totali"
            color={theme.primary}
          />
          <StatCard
            icon="activity"
            value={stats.todayActivities.toString()}
            label="Attivita Oggi"
            color={theme.activityWatering}
          />
        </View>

        <Spacer height={Spacing.md} />

        <View style={styles.statsRow}>
          <StatCard
            icon="grid"
            value={stats.benchesWithPlants.toString()}
            label="Bancali Attivi"
            color={theme.activityFertilizing}
          />
          <StatCard
            icon="layers"
            value="3"
            label="Serre"
            color={theme.activityTreatment}
          />
        </View>

        <Spacer height={Spacing["2xl"]} />

        <ThemedText type="h3" style={styles.sectionTitle}>
          Attivita Recenti
        </ThemedText>
        <Spacer height={Spacing.md} />

        {stats.recentActivities.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather
              name="clipboard"
              size={48}
              color={theme.tabIconDefault}
              style={styles.emptyIcon}
            />
            <ThemedText style={styles.emptyText}>
              Nessuna attivita registrata
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: theme.textSecondary }]}
            >
              Premi il pulsante + per registrare la prima attivita
            </ThemedText>
          </View>
        ) : (
          stats.recentActivities.slice(0, 5).map((activity) => (
            <View key={activity.id}>
              <ActivityCard activity={activity} />
              <Spacer height={Spacing.md} />
            </View>
          ))
        )}
      </ScreenScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.xl,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        onPress={() => navigation.navigate("RecordActivity")}
      >
        <Feather name="plus" size={28} color="#FFFFFF" />
      </Pressable>
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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  emptyState: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
});
