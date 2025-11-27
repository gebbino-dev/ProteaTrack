import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import {
  ACTIVITY_TYPES,
  ActivityType,
  GREENHOUSES,
  SECTORS_PER_GREENHOUSE,
  BENCHES,
} from "@/types";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type RecordActivityScreenProps = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, "RecordActivity">;
  route: RouteProp<DashboardStackParamList, "RecordActivity">;
};

export default function RecordActivityScreen({
  navigation,
  route,
}: RecordActivityScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const preselected = route.params || {};

  const [activityType, setActivityType] = useState<ActivityType>("innaffiatura");
  const [greenhouse, setGreenhouse] = useState<number>(preselected.greenhouse || 1);
  const [sector, setSector] = useState<number>(preselected.sector || SECTORS_PER_GREENHOUSE[1][0]);
  const [bench, setBench] = useState<string>(preselected.bench || "B1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preselected.greenhouse) {
      setGreenhouse(preselected.greenhouse);
    }
    if (preselected.sector) {
      setSector(preselected.sector);
    }
    if (preselected.bench) {
      setBench(preselected.bench);
    }
  }, [preselected]);

  const sectors = SECTORS_PER_GREENHOUSE[greenhouse] || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await storage.saveActivity({
        type: activityType,
        greenhouse,
        sector,
        bench,
        date: new Date().toISOString(),
        notes,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare l'attivita. Riprova.");
      console.error("Error saving activity:", error);
    } finally {
      setSaving(false);
    }
  };

  const getActivityColor = (type: ActivityType) => {
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

  return (
    <ScreenKeyboardAwareScrollView>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        Registra una nuova attivita per un bancale specifico
      </ThemedText>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Tipo di Attivita
      </ThemedText>
      <Spacer height={Spacing.md} />

      <View style={styles.activityGrid}>
        {ACTIVITY_TYPES.map((type) => (
          <Pressable
            key={type.value}
            style={[
              styles.activityButton,
              {
                backgroundColor:
                  activityType === type.value
                    ? getActivityColor(type.value)
                    : theme.backgroundDefault,
                borderColor:
                  activityType === type.value
                    ? getActivityColor(type.value)
                    : theme.backgroundSecondary,
              },
            ]}
            onPress={() => setActivityType(type.value)}
          >
            <Feather
              name={type.icon as any}
              size={24}
              color={activityType === type.value ? "#FFFFFF" : theme.text}
            />
            <ThemedText
              style={[
                styles.activityLabel,
                { color: activityType === type.value ? "#FFFFFF" : theme.text },
              ]}
            >
              {type.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Posizione
      </ThemedText>
      <Spacer height={Spacing.md} />

      <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        Serra
      </ThemedText>
      <View style={styles.optionsRow}>
        {GREENHOUSES.map((g) => (
          <Pressable
            key={g}
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  greenhouse === g ? theme.primary : theme.backgroundDefault,
              },
            ]}
            onPress={() => {
              setGreenhouse(g);
              setSector(SECTORS_PER_GREENHOUSE[g][0]);
            }}
          >
            <ThemedText
              style={{ color: greenhouse === g ? "#FFFFFF" : theme.text }}
            >
              Serra {g}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        Settore
      </ThemedText>
      <View style={styles.sectorGrid}>
        {sectors.map((s) => (
          <Pressable
            key={s}
            style={[
              styles.sectorButton,
              {
                backgroundColor:
                  sector === s ? theme.primary : theme.backgroundDefault,
              },
            ]}
            onPress={() => setSector(s)}
          >
            <ThemedText
              style={[
                styles.sectorText,
                { color: sector === s ? "#FFFFFF" : theme.text },
              ]}
            >
              {s}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        Bancale
      </ThemedText>
      <View style={styles.optionsRow}>
        {BENCHES.map((b) => (
          <Pressable
            key={b}
            style={[
              styles.benchButton,
              {
                backgroundColor:
                  bench === b ? theme.primary : theme.backgroundDefault,
              },
            ]}
            onPress={() => setBench(b)}
          >
            <ThemedText style={{ color: bench === b ? "#FFFFFF" : theme.text }}>
              {b}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Note (opzionale)
      </ThemedText>
      <Spacer height={Spacing.md} />

      <TextInput
        style={[
          styles.notesInput,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        placeholder="Aggiungi note sull'attivita..."
        placeholderTextColor={theme.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Spacer height={Spacing["2xl"]} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed || saving ? 0.8 : 1,
          },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Feather name="check" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {saving ? "Salvataggio..." : "Salva Attivita"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  activityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  activityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  activityLabel: {
    fontWeight: "600",
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  sectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  sectorButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  sectorText: {
    fontSize: 14,
    fontWeight: "600",
  },
  benchButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  notesInput: {
    minHeight: 100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
