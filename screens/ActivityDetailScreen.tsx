import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Activity, ACTIVITY_TYPES } from "@/types";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type ActivityDetailScreenProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, "ActivityDetail">;
  route: RouteProp<CalendarStackParamList, "ActivityDetail">;
};

export default function ActivityDetailScreen({ navigation, route }: ActivityDetailScreenProps) {
  const { activityId } = route.params;
  const { theme } = useTheme();
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const loadActivity = async () => {
      const activities = await storage.getActivities();
      const found = activities.find((a) => a.id === activityId);
      setActivity(found || null);
    };
    loadActivity();
  }, [activityId]);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "innaffiatura":
        return theme.activityWatering;
      case "concimazione":
        return theme.activityFertilizing;
      case "potatura":
        return theme.activityPruning;
      case "trattamento":
        return theme.activityTreatment;
      default:
        return theme.activityOther;
    }
  };

  const getActivityInfo = (type: string) => {
    return ACTIVITY_TYPES.find((t) => t.value === type) || ACTIVITY_TYPES[4];
  };

  const handleDelete = () => {
    Alert.alert(
      "Elimina Attivita",
      "Sei sicuro di voler eliminare questa attivita?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            try {
              await storage.deleteActivity(activityId);
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting activity:", error);
            }
          },
        },
      ]
    );
  };

  if (!activity) {
    return (
      <ScreenScrollView>
        <View style={styles.loadingContainer}>
          <ThemedText>Caricamento...</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  const activityInfo = getActivityInfo(activity.type);
  const activityColor = getActivityColor(activity.type);
  const activityDate = new Date(activity.date);

  return (
    <ScreenScrollView>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: activityColor }]}>
            <Feather name={activityInfo.icon as any} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="h3">{activityInfo.label}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              {activityDate.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.backgroundSecondary }]} />

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Feather name="home" size={20} color={theme.textSecondary} />
            <View style={styles.detailText}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                Serra
              </ThemedText>
              <ThemedText type="body">Serra {activity.greenhouse}</ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="grid" size={20} color={theme.textSecondary} />
            <View style={styles.detailText}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                Settore
              </ThemedText>
              <ThemedText type="body">Settore {activity.sector}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Feather name="box" size={20} color={theme.textSecondary} />
            <View style={styles.detailText}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                Bancale
              </ThemedText>
              <ThemedText type="body">{activity.bench}</ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="clock" size={20} color={theme.textSecondary} />
            <View style={styles.detailText}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                Ora
              </ThemedText>
              <ThemedText type="body">
                {activityDate.toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </ThemedText>
            </View>
          </View>
        </View>

        {activity.notes ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSecondary }]} />
            <View style={styles.notesSection}>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                Note
              </ThemedText>
              <ThemedText>{activity.notes}</ThemedText>
            </View>
          </>
        ) : null}
      </View>

      <Spacer height={Spacing["2xl"]} />

      <Button onPress={handleDelete} style={{ backgroundColor: theme.error }}>
        Elimina Attivita
      </Button>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    marginLeft: Spacing.sm,
  },
  notesSection: {
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.sm,
  },
});
