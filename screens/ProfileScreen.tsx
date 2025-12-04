import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TextInput, Alert, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { UserSettings } from "@/types";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    companyName: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalPlants: 0,
    totalActivities: 0,
    benchesWithPlants: 0,
  });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const [savedSettings, statsData] = await Promise.all([
          storage.getSettings(),
          storage.getStats(),
        ]);
        setSettings(savedSettings);
        setStats({
          totalPlants: statsData.totalPlants,
          totalActivities: statsData.recentActivities.length,
          benchesWithPlants: statsData.benchesWithPlants,
        });
      };
      loadData();
    }, [])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await storage.saveSettings(settings);
      Alert.alert("Salvato", "Le impostazioni sono state salvate con successo");
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare le impostazioni");
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Cancella Tutti i Dati",
      "Questa azione cancellerà tutti i dati salvati nell'app. Sei sicuro?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Cancella",
          style: "destructive",
          onPress: async () => {
            try {
              await storage.clearAllData();
              setSettings({ name: "", companyName: "", location: "" });
              setStats({ totalPlants: 0, totalActivities: 0, benchesWithPlants: 0 });
              Alert.alert("Completato", "Tutti i dati sono stati cancellati");
            } catch (error) {
              Alert.alert("Errore", "Impossibile cancellare i dati");
            }
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
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {stats.totalPlants}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Piante
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.activityWatering }}>
              {stats.benchesWithPlants}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Bancali
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.activityTreatment }}>
              3
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Serre
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Informazioni Azienda
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Nome Responsabile
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.name}
          onChangeText={(text) => setSettings({ ...settings, name: text })}
          placeholder="Inserisci il tuo nome"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Nome Azienda
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.companyName}
          onChangeText={(text) => setSettings({ ...settings, companyName: text })}
          placeholder="Nome della tua azienda"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Località
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.location}
          onChangeText={(text) => setSettings({ ...settings, location: text })}
          placeholder="Dove si trova l'azienda"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

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
        <Feather name="save" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {saving ? "Salvataggio..." : "Salva Impostazioni"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Gestione Inventario
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("PlantInventory")}
      >
        <Feather name="database" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Gestisci Inventario Piante
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.activityWatering,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("DocumentScan")}
      >
        <Feather name="camera" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Scansiona Documento
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Configurazione Serre
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("ConfigureGreenhouse")}
      >
        <Feather name="settings" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Configura Struttura Serre
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Gestione Dati
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.dangerButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.error,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleClearData}
      >
        <Feather name="trash-2" size={20} color={theme.error} />
        <ThemedText style={[styles.dangerButtonText, { color: theme.error }]}>
          Cancella Tutti i Dati
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["2xl"]} />

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="info" size={20} color={theme.textSecondary} />
        <View style={styles.infoText}>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
            SerraManager v1.0.0
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
            Gestione serre per coltivazione Proteaceae
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  fieldContainer: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
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
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
});
