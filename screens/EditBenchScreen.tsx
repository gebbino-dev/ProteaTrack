import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Bench, PROTEACEAE_VARIETIES } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type EditBenchScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "EditBench">;
  route: RouteProp<GreenhouseStackParamList, "EditBench">;
};

export default function EditBenchScreen({ navigation, route }: EditBenchScreenProps) {
  const { greenhouse, sector, bench } = route.params;
  const { theme } = useTheme();

  const [plantCount, setPlantCount] = useState("");
  const [variety, setVariety] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [notes, setNotes] = useState("");
  const [placche, setPlacche] = useState("");
  const [saving, setSaving] = useState(false);
  const [showVarietyPicker, setShowVarietyPicker] = useState(false);

  useEffect(() => {
    const loadBench = async () => {
      const benchData = await storage.getBench(greenhouse, sector, bench);
      if (benchData) {
        setPlantCount(benchData.plantCount.toString());
        setVariety(benchData.variety);
        setPlantingDate(benchData.plantingDate);
        setNotes(benchData.notes);
        setPlacche(benchData.placche?.toString() || "0");
      }
    };
    loadBench();
  }, [greenhouse, sector, bench]);

  const handleSave = async () => {
    const count = parseInt(plantCount) || 0;
    const numPlacche = parseInt(placche) || 0;
    if (count < 0) {
      Alert.alert("Errore", "Il numero di piante non può essere negativo");
      return;
    }

    setSaving(true);
    try {
      await storage.saveBench({
        greenhouse,
        sector,
        benchNumber: bench,
        plantCount: count,
        variety,
        plantingDate,
        notes,
        placche: numPlacche,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare le modifiche. Riprova.");
      console.error("Error saving bench:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4) + "/" + cleaned.slice(4, 8);
    }
    setPlantingDate(formatted);
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.headerCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
          <Feather name="box" size={24} color="#FFFFFF" />
        </View>
        <View>
          <ThemedText type="h4">
            Serra {greenhouse} - Settore {sector}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            Bancale {bench}
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Numero di Piante
      </ThemedText>
      <Spacer height={Spacing.md} />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        value={plantCount}
        onChangeText={setPlantCount}
        keyboardType="number-pad"
      />

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Varietà
      </ThemedText>
      <Spacer height={Spacing.md} />
      <Pressable
        style={[
          styles.input,
          styles.pickerButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        onPress={() => setShowVarietyPicker(!showVarietyPicker)}
      >
        <ThemedText style={variety ? {} : { color: theme.textSecondary }}>
          {variety || "Seleziona varietà"}
        </ThemedText>
        <Feather
          name={showVarietyPicker ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      {showVarietyPicker ? (
        <View style={[styles.pickerList, { backgroundColor: theme.backgroundDefault }]}>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {PROTEACEAE_VARIETIES.map((v) => (
              <Pressable
                key={v}
                style={({ pressed }) => [
                  styles.pickerItem,
                  { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                  variety === v && { backgroundColor: theme.primary + "20" },
                ]}
                onPress={() => {
                  setVariety(v);
                  setShowVarietyPicker(false);
                }}
              >
                <ThemedText>{v}</ThemedText>
                {variety === v ? (
                  <Feather name="check" size={18} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Data Impianto
      </ThemedText>
      <Spacer height={Spacing.md} />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        placeholder="GG/MM/AAAA"
        placeholderTextColor={theme.textSecondary}
        value={plantingDate}
        onChangeText={handleDateChange}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Numero di Placche (1 placca = 6 piante)
      </ThemedText>
      <Spacer height={Spacing.md} />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        value={placche}
        onChangeText={setPlacche}
        keyboardType="number-pad"
      />
      <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.sm }}>
        Capienza totale: {parseInt(placche) * 6 || 0} piante
      </ThemedText>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Note
      </ThemedText>
      <Spacer height={Spacing.md} />
      <TextInput
        style={[
          styles.input,
          styles.notesInput,
          {
            backgroundColor: theme.backgroundDefault,
            color: theme.text,
            borderColor: theme.backgroundSecondary,
          },
        ]}
        placeholder="Aggiungi note sul bancale..."
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
          {saving ? "Salvataggio..." : "Salva Modifiche"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
    justifyContent: "center",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerList: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    maxHeight: 200,
    overflow: "hidden",
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  notesInput: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
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
