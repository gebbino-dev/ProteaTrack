import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Alert, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Activity, ACTIVITY_TYPES } from "@/types";
import { CalendarStackParamList } from "@/navigation/CalendarStackNavigator";

type EditActivityScreenProps = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, "EditActivity">;
  route: RouteProp<CalendarStackParamList, "EditActivity">;
};

export default function EditActivityScreen({ navigation, route }: EditActivityScreenProps) {
  const { activityId } = route.params;
  const { theme } = useTheme();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadActivity = async () => {
      const activities = await storage.getActivities();
      const found = activities.find((a) => a.id === activityId);
      if (found) {
        setActivity(found);
        setNotes(found.notes);
      }
    };
    loadActivity();
  }, [activityId]);

  const handleSave = async () => {
    if (!activity) return;
    setSaving(true);
    try {
      await storage.updateActivity(activityId, { notes });
      Alert.alert("Salvato", "L'attività è stata aggiornata");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare l'attività. Riprova.");
      console.error("Error saving activity:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!activity) {
    return (
      <ScreenKeyboardAwareScrollView>
        <View style={styles.loadingContainer}>
          <ThemedText>Caricamento...</ThemedText>
        </View>
      </ScreenKeyboardAwareScrollView>
    );
  }

  const activityInfo = ACTIVITY_TYPES.find((t) => t.value === activity.type) || ACTIVITY_TYPES[4];
  const activityDate = new Date(activity.date);

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="h4" style={styles.label}>
          Tipo di Attività
        </ThemedText>
        <Spacer height={Spacing.sm} />
        <View style={[styles.typeDisplay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={activityInfo.icon as any} size={20} color={theme.primary} />
          <ThemedText style={{ marginLeft: Spacing.sm }}>
            {activityInfo.label}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.label}>
          Ubicazione
        </ThemedText>
        <Spacer height={Spacing.sm} />
        <View style={[styles.typeDisplay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="map-pin" size={20} color={theme.primary} />
          <ThemedText style={{ marginLeft: Spacing.sm }}>
            Serra {activity.greenhouse} - Settore {activity.sector} - {activity.bench}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.label}>
          Data e Ora
        </ThemedText>
        <Spacer height={Spacing.sm} />
        <View style={[styles.typeDisplay, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="calendar" size={20} color={theme.primary} />
          <ThemedText style={{ marginLeft: Spacing.sm, flex: 1 }}>
            {activityDate.toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            {activityDate.toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.label}>
          Note
        </ThemedText>
        <Spacer height={Spacing.sm} />
        <TextInput
          style={[
            styles.notesInput,
            {
              color: theme.text,
              borderColor: theme.backgroundSecondary,
            },
          ]}
          placeholder="Aggiungi note sull'attività..."
          placeholderTextColor={theme.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={5}
        />
      </View>

      <Spacer height={Spacing.xl} />

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.primary,
              opacity: pressed || saving ? 0.8 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Feather name="check" size={20} color="#FFFFFF" />
          <ThemedText style={styles.buttonText}>
            {saving ? "Salvataggio..." : "Salva Modifiche"}
          </ThemedText>
        </Pressable>
      </View>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

import { Pressable } from "react-native";

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["3xl"],
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  typeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.body.fontSize,
    textAlignVertical: "top",
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
