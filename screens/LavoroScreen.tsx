import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ActivityCard } from "@/components/ActivityCard";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Activity, ACTIVITY_TYPES } from "@/types";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

type LavoroScreenProps = {
  navigation: NativeStackNavigationProp<LavoroStackParamList, "Lavoro">;
};

export default function LavoroScreen({ navigation }: LavoroScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await storage.getActivities();
      setActivities(data);
    } catch (error) {
      console.error("Error loading activities:", error);
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

  const filteredActivities = filterType
    ? activities.filter((a) => a.type === filterType)
    : activities;

  const todayActivities = activities.filter(
    (a) => a.date === new Date().toISOString().split("T")[0]
  ).length;

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="calendar" size={20} color={theme.primary} />
            <ThemedText type="h3" style={styles.statValue}>
              {todayActivities}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Oggi
            </ThemedText>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="activity" size={20} color={theme.activityWatering} />
            <ThemedText type="h3" style={styles.statValue}>
              {activities.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Totali
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Filtra per tipo
        </ThemedText>
        <Spacer height={Spacing.sm} />

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilterType(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !filterType
                  ? theme.primary
                  : theme.backgroundDefault,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: !filterType ? "#FFFFFF" : theme.text },
              ]}
            >
              Tutte
            </ThemedText>
          </Pressable>
          {ACTIVITY_TYPES.map((type) => (
            <Pressable
              key={type.value}
              onPress={() =>
                setFilterType(filterType === type.value ? null : type.value)
              }
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterType === type.value
                      ? theme.primary
                      : theme.backgroundDefault,
                },
              ]}
            >
              <Feather
                name={type.icon as any}
                size={14}
                color={filterType === type.value ? "#FFFFFF" : theme.text}
              />
              <ThemedText
                style={[
                  styles.filterText,
                  { color: filterType === type.value ? "#FFFFFF" : theme.text },
                ]}
              >
                {type.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Spacer height={Spacing.xl} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Attività ({filteredActivities.length})
        </ThemedText>
        <Spacer height={Spacing.md} />

        {filteredActivities.length === 0 ? (
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
              {filterType ? "Nessuna attività di questo tipo" : "Nessuna attività registrata"}
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: theme.textSecondary }]}
            >
              Premi il pulsante + per registrare un'attività
            </ThemedText>
          </View>
        ) : (
          filteredActivities.map((activity) => (
            <Pressable
              key={activity.id}
              onPress={() =>
                navigation.navigate("ActivityDetail", { activityId: activity.id })
              }
            >
              <ActivityCard activity={activity} />
              <Spacer height={Spacing.md} />
            </Pressable>
          ))
        )}

        <Spacer height={80} />
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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
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
