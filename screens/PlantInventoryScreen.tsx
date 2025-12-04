import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  Pressable,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Sharing from "expo-sharing";
import { Paths, File as ExpoFile } from "expo-file-system";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { ScrollView as RNScrollView } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { PlantRecord, PlantInventory } from "@/types";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type PlantInventoryScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function PlantInventoryScreen({ navigation }: PlantInventoryScreenProps) {
  const { theme } = useTheme();
  const { paddingBottom, paddingTop } = useScreenInsets();
  const [inventory, setInventory] = useState<PlantInventory>({ plants: [] });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmPlant, setDeleteConfirmPlant] = useState<PlantRecord | null>(null);
  
  const [formData, setFormData] = useState({
    variety: "",
    species: "",
    quantity: "",
    arrivalDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const loadInventory = useCallback(async () => {
    console.log("LOAD: Caricamento inventario...");
    try {
      const inv = await storage.getPlantInventory();
      console.log("LOAD: Inventario caricato, piante:", inv.plants.length);
      setInventory(inv);
    } catch (error) {
      console.error("LOAD: Errore:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  const resetForm = () => {
    setFormData({
      variety: "",
      species: "",
      quantity: "",
      arrivalDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditingPlant(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleSavePlant = async () => {
    console.log("SAVE: Inizio salvataggio...");
    if (!formData.variety.trim()) {
      Alert.alert("Errore", "Inserisci la varietà");
      return;
    }

    try {
      if (editingPlant) {
        console.log("SAVE: Aggiornamento pianta esistente:", editingPlant.id);
        await storage.deletePlantRecord(editingPlant.id);
      }
      
      const record = await storage.savePlantRecord({
        variety: formData.variety.trim(),
        species: formData.species.trim() || undefined,
        quantity: parseInt(formData.quantity) || 0,
        arrivalDate: formData.arrivalDate,
        notes: formData.notes.trim(),
      });
      console.log("SAVE: Record salvato:", record.id);
      
      await loadInventory();
      handleCloseModal();
    } catch (error) {
      console.error("SAVE: Errore:", error);
      Alert.alert("Errore", "Impossibile salvare");
    }
  };

  const handleDeletePlant = (plant: PlantRecord) => {
    console.log("DELETE: Richiesta eliminazione per:", plant.id, plant.variety);
    setDeleteConfirmPlant(plant);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmPlant) return;
    console.log("DELETE: Confermato, elimino...", deleteConfirmPlant.id);
    try {
      await storage.deletePlantRecord(deleteConfirmPlant.id);
      console.log("DELETE: Eliminato con successo");
      setDeleteConfirmPlant(null);
      await loadInventory();
    } catch (error) {
      console.error("DELETE: Errore:", error);
      setDeleteConfirmPlant(null);
    }
  };

  const cancelDelete = () => {
    console.log("DELETE: Annullato");
    setDeleteConfirmPlant(null);
  };

  const handleEditPlant = (plant: PlantRecord) => {
    console.log("EDIT: Apertura modifica per:", plant.id);
    setEditingPlant(plant);
    setFormData({
      variety: plant.variety,
      species: plant.species || "",
      quantity: plant.quantity.toString(),
      arrivalDate: plant.arrivalDate,
      notes: plant.notes || "",
    });
    setShowAddModal(true);
  };

  const handleExport = async () => {
    console.log("EXPORT: Inizio esportazione...");
    try {
      const csv = await storage.exportPlantInventoryAsCSV();
      const fileName = `inventario_${new Date().toISOString().split("T")[0]}.csv`;
      
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log("EXPORT: Download web completato");
      } else {
        const file = new ExpoFile(Paths.cache, fileName);
        await file.write(csv);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
        }
        console.log("EXPORT: Condivisione completata");
      }
    } catch (error) {
      console.error("EXPORT: Errore:", error);
      Alert.alert("Errore", "Impossibile esportare");
    }
  };

  const groupedPlants = inventory.plants.reduce((acc, plant) => {
    const key = plant.species || "Senza Specie";
    if (!acc[key]) acc[key] = [];
    acc[key].push(plant);
    return acc;
  }, {} as Record<string, PlantRecord[]>);

  const sections = Object.entries(groupedPlants).sort(([a], [b]) => a.localeCompare(b));

  const totalPlants = inventory.plants.reduce((sum, p) => sum + p.quantity, 0);

  const renderPlantRow = ({ item: plant }: { item: PlantRecord }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.backgroundSecondary },
      ]}
    >
      <View style={styles.rowContent}>
        <ThemedText style={styles.varietyText}>{plant.variety}</ThemedText>
        <View style={styles.rowDetails}>
          <ThemedText style={[styles.quantityText, { color: theme.primary }]}>
            {plant.quantity} pz
          </ThemedText>
          <ThemedText style={[styles.dateText, { color: theme.textSecondary }]}>
            {plant.arrivalDate}
          </ThemedText>
        </View>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          onPress={() => handleEditPlant(plant)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="edit-2" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={() => handleDeletePlant(plant)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: "rgba(255,59,48,0.15)", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </View>
    </View>
  );

  const renderSection = ({ item }: { item: [string, PlantRecord[]] }) => {
    const [species, plants] = item;
    const sectionTotal = plants.reduce((sum, p) => sum + p.quantity, 0);
    
    return (
      <View style={styles.section}>
        <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText style={styles.sectionTitle}>{species}</ThemedText>
          <ThemedText style={[styles.sectionCount, { color: theme.primary }]}>
            {sectionTotal} piante
          </ThemedText>
        </View>
        {plants.map((plant) => (
          <View key={plant.id}>{renderPlantRow({ item: plant })}</View>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop, paddingBottom }]}>
      <View style={styles.header}>
        <View>
          <ThemedText type="h3">Inventario Piante</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {inventory.plants.length} varietà - {totalPlants} piante totali
          </ThemedText>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={handleOpenAddModal}
          style={({ pressed }) => [
            styles.toolbarButton,
            styles.primaryButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="plus" size={20} color="#FFF" />
          <ThemedText style={styles.buttonTextWhite}>Aggiungi</ThemedText>
        </Pressable>

        {inventory.plants.length > 0 && (
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.toolbarButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="download" size={20} color={theme.text} />
            <ThemedText>Esporta</ThemedText>
          </Pressable>
        )}
      </View>

      {inventory.plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            Nessuna pianta nell'inventario
          </ThemedText>
          <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
            Clicca "Aggiungi" per iniziare
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={([species]) => species}
          renderItem={renderSection}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <RNScrollView
            style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">
                {editingPlant ? "Modifica Pianta" : "Nuova Pianta"}
              </ThemedText>
              <Pressable onPress={handleCloseModal}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <ThemedText style={styles.label}>Varietà *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={formData.variety}
                onChangeText={(t) => setFormData({ ...formData, variety: t })}
                placeholder="Es. Leucospermum cordifolium"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={styles.label}>Specie/Genere</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={formData.species}
                onChangeText={(t) => setFormData({ ...formData, species: t })}
                placeholder="Es. Proteaceae"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={styles.label}>Quantità</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={formData.quantity}
                onChangeText={(t) => setFormData({ ...formData, quantity: t })}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />

              <ThemedText style={styles.label}>Data Arrivo</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={formData.arrivalDate}
                onChangeText={(t) => setFormData({ ...formData, arrivalDate: t })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={styles.label}>Note</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={formData.notes}
                onChangeText={(t) => setFormData({ ...formData, notes: t })}
                placeholder="Note opzionali"
                placeholderTextColor={theme.textSecondary}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText>Annulla</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSavePlant}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.primaryButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={styles.buttonTextWhite}>
                  {editingPlant ? "Salva Modifiche" : "Aggiungi"}
                </ThemedText>
              </Pressable>
            </View>
          </RNScrollView>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmPlant !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: theme.backgroundRoot }]}>
            <Feather name="alert-triangle" size={48} color="#FF3B30" style={styles.deleteIcon} />
            <ThemedText type="h4" style={styles.deleteTitle}>Elimina Pianta</ThemedText>
            <ThemedText style={[styles.deleteMessage, { color: theme.textSecondary }]}>
              Vuoi eliminare "{deleteConfirmPlant?.variety}"?
            </ThemedText>
            <View style={styles.deleteActions}>
              <Pressable
                onPress={cancelDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText>Annulla</ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={({ pressed }) => [
                  styles.deleteButton,
                  { backgroundColor: "#FF3B30", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={styles.buttonTextWhite}>Elimina</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  toolbar: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  primaryButton: {},
  buttonTextWhite: {
    color: "#FFF",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
  },
  emptyHint: {
    fontSize: 14,
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  rowContent: {
    flex: 1,
  },
  varietyText: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: Spacing.xs,
  },
  rowDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  quantityText: {
    fontWeight: "600",
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
  },
  rowActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "90%",
  },
  modalContentContainer: {
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: Spacing.sm,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  deleteModalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  deleteIcon: {
    marginBottom: Spacing.md,
  },
  deleteTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  deleteMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  deleteActions: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  deleteButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
