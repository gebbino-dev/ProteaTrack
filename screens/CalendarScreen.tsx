import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, FlatList, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { eventAggregator, CalendarEvent, CalendarEventType } from "@/utils/eventAggregator";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type CalendarScreenProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, "Calendar">;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; icon: string }> = {
  activity: { label: 'Attiv.', icon: 'activity' },
  treatment: { label: 'Tratt.', icon: 'shield' },
  plant_arrival: { label: 'Piante', icon: 'sun' },
  transaction: { label: 'Cont.', icon: 'dollar-sign' },
  pending_import: { label: 'Import', icon: 'inbox' },
};

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventDates, setEventDates] = useState<Map<string, CalendarEventType[]>>(new Map());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<CalendarEventType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      const dates = await eventAggregator.getAllEventDates();
      setEventDates(dates);
    } catch (error) {
      console.error('Error loading event dates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEventsForDate = useCallback(async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = await eventAggregator.getEventsForDate(dateStr);
      setEvents(dayEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      loadEventsForDate(selectedDate);
    }, [loadAllData, loadEventsForDate, selectedDate])
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

  const filteredEvents = useMemo(() => {
    if (selectedFilter) {
      return events.filter(e => e.type === selectedFilter);
    }
    return events;
  }, [events, selectedFilter]);

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

  const getEventTypesForDay = (day: number): CalendarEventType[] => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return eventDates.get(dateStr) || [];
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    loadEventsForDate(newDate);
  };

  const days = getDaysInMonth(currentMonth);

  const renderEventCard = ({ item }: { item: CalendarEvent }) => (
    <View style={[styles.eventCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.eventIconContainer, { backgroundColor: item.color + '20' }]}>
        <Feather name={item.icon as any} size={18} color={item.color} />
      </View>
      <View style={styles.eventContent}>
        <ThemedText style={styles.eventTitle} numberOfLines={1}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.eventSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.subtitle}
        </ThemedText>
      </View>
      <View style={[styles.eventTypeBadge, { backgroundColor: item.color + '20' }]}>
        <ThemedText style={[styles.eventTypeText, { color: item.color }]}>
          {EVENT_TYPE_CONFIG[item.type].label}
        </ThemedText>
      </View>
    </View>
  );

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
            {days.map((day, index) => {
              const eventTypes = day !== null ? getEventTypesForDay(day) : [];
              const hasEvents = eventTypes.length > 0;
              
              return (
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
                      {hasEvents ? (
                        <View style={styles.eventDotsRow}>
                          {eventTypes.slice(0, 3).map((type, i) => (
                            <View
                              key={i}
                              style={[
                                styles.eventDot,
                                {
                                  backgroundColor: isSelected(day)
                                    ? "#FFFFFF"
                                    : eventAggregator.getEventColor(type),
                                },
                              ]}
                            />
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
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
            {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[])
              .filter(type => type !== 'pending_import')
              .map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedFilter === type
                        ? eventAggregator.getEventColor(type)
                        : theme.backgroundDefault,
                    },
                  ]}
                  onPress={() => setSelectedFilter(
                    selectedFilter === type ? null : type
                  )}
                >
                  <Feather 
                    name={EVENT_TYPE_CONFIG[type].icon as any} 
                    size={14} 
                    color={selectedFilter === type ? "#FFFFFF" : theme.text}
                    style={{ marginRight: 4 }}
                  />
                  <ThemedText
                    style={[
                      styles.filterText,
                      { color: selectedFilter === type ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {EVENT_TYPE_CONFIG[type].label}
                  </ThemedText>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={filteredEvents}
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
              {filteredEvents.length} eventi
            </ThemedText>
          </View>
        }
        renderItem={renderEventCard}
        ListEmptyComponent={
          <View
            style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="calendar" size={40} color={theme.tabIconDefault} />
            <Spacer height={Spacing.md} />
            <ThemedText style={{ textAlign: "center" }}>
              Nessun evento per questa data
            </ThemedText>
            <ThemedText style={{ textAlign: "center", color: theme.textSecondary, marginTop: 8 }}>
              Attivita, trattamenti, arrivi piante e movimenti contabili appariranno qui
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
  eventDotsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  filterScrollView: {
    marginTop: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  eventTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
});
