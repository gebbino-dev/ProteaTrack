import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { PlantRecord, PlantInventory } from "@/types";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type PlantInventoryScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function PlantInventoryScreen({ navigation }: PlantInventoryScreenProps) {
  const { theme } = useTheme();
  const [inventory, setInventory] = useState<PlantInventory>({ plants: [] });
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    variety: "",
    species: "",
    quantity: "0",
    arrivalDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useFocusEffect(
    useCallback(() => {
      const loadInventory = async () => {
        const inv = await storage.getPlantInventory();
        setInventory(inv);
      };
      loadInventory();
    }, [])
  );

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Apri il form direttamente per compilare manualmente
        setShowForm(true);
      }
    } catch (error) {
      Alert.alert("Errore", "Impossibile caricare l'immagine");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      if (result.assets && result.assets[0]) {
        Alert.alert(
          "Info",
          "Per PDF è consigliato fare una foto della prima pagina con la fotocamera"
        );
      }
    } catch (error) {
      Alert.alert("Errore", "Impossibile caricare il documento");
    }
  };

  const handleAddPlant = async () => {
    if (!formData.variety.trim()) {
      Alert.alert("Errore", "Inserisci la varietà della pianta");
      return;
    }

    try {
      await storage.savePlantRecord({
        variety: formData.variety,
        species: formData.species || undefined,
        quantity: parseInt(formData.quantity) || 0,
        arrivalDate: formData.arrivalDate,
        notes: formData.notes,
      });

      const updated = await storage.getPlantInventory();
      setInventory(updated);
      setFormData({
        variety: "",
        species: "",
        quantity: "0",
        arrivalDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowForm(false);
      Alert.alert("Successo", "Pianta aggiunta all'inventario");
    } catch (error) {
      Alert.alert("Errore", "Impossibile aggiungere la pianta");
    }
  };

  const handleDeletePlant = (id: string) => {
    Alert.alert("Rimuovi Pianta", "Sei sicuro?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Rimuovi",
        style: "destructive",
        onPress: async () => {
          try {
            await storage.deletePlantRecord(id);
            const updated = await storage.getPlantInventory();
            setInventory(updated);
          } catch (error) {
            Alert.alert("Errore", "Impossibile rimuovere la pianta");
          }
        },
      },
    ]);
  };

  const handleExportData = async () => {
    try {
      const csvData = await storage.exportPlantInventoryAsCSV();
      const fileName = `inventario-piante-${new Date().toISOString().split("T")[0]}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/csv",
          dialogTitle: "Esporta Inventario Piante",
        });
      } else {
        Alert.alert("Successo", "File creato in: " + filePath);
      }
    } catch (error) {
      Alert.alert("Errore", "Impossibile esportare i dati");
      console.error("Export error:", error);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundDefault,
      color: theme.text,
      borderColor: theme.backgroundSecondary,
    },
  ];

  // ===== SCHERMATA PRINCIPALE INVENTARIO =====
  return (
    <ScreenKeyboardAwareScrollView>
      <ThemedText type="h3" style={styles.title}>
        Inventario Piante
      </ThemedText>

      <Spacer height={Spacing.md} />

      {!showForm ? (
        <View>
          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                styles.mainButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => setShowForm(true)}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <ThemedText style={styles.addButtonText}>Aggiungi Manuale</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                styles.secondaryButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handlePickImage}
            >
              <Feather name="camera" size={20} color={theme.text} />
              <ThemedText style={{ color: theme.text }}>Da Foto</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                styles.secondaryButton,
                { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handlePickDocument}
            >
              <Feather name="file" size={20} color={theme.text} />
              <ThemedText style={{ color: theme.text }}>Da PDF</ThemedText>
            </Pressable>
          </View>

          {inventory.plants.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.exportButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleExportData}
            >
              <Feather name="download" size={20} color="#FFFFFF" />
              <ThemedText style={styles.exportButtonText}>Esporta CSV</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={[styles.formCard, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="body" style={styles.formLabel}>
            Varietà (obbligatorio)
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={formData.variety}
            onChangeText={(text) => setFormData({ ...formData, variety: text })}
            placeholder="Es. Leucospermum cordifolium"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText type="body" style={styles.formLabel}>
            Specie
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={formData.species}
            onChangeText={(text) => setFormData({ ...formData, species: text })}
            placeholder="Es. Proteaceae"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText type="body" style={styles.formLabel}>
            Numero Piante
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
          />

          <ThemedText type="body" style={styles.formLabel}>
            Data Arrivo
          </ThemedText>
          <TextInput
            style={inputStyle}
            value={formData.arrivalDate}
            onChangeText={(text) => setFormData({ ...formData, arrivalDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText type="body" style={styles.formLabel}>
            Note
          </ThemedText>
          <TextInput
            style={[inputStyle, { height: 80, textAlignVertical: "top" }]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Aggiungi note"
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          <View style={styles.formButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.formButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleAddPlant}
            >
              <ThemedText style={styles.formButtonText}>Salva</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.formButton,
                {
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => setShowForm(false)}
            >
              <ThemedText style={{ color: theme.text }}>Annulla</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      <Spacer height={Spacing.lg} />

      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        Piante in inventario: {inventory.plants.length}
      </ThemedText>

      <Spacer height={Spacing.md} />

      <ScrollView style={{ maxHeight: 500 }}>
        {inventory.plants.map((plant) => (
          <View
            key={plant.id}
            style={[styles.plantCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.plantInfo}>
              <ThemedText type="body">{plant.variety}</ThemedText>
              {plant.species && (
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {plant.species}
                </ThemedText>
              )}
              <ThemedText style={{ color: theme.primary, fontSize: 14, marginTop: Spacing.sm }}>
                {plant.quantity} piante
              </ThemedText>
              <ThemedText
                style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.sm }}
              >
                Arrivo: {plant.arrivalDate}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => handleDeletePlant(plant.id)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.md,
  },
  buttonGroup: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  mainButton: {
    marginBottom: 0,
  },
  secondaryButton: {
    marginBottom: 0,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  formCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  formLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.md,
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  formButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  formButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  plantCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  plantInfo: {
    flex: 1,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
