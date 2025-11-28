import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ActivityCard } from "@/components/ActivityCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Bench, Activity } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type BenchDetailScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "BenchDetail">;
  route: RouteProp<GreenhouseStackParamList, "BenchDetail">;
};

export default function BenchDetailScreen({ navigation, route }: BenchDetailScreenProps) {
  const { greenhouse, sector, bench } = route.params;
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [benchData, setBenchData] = useState<Bench | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [benchInfo, benchActivities] = await Promise.all([
        storage.getBench(greenhouse, sector, bench),
        storage.getActivitiesForBench(greenhouse, sector, bench),
      ]);
      setBenchData(benchInfo);
      setActivities(benchActivities);
    } catch (error) {
      console.error("Error loading bench data:", error);
    } finally {
      setLoading(false);
    }
  }, [greenhouse, sector, bench]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteActivity = async (activityId: string) => {
    Alert.alert(
      "Elimina Attività",
      "Sei sicuro di voler eliminare questa attività?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            try {
              await storage.deleteActivity(activityId);
              loadData();
            } catch (error) {
              console.error("Error deleting activity:", error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non specificata";
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView>
        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.infoHeader}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
              <Feather name="box" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="h4">
                Serra {greenhouse} - Settore {sector}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>
                Bancale {bench}
              </ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: theme.backgroundSecondary },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("EditBench", { greenhouse, sector, bench })}
              >
                <Feather name="edit-2" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.editButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => navigation.navigate("EditBench", { greenhouse, sector, bench })}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.backgroundSecondary }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="sun" size={20} color={theme.primary} />
              <View style={styles.infoText}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Piante
                </ThemedText>
                <ThemedText type="h4">{benchData?.plantCount || 0}</ThemedText>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Feather name="tag" size={20} color={theme.activityTreatment} />
              <View style={styles.infoText}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Varietà
                </ThemedText>
                <ThemedText type="body" numberOfLines={1}>
                  {benchData?.variety || "Non specificata"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={20} color={theme.activityWatering} />
              <View style={styles.infoText}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  Data Impianto
                </ThemedText>
                <ThemedText type="body">
                  {formatDate(benchData?.plantingDate || "")}
                </ThemedText>
              </View>
            </View>
          </View>

          {benchData?.notes ? (
            <View style={styles.notesSection}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                Note
              </ThemedText>
              <ThemedText>{benchData.notes}</ThemedText>
            </View>
          ) : null}
        </View>

        <Spacer height={Spacing["2xl"]} />

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Storico Attività</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {activities.length} attività
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        {activities.length === 0 ? (
          <View
            style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="clipboard" size={40} color={theme.tabIconDefault} />
            <Spacer height={Spacing.md} />
            <ThemedText style={{ textAlign: "center" }}>
              Nessuna attività registrata per questo bancale
            </ThemedText>
          </View>
        ) : (
          activities.map((activity) => (
            <View key={activity.id}>
              <ActivityCard
                activity={activity}
                onLongPress={() => handleDeleteActivity(activity.id)}
              />
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
        onPress={() =>
          navigation.navigate("RecordActivity", { greenhouse, sector, bench })
        }
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
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  notesSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
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
