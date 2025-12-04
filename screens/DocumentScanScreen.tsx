import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  FlatList,
  Modal,
  Linking,
  ScrollView as RNScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { PROTEACEAE_VARIETIES } from "@/types";

type DocumentScanScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "DocumentScan">;
};

interface ScannedPlant {
  id: string;
  variety: string;
  species: string;
  quantity: number;
  selected: boolean;
}

export default function DocumentScanScreen({ navigation }: DocumentScanScreenProps) {
  const { theme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedPlants, setScannedPlants] = useState<ScannedPlant[]>([]);
  const [rawText, setRawText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<ScannedPlant | null>(null);
  const [editForm, setEditForm] = useState({ variety: "", species: "", quantity: "" });
  const [pasteText, setPasteText] = useState("");
  const [showPasteInput, setShowPasteInput] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const KNOWN_GENERA = [
    "SERRURIA", "LEUCOSPERMUM", "PROTEA", "TELOPEA", "BANKSIA", 
    "LEUCADENDRON", "GREVILLEA", "HAKEA", "ISOPOGON", "PETROPHILE",
    "DRYANDRA", "MIMETES", "AULAX", "PARANOMUS", "SPATALLA"
  ];

  const SUBTOTAL_PATTERNS = [
    /talea\s*radicata/i,
    /piantina\s*radicata/i,
    /quantit[àa]\s*spedita/i,
    /totale\s*generale/i,
    /subtotale/i,
  ];

  const SKIP_LINE_PATTERNS = [
    /^documento\s*(di\s*)?trasporto/i,
    /^causale/i,
    /^pagamento/i,
    /^agente/i,
    /^articolo\s+um\s+q\.?ta/i,
    /^indicazioni/i,
    /norme\s*e\s*regole/i,
    /c\.a\.c\./i,
    /smaltimento/i,
  ];

  const isSubtotalLine = (line: string): boolean => {
    for (const pattern of SUBTOTAL_PATTERNS) {
      if (pattern.test(line)) return true;
    }
    for (const genus of KNOWN_GENERA) {
      const subtotalPattern = new RegExp(`^${genus}\\s*,\\s*(talea|piantina)`, "i");
      if (subtotalPattern.test(line.trim())) return true;
    }
    return false;
  };

  const isSkipLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (trimmed.length < 3) return true;
    if (/^[\d\s.,€$%]+$/.test(trimmed)) return true;
    for (const pattern of SKIP_LINE_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
    return false;
  };

  const parseQuantity = (text: string): number => {
    const match = text.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)/);
    if (!match) return 0;
    const numStr = match[1].replace(/\./g, "").replace(/,/g, "");
    return parseInt(numStr) || 0;
  };

  const extractSpecies = (name: string): string => {
    const upperName = name.toUpperCase();
    for (const genus of KNOWN_GENERA) {
      if (upperName.includes(genus)) {
        return genus.charAt(0) + genus.slice(1).toLowerCase();
      }
    }
    const matchedVariety = PROTEACEAE_VARIETIES.find(v => 
      name.toLowerCase().includes(v.toLowerCase().split(" ")[0])
    );
    if (matchedVariety) {
      return matchedVariety.split(" ")[0];
    }
    return "Proteaceae";
  };

  const parseTextToPlants = (text: string): ScannedPlant[] => {
    const plants: ScannedPlant[] = [];
    const lines = text
      .split(/[\n\r]+/)
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(line => line.length > 0);

    for (const line of lines) {
      if (isSkipLine(line)) continue;
      if (isSubtotalLine(line)) continue;

      const ddtMatch = line.match(/^(\d{6,10})([A-Z][A-Za-z\s®©™''´`\-]+?)(?:\s+NR\s+|\s+)(\d{1,3}(?:[.,]\d{3})*|\d+)\s*$/i);
      if (ddtMatch) {
        const variety = ddtMatch[2].trim();
        const quantity = parseQuantity(ddtMatch[3]);
        
        if (variety.length >= 3 && quantity > 0) {
          plants.push({
            id: generateId(),
            variety: variety.substring(0, 60),
            species: extractSpecies(variety),
            quantity: Math.min(quantity, 99999),
            selected: true,
          });
          continue;
        }
      }

      const nrMatch = line.match(/(.+?)\s+NR\s+(\d{1,3}(?:[.,]\d{3})*|\d+)/i);
      if (nrMatch) {
        let variety = nrMatch[1].trim();
        const quantity = parseQuantity(nrMatch[2]);
        
        variety = variety.replace(/^\d{6,10}/, "").trim();
        
        if (variety.length >= 3 && quantity > 0 && !isSubtotalLine(variety)) {
          plants.push({
            id: generateId(),
            variety: variety.substring(0, 60),
            species: extractSpecies(variety),
            quantity: Math.min(quantity, 99999),
            selected: true,
          });
          continue;
        }
      }

      const simpleMatch = line.match(/^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*)\s*$/);
      if (simpleMatch) {
        let variety = simpleMatch[1].trim();
        const quantity = parseQuantity(simpleMatch[2]);
        
        variety = variety.replace(/^\d{6,10}/, "").trim();
        variety = variety.replace(/[-–—:,;.]+$/, "").trim();
        
        if (variety.length >= 3 && quantity > 0 && !isSubtotalLine(variety)) {
          plants.push({
            id: generateId(),
            variety: variety.substring(0, 60),
            species: extractSpecies(variety),
            quantity: Math.min(quantity, 99999),
            selected: true,
          });
        }
      }
    }

    return plants;
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        if (permission.status === "denied" && !permission.canAskAgain && Platform.OS !== "web") {
          try {
            await Linking.openSettings();
          } catch (e) {
            console.error("Cannot open settings:", e);
          }
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (permission.status === "denied" && !permission.canAskAgain && Platform.OS !== "web") {
          try {
            await Linking.openSettings();
          } catch (e) {
            console.error("Cannot open settings:", e);
          }
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "text/csv"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await processDocument(result.assets[0]);
      }
    } catch (error) {
      console.error("Document picker error:", error);
    }
  };

  const processImage = async (uri: string) => {
    if (Platform.OS !== "web") {
      setRawText("L'OCR delle immagini funziona solo nella versione web. Per scansionare immagini, apri l'app nel browser.");
      return;
    }
    
    setIsProcessing(true);
    setRawText("");
    setScannedPlants([]);

    try {
      const Tesseract = await import("tesseract.js");
      const { data } = await Tesseract.recognize(uri, "ita+eng", {
        logger: (m: any) => console.log("OCR:", m.status, m.progress),
      });
      
      setRawText(data.text);
      const plants = parseTextToPlants(data.text);
      setScannedPlants(plants);
    } catch (error) {
      console.error("OCR Error:", error);
      setRawText("Errore durante l'elaborazione dell'immagine. Riprova con un'immagine più chiara.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processDocument = async (doc: DocumentPicker.DocumentPickerAsset) => {
    setIsProcessing(true);
    setRawText("");
    setScannedPlants([]);

    try {
      if (doc.mimeType === "text/plain" || doc.mimeType === "text/csv") {
        const response = await fetch(doc.uri);
        const text = await response.text();
        setRawText(text);
        const plants = parseTextToPlants(text);
        setScannedPlants(plants);
      } else {
        setRawText("Formato file non supportato. Usa file .txt o .csv");
      }
    } catch (error) {
      console.error("Document processing error:", error);
      setRawText("Errore durante l'elaborazione del documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlantSelection = (id: string) => {
    setScannedPlants(plants =>
      plants.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleEditPlant = (plant: ScannedPlant) => {
    setEditingPlant(plant);
    setEditForm({
      variety: plant.variety,
      species: plant.species,
      quantity: plant.quantity.toString(),
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingPlant) return;
    if (!editForm.variety.trim()) return;

    const qty = parseInt(editForm.quantity);
    const validQty = isNaN(qty) || qty < 1 ? 1 : qty;

    setScannedPlants(plants =>
      plants.map(p =>
        p.id === editingPlant.id
          ? {
              ...p,
              variety: editForm.variety.trim(),
              species: editForm.species.trim() || "Proteaceae",
              quantity: validQty,
            }
          : p
      )
    );
    setShowEditModal(false);
    setEditingPlant(null);
  };

  const handleDeletePlant = (id: string) => {
    setScannedPlants(plants => plants.filter(p => p.id !== id));
  };

  const handleImportSelected = async () => {
    const selectedPlants = scannedPlants.filter(p => p.selected);
    if (selectedPlants.length === 0) return;

    const validPlants = selectedPlants.filter(p => p.variety.trim().length > 0);
    if (validPlants.length === 0) {
      setRawText("Nessuna pianta valida da importare. Assicurati che abbiano un nome varietà.");
      return;
    }

    setIsProcessing(true);
    try {
      let importedCount = 0;
      for (const plant of validPlants) {
        const quantity = plant.quantity < 1 ? 1 : plant.quantity;
        await storage.savePlantRecord({
          variety: plant.variety.trim(),
          species: plant.species.trim() || "Proteaceae",
          quantity,
          arrivalDate: new Date().toISOString().split("T")[0],
          notes: "Importato da scansione documento",
        });
        importedCount++;
      }
      navigation.goBack();
    } catch (error) {
      console.error("Import error:", error);
      setRawText("Errore durante l'importazione. Riprova.");
      setIsProcessing(false);
    }
  };

  const handlePasteText = () => {
    if (!pasteText.trim()) return;
    setRawText(pasteText.trim());
    const plants = parseTextToPlants(pasteText);
    setScannedPlants(plants);
    setShowPasteInput(false);
    if (plants.length === 0) {
      setRawText("Nessuna pianta trovata nel testo. Verifica il formato: Nome Pianta + Quantità");
    }
  };

  const handleClearAll = () => {
    setScannedPlants([]);
    setRawText("");
    setPasteText("");
    setShowPasteInput(false);
  };

  const selectedCount = scannedPlants.filter(p => p.selected).length;

  const renderPlantItem = ({ item }: { item: ScannedPlant }) => (
    <View
      style={[
        styles.plantRow,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.backgroundSecondary },
        !item.selected && styles.plantRowUnselected,
      ]}
    >
      <Pressable
        onPress={() => togglePlantSelection(item.id)}
        style={[
          styles.checkbox,
          { borderColor: theme.primary },
          item.selected && { backgroundColor: theme.primary },
        ]}
      >
        {item.selected ? <Feather name="check" size={16} color="#FFF" /> : null}
      </Pressable>

      <View style={styles.plantInfo}>
        <ThemedText style={styles.varietyText}>{item.variety}</ThemedText>
        <View style={styles.plantMeta}>
          <ThemedText style={[styles.speciesText, { color: theme.textSecondary }]}>
            {item.species}
          </ThemedText>
          <ThemedText style={[styles.quantityText, { color: theme.primary }]}>
            {item.quantity} pz
          </ThemedText>
        </View>
      </View>

      <View style={styles.plantActions}>
        <Pressable
          onPress={() => handleEditPlant(item)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="edit-2" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={() => handleDeletePlant(item.id)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: "#FF3B30", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="trash-2" size={18} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView>
        <View style={styles.headerRow}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Importa Piante
          </ThemedText>
          {(scannedPlants.length > 0 || rawText.length > 0) && (
            <Pressable onPress={handleClearAll} style={styles.clearButton}>
              <Feather name="x" size={18} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
                Pulisci
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.methodTabs}>
          <Pressable
            onPress={() => setShowPasteInput(false)}
            style={[
              styles.methodTab,
              !showPasteInput && { backgroundColor: theme.primary },
            ]}
          >
            <Feather 
              name="camera" 
              size={16} 
              color={!showPasteInput ? "#FFF" : theme.text} 
            />
            <ThemedText style={[
              styles.methodTabText,
              { color: !showPasteInput ? "#FFF" : theme.text }
            ]}>
              Scansiona
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setShowPasteInput(true)}
            style={[
              styles.methodTab,
              showPasteInput && { backgroundColor: theme.primary },
            ]}
          >
            <Feather 
              name="clipboard" 
              size={16} 
              color={showPasteInput ? "#FFF" : theme.text} 
            />
            <ThemedText style={[
              styles.methodTabText,
              { color: showPasteInput ? "#FFF" : theme.text }
            ]}>
              Incolla Lista
            </ThemedText>
          </Pressable>
        </View>

        {showPasteInput ? (
          <View style={styles.pasteSection}>
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Incolla il testo copiato da email, DDT o messaggi. Il sistema riconoscerà automaticamente nomi piante e quantità.
            </ThemedText>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              numberOfLines={8}
              placeholder="Incolla qui la lista piante..."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.pasteInput,
                { 
                  backgroundColor: theme.backgroundDefault, 
                  borderColor: theme.backgroundSecondary,
                  color: theme.text,
                },
              ]}
            />
            <Pressable
              onPress={handlePasteText}
              disabled={!pasteText.trim()}
              style={({ pressed }) => [
                styles.parseButton,
                {
                  backgroundColor: pasteText.trim() ? theme.primary : theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather 
                name="search" 
                size={20} 
                color={pasteText.trim() ? "#FFF" : theme.textSecondary} 
              />
              <ThemedText style={[
                styles.parseButtonText,
                { color: pasteText.trim() ? "#FFF" : theme.textSecondary }
              ]}>
                Analizza Testo
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
              Scatta una foto o carica un file (TXT/CSV) per estrarre automaticamente i dati delle piante
            </ThemedText>

            <View style={styles.uploadOptions}>
              {Platform.OS !== "web" && (
                <Pressable
                  onPress={handleTakePhoto}
                  style={({ pressed }) => [
                    styles.uploadButton,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="camera" size={24} color="#FFF" />
                  <ThemedText style={styles.uploadButtonText}>Scatta Foto</ThemedText>
                </Pressable>
              )}

              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [
                  styles.uploadButton,
                  { backgroundColor: theme.activityWatering, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="image" size={24} color="#FFF" />
                <ThemedText style={styles.uploadButtonText}>Galleria</ThemedText>
              </Pressable>

              <Pressable
                onPress={handlePickDocument}
                style={({ pressed }) => [
                  styles.uploadButton,
                  { backgroundColor: theme.activityTreatment, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="file-text" size={24} color="#FFF" />
                <ThemedText style={styles.uploadButtonText}>File</ThemedText>
              </Pressable>
            </View>
          </>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
              Elaborazione in corso...
            </ThemedText>
          </View>
        )}

        {rawText.length > 0 && !isProcessing && (
          <View style={styles.rawTextSection}>
            <ThemedText style={[styles.sectionSubtitle, { fontWeight: "600", fontSize: 16 }]}>
              Testo Estratto
            </ThemedText>
            <View style={[styles.rawTextBox, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.rawText, { color: theme.textSecondary }]}>
                {rawText.substring(0, 500)}
                {rawText.length > 500 ? "..." : ""}
              </ThemedText>
            </View>
          </View>
        )}

        {scannedPlants.length > 0 && !isProcessing && (
          <>
            <View style={styles.resultsHeader}>
              <ThemedText style={[styles.sectionSubtitle, { fontWeight: "600", fontSize: 16 }]}>
                Piante Rilevate ({scannedPlants.length})
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>
                {selectedCount} selezionate
              </ThemedText>
            </View>

            <FlatList
              data={scannedPlants}
              keyExtractor={item => item.id}
              renderItem={renderPlantItem}
              scrollEnabled={false}
              contentContainerStyle={styles.plantList}
            />

            <Pressable
              onPress={handleImportSelected}
              disabled={selectedCount === 0 || isProcessing}
              style={({ pressed }) => [
                styles.importButton,
                {
                  backgroundColor: selectedCount > 0 ? theme.primary : theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="download" size={20} color={selectedCount > 0 ? "#FFF" : theme.textSecondary} />
              <ThemedText
                style={[
                  styles.importButtonText,
                  { color: selectedCount > 0 ? "#FFF" : theme.textSecondary },
                ]}
              >
                Importa {selectedCount} Piante nell'Inventario
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScreenScrollView>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <RNScrollView
            style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Modifica Pianta</ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
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
                value={editForm.variety}
                onChangeText={t => setEditForm({ ...editForm, variety: t })}
                placeholder="Nome varietà"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={styles.label}>Specie/Genere</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={editForm.species}
                onChangeText={t => setEditForm({ ...editForm, species: t })}
                placeholder="Es. Proteaceae"
                placeholderTextColor={theme.textSecondary}
              />

              <ThemedText style={styles.label}>Quantità</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.backgroundSecondary },
                ]}
                value={editForm.quantity}
                onChangeText={t => setEditForm({ ...editForm, quantity: t })}
                placeholder="1"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText>Annulla</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>Salva</ThemedText>
              </Pressable>
            </View>
          </RNScrollView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  sectionSubtitle: {
    marginBottom: Spacing.sm,
  },
  methodTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  methodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  methodTabText: {
    fontWeight: "600",
    fontSize: 14,
  },
  pasteSection: {
    marginBottom: Spacing.lg,
  },
  pasteInput: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: Spacing.md,
  },
  parseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  parseButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  hint: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  uploadOptions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  uploadButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  uploadButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  rawTextSection: {
    marginBottom: Spacing.lg,
  },
  rawTextBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rawText: {
    fontSize: 12,
    lineHeight: 18,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  plantList: {
    gap: Spacing.sm,
  },
  plantRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  plantRowUnselected: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  plantInfo: {
    flex: 1,
  },
  varietyText: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 2,
  },
  plantMeta: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  speciesText: {
    fontSize: 13,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  plantActions: {
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
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  importButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "80%",
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
});
