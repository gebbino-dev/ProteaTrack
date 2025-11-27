import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Activity, ACTIVITY_TYPES } from "@/types";

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  onLongPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActivityCard({ activity, onPress, onLongPress }: ActivityCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

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

  const activityInfo = getActivityInfo(activity.type);
  const activityColor = getActivityColor(activity.type);
  const activityDate = new Date(activity.date);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Oggi";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ieri";
    } else {
      return date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
      });
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.colorBar, { backgroundColor: activityColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: activityColor + "20" }]}>
            <Feather name={activityInfo.icon as any} size={20} color={activityColor} />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {activityInfo.label}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              Serra {activity.greenhouse} - Settore {activity.sector} - {activity.bench}
            </ThemedText>
          </View>
          <View style={styles.timeContainer}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              {formatDate(activityDate)}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              {formatTime(activityDate)}
            </ThemedText>
          </View>
        </View>
        {activity.notes ? (
          <ThemedText
            style={[styles.notes, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {activity.notes}
          </ThemedText>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  notes: {
    marginTop: Spacing.sm,
    fontSize: 13,
  },
});
