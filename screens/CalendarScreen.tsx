import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ActivityCard } from "@/components/ActivityCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Activity, ACTIVITY_TYPES, ActivityType } from "@/types";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type CalendarScreenProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, "Calendar">;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<ActivityType | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadActivities = async () => {
        const data = await storage.getActivities();
        setActivities(data);
      };
      loadActivities();
    }, [])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];

    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    return days;
  };

  const getActivityDates = useMemo(() => {
    const dates = new Set<string>();
    activities.forEach((a) => {
      const date = a.date.split("T")[0];
      dates.add(date);
    });
    return dates;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    let filtered = activities.filter((a) => a.date.startsWith(dateStr));
    if (selectedFilter) {
      filtered = filtered.filter((a) => a.type === selectedFilter);
    }
    return filtered;
  }, [activities, selectedDate, selectedFilter]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasActivity = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return getActivityDates.has(dateStr);
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.calendarContainer, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={[styles.calendarCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => navigateMonth(-1)}
              style={({ pressed }) => [
                styles.navButton,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Feather name="chevron-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h4">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </ThemedText>
            <Pressable
              onPress={() => navigateMonth(1)}
              style={({ pressed }) => [
                styles.navButton,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Feather name="chevron-right" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((day) => (
              <ThemedText
                key={day}
                style={[styles.weekday, { color: theme.textSecondary }]}
              >
                {day}
              </ThemedText>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => (
              <Pressable
                key={index}
                style={[
                  styles.dayCell,
                  day !== null && isSelected(day) && {
                    backgroundColor: theme.primary,
                    borderRadius: BorderRadius.sm,
                  },
                  day !== null && isToday(day) && !isSelected(day) && {
                    borderWidth: 2,
                    borderColor: theme.primary,
                    borderRadius: BorderRadius.sm,
                  },
                ]}
                onPress={() => day !== null && handleDayPress(day)}
                disabled={day === null}
              >
                {day !== null ? (
                  <>
                    <ThemedText
                      style={[
                        styles.dayText,
                        isSelected(day) && { color: "#FFFFFF" },
                      ]}
                    >
                      {day}
                    </ThemedText>
                    {hasActivity(day) ? (
                      <View
                        style={[
                          styles.activityDot,
                          {
                            backgroundColor: isSelected(day)
                              ? "#FFFFFF"
                              : theme.primary,
                          },
                        ]}
                      />
                    ) : null}
                  </>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === null
                  ? theme.primary
                  : theme.backgroundDefault,
              },
            ]}
            onPress={() => setSelectedFilter(null)}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: selectedFilter === null ? "#FFFFFF" : theme.text },
              ]}
            >
              Tutti
            </ThemedText>
          </Pressable>
          {ACTIVITY_TYPES.slice(0, 4).map((type) => (
            <Pressable
              key={type.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedFilter === type.value
                    ? theme.primary
                    : theme.backgroundDefault,
                },
              ]}
              onPress={() => setSelectedFilter(
                selectedFilter === type.value ? null : type.value
              )}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: selectedFilter === type.value ? "#FFFFFF" : theme.text },
                ]}
              >
                {type.label.substring(0, 4)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ThemedText type="h4">
              {selectedDate.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              {filteredActivities.length} attività
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.activityItem}>
            <ActivityCard activity={item} />
          </View>
        )}
        ListEmptyComponent={
          <View
            style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="calendar" size={40} color={theme.tabIconDefault} />
            <Spacer height={Spacing.md} />
            <ThemedText style={{ textAlign: "center" }}>
              Nessuna attività per questa data
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: Spacing.xl,
  },
  calendarCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  navButton: {
    padding: Spacing.xs,
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 16,
  },
  activityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  activityItem: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
});
