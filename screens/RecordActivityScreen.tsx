import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import {
  ACTIVITY_TYPES,
  ActivityType,
  GreenhouseConfig,
  Greenhouse,
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
  const { theme } = useTheme();
  const preselected = route.params || {};

  const [config, setConfig] = useState<GreenhouseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState<ActivityType>("innaffiatura");
  const [greenhouse, setGreenhouse] = useState<number | null>(preselected.greenhouse || null);
  const [sector, setSector] = useState<number | null>(preselected.sector || null);
  const [bench, setBench] = useState<string | null>(preselected.bench || null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await storage.getGreenhouseConfig();
      setConfig(cfg);
      
      if (!preselected.greenhouse && cfg.greenhouses.length > 0) {
        const firstGh = cfg.greenhouses[0];
        setGreenhouse(firstGh.id);
        if (firstGh.sectors.length > 0) {
          setSector(firstGh.sectors[0].id);
        }
        if (firstGh.benchNames && firstGh.benchNames.length > 0) {
          setBench(firstGh.benchNames[0]);
        }
      }
    } catch (error) {
      console.error("Error loading config:", error);
      Alert.alert("Errore", "Impossibile caricare la configurazione");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentGreenhouse = useCallback((): Greenhouse | undefined => {
    if (!config || greenhouse === null) return undefined;
    return config.greenhouses.find(g => g.id === greenhouse);
  }, [config, greenhouse]);

  const currentGh = getCurrentGreenhouse();
  const sectors = currentGh?.sectors || [];
  const benches = currentGh?.benchNames || ['B1', 'B2', 'B3', 'B4', 'B5'];

  const handleGreenhouseChange = (ghId: number) => {
    setGreenhouse(ghId);
    const gh = config?.greenhouses.find(g => g.id === ghId);
    if (gh) {
      setSector(gh.sectors.length > 0 ? gh.sectors[0].id : null);
      setBench(gh.benchNames && gh.benchNames.length > 0 ? gh.benchNames[0] : 'B1');
    }
  };

  const handleSave = async () => {
    if (greenhouse === null || sector === null || bench === null) {
      Alert.alert("Errore", "Seleziona serra, settore e bancale");
      return;
    }

    setSaving(true);
    try {
      await storage.saveActivity({
        type: activityType,
        greenhouse,
        sector,
        bench,
        locationType: 'serra',
        customLocation: '',
        date: new Date().toISOString(),
        notes,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare l'attività. Riprova.");
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ThemedText>Errore nel caricamento</ThemedText>
      </View>
    );
  }

  return (
    <ScreenKeyboardAwareScrollView>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        Registra una nuova attività per un bancale specifico
      </ThemedText>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Tipo di Attività
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
        {config.greenhouses.map((g) => (
          <Pressable
            key={g.id}
            style={[
              styles.optionButton,
              {
                backgroundColor:
                  greenhouse === g.id ? theme.primary : theme.backgroundDefault,
              },
            ]}
            onPress={() => handleGreenhouseChange(g.id)}
          >
            <ThemedText
              style={{ color: greenhouse === g.id ? "#FFFFFF" : theme.text }}
            >
              {g.customName || `Serra ${g.id}`}
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
            key={s.id}
            style={[
              styles.sectorButton,
              {
                backgroundColor:
                  sector === s.id ? theme.primary : theme.backgroundDefault,
              },
            ]}
            onPress={() => setSector(s.id)}
          >
            <ThemedText
              style={[
                styles.sectorText,
                { color: sector === s.id ? "#FFFFFF" : theme.text },
              ]}
            >
              {s.id}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        Bancale
      </ThemedText>
      <View style={styles.optionsRow}>
        {benches.map((b) => (
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
        placeholder="Aggiungi note sull'attività..."
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
          {saving ? "Salvataggio..." : "Salva Attività"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
