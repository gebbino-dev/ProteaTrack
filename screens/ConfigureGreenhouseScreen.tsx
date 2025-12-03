import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { GreenhouseConfig, Greenhouse, DEFAULT_GREENHOUSE_CONFIG } from "@/types";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type ConfigureGreenhouseScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function ConfigureGreenhouseScreen({
  navigation,
}: ConfigureGreenhouseScreenProps) {
  const { theme } = useTheme();
  const [config, setConfig] = useState<GreenhouseConfig>(DEFAULT_GREENHOUSE_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await storage.getGreenhouseConfig();
      setConfig(savedConfig);
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storage.saveGreenhouseConfig(config);
      Alert.alert("Salvato", "La configurazione è stata aggiornata");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare la configurazione");
    } finally {
      setSaving(false);
    }
  };

  const updateGreenhouseName = (index: number, name: string) => {
    const newConfig = { ...config };
    newConfig.greenhouses[index].customName = name || `Serra ${index + 1}`;
    setConfig(newConfig);
  };

  const updateSectorName = (ghIndex: number, sectorIndex: number, name: string) => {
    const newConfig = { ...config };
    if (!newConfig.greenhouses[ghIndex].sectors[sectorIndex]) return;
    newConfig.greenhouses[ghIndex].sectors[sectorIndex].customName = name;
    setConfig(newConfig);
  };

  const updateBenchName = (ghIndex: number, benchIndex: number, name: string) => {
    const newConfig = { ...config };
    if (!newConfig.greenhouses[ghIndex].benchNames) {
      newConfig.greenhouses[ghIndex].benchNames = [];
    }
    newConfig.greenhouses[ghIndex].benchNames![benchIndex] = name;
    setConfig(newConfig);
  };

  const addSector = (ghIndex: number) => {
    const newConfig = { ...config };
    const maxId = Math.max(
      ...newConfig.greenhouses[ghIndex].sectors.map((s) => s.id)
    );
    newConfig.greenhouses[ghIndex].sectors.push({ id: maxId + 1 });
    setConfig(newConfig);
  };

  const removeSector = (ghIndex: number, sectorIndex: number) => {
    Alert.alert(
      "Rimuovi Settore",
      "Sei sicuro? Verranno eliminati anche tutti i dati associati.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Rimuovi",
          style: "destructive",
          onPress: () => {
            const newConfig = { ...config };
            newConfig.greenhouses[ghIndex].sectors.splice(sectorIndex, 1);
            setConfig(newConfig);
          },
        },
      ]
    );
  };

  const addBench = (ghIndex: number) => {
    const newConfig = { ...config };
    const benchCount = newConfig.greenhouses[ghIndex].benchCount;
    newConfig.greenhouses[ghIndex].benchNames =
      newConfig.greenhouses[ghIndex].benchNames || [];
    newConfig.greenhouses[ghIndex].benchNames.push(`B${benchCount + 1}`);
    newConfig.greenhouses[ghIndex].benchCount++;
    setConfig(newConfig);
  };

  const removeBench = (ghIndex: number, benchIndex: number) => {
    Alert.alert(
      "Rimuovi Bancale",
      "Sei sicuro? Verranno eliminati anche tutti i dati associati.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Rimuovi",
          style: "destructive",
          onPress: () => {
            const newConfig = { ...config };
            newConfig.greenhouses[ghIndex].benchNames?.splice(benchIndex, 1);
            newConfig.greenhouses[ghIndex].benchCount--;
            setConfig(newConfig);
          },
        },
      ]
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundDefault,
      color: theme.text,
      borderColor: theme.backgroundSecondary,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView>
      <ThemedText type="h3" style={styles.title}>
        Configura Struttura Serre
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Campo Aperto
        </ThemedText>
        <View
          style={[
            styles.switchContainer,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ThemedText>Abilita campo aperto</ThemedText>
          <Switch
            value={config.hasOpenField}
            onValueChange={(value) =>
              setConfig({ ...config, hasOpenField: value })
            }
            trackColor={{ false: theme.backgroundSecondary, true: theme.primary }}
          />
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />

      {config.greenhouses.map((greenhouse, ghIndex) => (
        <View key={greenhouse.id} style={styles.greenhouseSection}>
          <View style={styles.sectionHeader}>
            <Feather name="home" size={20} color={theme.primary} />
            <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
              Serra {greenhouse.id}
            </ThemedText>
          </View>

          <Spacer height={Spacing.md} />

          <ThemedText style={styles.label}>Nome Serra</ThemedText>
          <TextInput
            style={inputStyle}
            value={greenhouse.customName || `Serra ${ghIndex + 1}`}
            onChangeText={(text) => updateGreenhouseName(ghIndex, text)}
            placeholder="Nome della serra"
            placeholderTextColor={theme.textSecondary}
          />

          <Spacer height={Spacing.lg} />

          <View style={styles.subsectionHeader}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Settori ({greenhouse.sectors.length})
            </ThemedText>
            <Pressable
              onPress={() => addSector(ghIndex)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <Spacer height={Spacing.md} />

          {greenhouse.sectors.map((sector, sectorIndex) => (
            <View key={sector.id} style={styles.itemContainer}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                value={sector.customName || `Settore ${sector.id}`}
                onChangeText={(text) =>
                  updateSectorName(ghIndex, sectorIndex, text)
                }
                placeholder={`Settore ${sector.id}`}
                placeholderTextColor={theme.textSecondary}
              />
              <Pressable
                onPress={() => removeSector(ghIndex, sectorIndex)}
                style={({ pressed }) => [
                  styles.removeButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="trash-2" size={16} color={theme.error} />
              </Pressable>
            </View>
          ))}

          <Spacer height={Spacing.lg} />

          <View style={styles.subsectionHeader}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Bancali ({greenhouse.benchCount})
            </ThemedText>
            <Pressable
              onPress={() => addBench(ghIndex)}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          <Spacer height={Spacing.md} />

          {(greenhouse.benchNames || Array.from({ length: greenhouse.benchCount }, (_, i) => `B${i + 1}`)).map(
            (benchName, benchIndex) => (
              <View key={benchIndex} style={styles.itemContainer}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  value={benchName}
                  onChangeText={(text) => updateBenchName(ghIndex, benchIndex, text)}
                  placeholder={`Bancale ${benchIndex + 1}`}
                  placeholderTextColor={theme.textSecondary}
                />
                <Pressable
                  onPress={() => removeBench(ghIndex, benchIndex)}
                  style={({ pressed }) => [
                    styles.removeButton,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="trash-2" size={16} color={theme.error} />
                </Pressable>
              </View>
            )
          )}

          <Spacer height={Spacing["2xl"]} />
        </View>
      ))}

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
        <Feather name="save" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {saving ? "Salvataggio..." : "Salva Configurazione"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.md,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  greenhouseSection: {
    marginBottom: Spacing["3xl"],
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  subsectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  removeButton: {
    padding: Spacing.sm,
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
