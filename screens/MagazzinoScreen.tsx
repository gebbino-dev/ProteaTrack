import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl, Modal, ScrollView, Alert, Platform, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  pendingInvoiceStore, 
  PendingInvoiceLine, 
  ItemCategory, 
  CATEGORY_CONFIG 
} from "@/utils/pendingInvoiceStore";
import { inventoryStore, MaterialRecord } from "@/utils/inventoryStore";
import { storage } from "@/utils/storage";
import { plantWarehouse, GenusGroup, PlantLot } from "@/utils/plantWarehouse";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";
import { PlantRecord } from "@/types";
import { processLineToInventory } from "@/services/applyPendingLinesToInventory";
import { classificaTutteLeRighe } from "@/utils/autoCategorizationService";

type MagazzinoScreenProps = {
  navigation: NativeStackNavigationProp<LavoroStackParamList, "Lavoro">;
};

type InventoryTab = 'piante' | 'materiali';
type MaterialType = 'vasi' | 'terriccio' | 'materiale' | 'altro';

const GENUS_COLORS: Record<string, string> = {
  'Protea': '#E91E63',
  'Leucospermum': '#FF9800',
  'Leucadendron': '#4CAF50',
  'Serruria': '#9C27B0',
  'Telopea': '#F44336',
  'Banksia': '#795548',
  'Grevillea': '#00BCD4',
  'Altro': '#607D8B',
};

const MATERIAL_TYPE_CONFIG: Record<MaterialType, { label: string; color: string; icon: string }> = {
  'vasi': { label: 'Vasi', color: '#FF9800', icon: 'box' },
  'terriccio': { label: 'Terriccio', color: '#795548', icon: 'layers' },
  'materiale': { label: 'Materiale', color: '#607D8B', icon: 'tool' },
  'altro': { label: 'Altro', color: '#9E9E9E', icon: 'more-horizontal' },
};

export default function MagazzinoScreen({ navigation }: MagazzinoScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [genusGroups, setGenusGroups] = useState<GenusGroup[]>([]);
  const [allPlants, setAllPlants] = useState<PlantRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [pendingLines, setPendingLines] = useState<PendingInvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<InventoryTab>('piante');
  const [expandedGenus, setExpandedGenus] = useState<Set<string>>(new Set());
  const [selectedLine, setSelectedLine] = useState<PendingInvoiceLine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [materialFilter, setMaterialFilter] = useState<MaterialType | null>(null);
  
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  
  const [plantModalVisible, setPlantModalVisible] = useState(false);
  const [editingPlant, setEditingPlant] = useState<PlantRecord | null>(null);
  const [plantForm, setPlantForm] = useState({
    variety: '',
    quantity: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [reclassifying, setReclassifying] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [groups, mats, pending, inventory] = await Promise.all([
        plantWarehouse.getGroupedByGenus(),
        inventoryStore.getMaterials(),
        pendingInvoiceStore.getUnprocessedLines(),
        storage.getPlantInventory(),
      ]);

      setGenusGroups(groups);
      setMaterials(mats);
      setPendingLines(pending);
      setAllPlants(inventory.plants);

      if (groups.length > 0 && expandedGenus.size === 0) {
        setExpandedGenus(new Set([groups[0].genus]));
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleToggleGenus = (genus: string) => {
    setExpandedGenus(prev => {
      const next = new Set(prev);
      if (next.has(genus)) {
        next.delete(genus);
      } else {
        next.add(genus);
      }
      return next;
    });
  };

  const handleChangeCategory = async (newCategory: ItemCategory) => {
    if (!selectedLine) return;
    
    try {
      await pendingInvoiceStore.updateLine(selectedLine.id, {
        assignedCategory: newCategory,
      });
      setModalVisible(false);
      setSelectedLine(null);
      loadData();
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleChangeMaterialType = async (newType: MaterialType) => {
    if (!selectedMaterial) return;
    
    try {
      await inventoryStore.updateMaterial(selectedMaterial.id, { type: newType });
      setMaterialModalVisible(false);
      setSelectedMaterial(null);
      loadData();
    } catch (error) {
      console.error("Error updating material type:", error);
    }
  };

  const handleConfirmLine = async (line: PendingInvoiceLine) => {
    const confirmAction = async () => {
      try {
        const success = await processLineToInventory(line);
        if (success) {
          await pendingInvoiceStore.markAsProcessed(line.id);
          loadData();
        }
      } catch (error) {
        console.error("Error confirming line:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Confermare "${line.description}" come ${CATEGORY_CONFIG[line.assignedCategory].label}?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Conferma Assegnazione",
        `Confermare "${line.description}" come ${CATEGORY_CONFIG[line.assignedCategory].label}?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Conferma", onPress: confirmAction },
        ]
      );
    }
  };

  const handleDeleteLine = async (line: PendingInvoiceLine) => {
    const deleteAction = async () => {
      try {
        await pendingInvoiceStore.deleteLine(line.id);
        loadData();
      } catch (error) {
        console.error("Error deleting line:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Eliminare "${line.description}"?`)) {
        deleteAction();
      }
    } else {
      Alert.alert(
        "Elimina Riga",
        `Eliminare "${line.description}"?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: deleteAction },
        ]
      );
    }
  };

  const handleDeleteMaterial = async (material: MaterialRecord) => {
    const deleteAction = async () => {
      try {
        await inventoryStore.deleteMaterial(material.id);
        loadData();
      } catch (error) {
        console.error("Error deleting material:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Eliminare "${material.name}"?`)) {
        deleteAction();
      }
    } else {
      Alert.alert(
        "Elimina Materiale",
        `Eliminare "${material.name}"?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: deleteAction },
        ]
      );
    }
  };

  const resetPlantForm = () => {
    setPlantForm({
      variety: '',
      quantity: '',
      arrivalDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setEditingPlant(null);
  };

  const handleOpenPlantModal = () => {
    resetPlantForm();
    setPlantModalVisible(true);
  };

  const handleEditPlant = (plant: PlantRecord) => {
    setEditingPlant(plant);
    setPlantForm({
      variety: plant.variety,
      quantity: plant.quantity.toString(),
      arrivalDate: plant.arrivalDate,
      notes: plant.notes || '',
    });
    setPlantModalVisible(true);
  };

  const handleSavePlant = async () => {
    if (!plantForm.variety.trim()) {
      Alert.alert("Errore", "Inserisci la varieta");
      return;
    }

    try {
      if (editingPlant) {
        await storage.deletePlantRecord(editingPlant.id);
      }
      
      await storage.savePlantRecord({
        variety: plantForm.variety.trim(),
        quantity: parseInt(plantForm.quantity) || 0,
        arrivalDate: plantForm.arrivalDate,
        notes: plantForm.notes.trim(),
      });
      
      setPlantModalVisible(false);
      resetPlantForm();
      loadData();
    } catch (error) {
      console.error("Error saving plant:", error);
      Alert.alert("Errore", "Impossibile salvare");
    }
  };

  const handleDeletePlant = async (plant: PlantRecord) => {
    const deleteAction = async () => {
      try {
        await storage.deletePlantRecord(plant.id);
        loadData();
      } catch (error) {
        console.error("Error deleting plant:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Eliminare "${plant.variety}"?`)) {
        deleteAction();
      }
    } else {
      Alert.alert(
        "Elimina Pianta",
        `Eliminare "${plant.variety}"?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: deleteAction },
        ]
      );
    }
  };

  const totalPlants = genusGroups.reduce((sum, g) => sum + g.totalPlants, 0);
  const totalMaterials = materials.length;

  const materialTypes: MaterialType[] = ['vasi', 'terriccio', 'materiale', 'altro'];
  const getMaterialCount = (type: MaterialType) => materials.filter(m => m.type === type).length;
  
  const filteredMaterials = materialFilter 
    ? materials.filter(m => m.type === materialFilter)
    : materials;

  const categories = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

  const pendingPlants = pendingLines.filter(l => l.assignedCategory === 'piante' || l.assignedCategory === 'semi');
  const materialCategories = ['vasi', 'terriccio', 'materiale', 'altro'];
  const pendingMaterials = pendingLines.filter(l => materialCategories.includes(l.assignedCategory));

  const handleReclassifyAll = async () => {
    setReclassifying(true);
    try {
      const stats = await classificaTutteLeRighe();
      await loadData();
      
      const message = `Riclassificate ${stats.righeClassificate} righe:\n` +
        `- Piante: ${stats.perCategoria.piante}\n` +
        `- Semi: ${stats.perCategoria.semi}\n` +
        `- Terriccio: ${stats.perCategoria.terriccio}\n` +
        `- Vasi: ${stats.perCategoria.vasi}\n` +
        `- Fitofarmaci: ${stats.perCategoria.fitofarmaci}\n` +
        `- Fertilizzanti: ${stats.perCategoria.fertilizzanti}\n` +
        `- Utenze: ${stats.perCategoria.utenze}\n` +
        `- Altro: ${stats.perCategoria.materiale_generico}`;
      
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Riclassificazione Completata', message);
      }
    } catch (error) {
      console.error('Errore riclassificazione:', error);
      const errMsg = `Errore durante la riclassificazione: ${error}`;
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Errore', errMsg);
      }
    } finally {
      setReclassifying(false);
    }
  };

  const handleConfirmAllPending = async (lines: PendingInvoiceLine[]) => {
    const confirmAction = async () => {
      let successCount = 0;
      for (const line of lines) {
        try {
          const success = await processLineToInventory(line);
          if (success) {
            await pendingInvoiceStore.markAsProcessed(line.id);
            successCount++;
          }
        } catch (error) {
          console.error("Error confirming line:", error);
        }
      }
      loadData();
      if (Platform.OS !== 'web') {
        Alert.alert("Completato", `${successCount} righe confermate con successo`);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Confermare tutte le ${lines.length} righe?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Conferma Tutto",
        `Confermare tutte le ${lines.length} righe?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Conferma", onPress: confirmAction },
        ]
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <Pressable
            style={[
              styles.statCard, 
              { 
                backgroundColor: selectedTab === 'piante' ? theme.primary + '20' : theme.backgroundDefault,
                borderWidth: selectedTab === 'piante' ? 2 : 0,
                borderColor: theme.primary,
              }
            ]}
            onPress={() => setSelectedTab('piante')}
          >
            {pendingPlants.length > 0 ? (
              <View style={[styles.pendingBadge, { backgroundColor: theme.warning }]}>
                <ThemedText style={styles.pendingBadgeText}>{pendingPlants.length}</ThemedText>
              </View>
            ) : null}
            <Feather name="sun" size={20} color={theme.primary} />
            <ThemedText type="h3" style={styles.statValue}>
              {totalPlants.toLocaleString()}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Piante/Semi
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.statCard, 
              { 
                backgroundColor: selectedTab === 'materiali' ? theme.primary + '20' : theme.backgroundDefault,
                borderWidth: selectedTab === 'materiali' ? 2 : 0,
                borderColor: theme.primary,
              }
            ]}
            onPress={() => setSelectedTab('materiali')}
          >
            {pendingMaterials.length > 0 ? (
              <View style={[styles.pendingBadge, { backgroundColor: theme.warning }]}>
                <ThemedText style={styles.pendingBadgeText}>{pendingMaterials.length}</ThemedText>
              </View>
            ) : null}
            <Feather name="package" size={20} color="#795548" />
            <ThemedText type="h3" style={styles.statValue}>
              {totalMaterials}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Materiali
            </ThemedText>
          </Pressable>
        </View>

        <Spacer height={Spacing.md} />
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.filterButton, { backgroundColor: theme.primary + '15', flex: 1 }]}
            onPress={() => navigation.navigate('CategoriaFilter')}
          >
            <Feather name="filter" size={18} color={theme.primary} />
            <ThemedText style={{ flex: 1, marginLeft: Spacing.sm, color: theme.primary }}>
              Filtra categorie
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.primary} />
          </Pressable>
          <Pressable
            style={[styles.filterButton, { backgroundColor: theme.success + '15', flex: 1 }]}
            onPress={() => navigation.navigate('InventorySnapshot')}
          >
            <Feather name="bar-chart-2" size={18} color={theme.success} />
            <ThemedText style={{ flex: 1, marginLeft: Spacing.sm, color: theme.success }}>
              Giacenze
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.success} />
          </Pressable>
        </View>

        {pendingLines.length > 0 ? (
          <>
            <Spacer height={Spacing.sm} />
            <Pressable
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: reclassifying ? theme.warning + '30' : theme.warning + '15',
                  opacity: reclassifying ? 0.7 : 1,
                }
              ]}
              onPress={handleReclassifyAll}
              disabled={reclassifying}
            >
              <Feather name="refresh-cw" size={18} color={theme.warning} />
              <ThemedText style={{ flex: 1, marginLeft: Spacing.sm, color: theme.warning }}>
                {reclassifying ? 'Riclassificazione in corso...' : `Riclassifica Tutte (${pendingLines.length})`}
              </ThemedText>
              <Feather name="zap" size={20} color={theme.warning} />
            </Pressable>
          </>
        ) : null}

        <Spacer height={Spacing.md} />

        {selectedTab === 'piante' ? (
          <>
            {pendingPlants.length > 0 ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.warning }]}>
                      {pendingPlants.length} Righe in Attesa
                    </ThemedText>
                    <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                      Conferma per aggiungere a Piante/Semi
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.addButton, { backgroundColor: theme.warning }]}
                    onPress={() => handleConfirmAllPending(pendingPlants)}
                  >
                    <Feather name="check-circle" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.addButtonText}>Conferma Tutto</ThemedText>
                  </Pressable>
                </View>
                <Spacer height={Spacing.sm} />
                {pendingPlants.map((line) => {
                  const catConfig = CATEGORY_CONFIG[line.assignedCategory];
                  return (
                    <View
                      key={line.id}
                      style={[styles.pendingCard, { backgroundColor: theme.backgroundDefault }]}
                    >
                      <View style={styles.lineHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
                          <Feather name={catConfig.icon as any} size={14} color={catConfig.color} />
                          <ThemedText style={[styles.categoryText, { color: catConfig.color }]}>
                            {catConfig.label}
                          </ThemedText>
                        </View>
                      </View>
                      <Spacer height={Spacing.sm} />
                      <ThemedText style={styles.lineDescription} numberOfLines={2}>
                        {line.description}
                      </ThemedText>
                      <ThemedText style={[styles.invoiceRef, { color: theme.textSecondary }]}>
                        Qta: {line.quantity} - {line.totalPrice.toFixed(2)} EUR
                      </ThemedText>
                      <Spacer height={Spacing.md} />
                      <View style={styles.actionRow}>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                          onPress={() => {
                            setSelectedLine(line);
                            setModalVisible(true);
                          }}
                        >
                          <Feather name="edit-2" size={16} color={theme.text} />
                          <ThemedText style={styles.actionText}>Cambia</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.success + '20' }]}
                          onPress={() => handleConfirmLine(line)}
                        >
                          <Feather name="check" size={16} color={theme.success} />
                          <ThemedText style={[styles.actionText, { color: theme.success }]}>Conferma</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
                          onPress={() => handleDeleteLine(line)}
                        >
                          <Feather name="trash-2" size={16} color={theme.error} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Spacer height={Spacing.lg} />
              </>
            ) : null}

            <View style={styles.sectionHeaderRow}>
              <View>
                <ThemedText type="h4" style={styles.sectionTitle}>
                  Piante e Semi per Genere
                </ThemedText>
                <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Premi su una varieta per modificare
                </ThemedText>
              </View>
              <Pressable
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenPlantModal}
              >
                <Feather name="plus" size={18} color="#FFFFFF" />
                <ThemedText style={styles.addButtonText}>Aggiungi</ThemedText>
              </Pressable>
            </View>
            <Spacer height={Spacing.md} />

            {genusGroups.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
                <Feather
                  name="sun"
                  size={48}
                  color={theme.tabIconDefault}
                  style={styles.emptyIcon}
                />
                <ThemedText style={styles.emptyText}>
                  Nessuna pianta in magazzino
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  Importa fatture con categoria "Acquisto Piante"
                </ThemedText>
              </View>
            ) : (
              genusGroups.map((group) => {
                const isExpanded = expandedGenus.has(group.genus);
                const genusColor = GENUS_COLORS[group.genus] || theme.primary;
                
                return (
                  <View 
                    key={group.genus} 
                    style={[styles.genusCard, { backgroundColor: theme.backgroundDefault }]}
                  >
                    <Pressable
                      onPress={() => handleToggleGenus(group.genus)}
                      style={styles.genusHeader}
                    >
                      <View style={[styles.genusIcon, { backgroundColor: genusColor }]}>
                        <Feather name="sun" size={18} color="#FFFFFF" />
                      </View>
                      <View style={styles.genusInfo}>
                        <ThemedText type="h4">{group.genus}</ThemedText>
                        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                          {group.varieties.length} varieta
                        </ThemedText>
                      </View>
                      <View style={styles.genusTotalBadge}>
                        <ThemedText style={[styles.genusTotalText, { color: genusColor }]}>
                          {group.totalPlants.toLocaleString()}
                        </ThemedText>
                        <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>disponibili</ThemedText>
                      </View>
                      <Feather 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={22} 
                        color={theme.textSecondary} 
                      />
                    </Pressable>
                    
                    {isExpanded ? (
                      <View style={styles.varietiesList}>
                        {group.varieties.map((lot, index) => {
                          const matchingPlants = allPlants.filter(p => 
                            p.variety.toLowerCase().includes(lot.variety.toLowerCase()) ||
                            lot.variety.toLowerCase().includes(p.variety.toLowerCase().substring(0, 10))
                          );
                          const firstMatchingPlant = matchingPlants[0];
                          
                          return (
                            <Pressable 
                              key={`${lot.variety}-${index}`}
                              style={[styles.varietyRow, { backgroundColor: theme.backgroundSecondary }]}
                              onPress={() => firstMatchingPlant && handleEditPlant(firstMatchingPlant)}
                            >
                              <View style={styles.varietyInfo}>
                                <ThemedText style={styles.varietyName}>{lot.variety}</ThemedText>
                                <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
                                  Totale: {lot.totalQuantity.toLocaleString()} | Distribuite: {lot.distributedQuantity.toLocaleString()}
                                </ThemedText>
                                {lot.sources.length > 0 ? (
                                  <ThemedText style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                                    Arrivo: {lot.sources[0].arrivalDate}
                                  </ThemedText>
                                ) : null}
                              </View>
                              <View style={styles.varietyActions}>
                                <View style={styles.quantityBadge}>
                                  <ThemedText style={[
                                    styles.quantityText,
                                    { color: lot.availableQuantity > 0 ? theme.primary : theme.textSecondary }
                                  ]}>
                                    {lot.availableQuantity.toLocaleString()}
                                  </ThemedText>
                                  <ThemedText style={{ color: theme.textSecondary, fontSize: 9 }}>disp.</ThemedText>
                                </View>
                                {firstMatchingPlant ? (
                                  <Pressable
                                    style={[styles.smallActionButton, { backgroundColor: theme.error + '15' }]}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleDeletePlant(firstMatchingPlant);
                                    }}
                                  >
                                    <Feather name="trash-2" size={14} color={theme.error} />
                                  </Pressable>
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            {pendingMaterials.length > 0 ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.warning }]}>
                      {pendingMaterials.length} Righe in Attesa
                    </ThemedText>
                    <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                      Conferma per aggiungere a Materiali
                    </ThemedText>
                  </View>
                  <Pressable
                    style={[styles.addButton, { backgroundColor: theme.warning }]}
                    onPress={() => handleConfirmAllPending(pendingMaterials)}
                  >
                    <Feather name="check-circle" size={18} color="#FFFFFF" />
                    <ThemedText style={styles.addButtonText}>Conferma Tutto</ThemedText>
                  </Pressable>
                </View>
                <Spacer height={Spacing.sm} />
                {pendingMaterials.map((line) => {
                  const catConfig = CATEGORY_CONFIG[line.assignedCategory];
                  return (
                    <View
                      key={line.id}
                      style={[styles.pendingCard, { backgroundColor: theme.backgroundDefault }]}
                    >
                      <View style={styles.lineHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
                          <Feather name={catConfig.icon as any} size={14} color={catConfig.color} />
                          <ThemedText style={[styles.categoryText, { color: catConfig.color }]}>
                            {catConfig.label}
                          </ThemedText>
                        </View>
                      </View>
                      <Spacer height={Spacing.sm} />
                      <ThemedText style={styles.lineDescription} numberOfLines={2}>
                        {line.description}
                      </ThemedText>
                      <ThemedText style={[styles.invoiceRef, { color: theme.textSecondary }]}>
                        Qta: {line.quantity} - {line.totalPrice.toFixed(2)} EUR
                      </ThemedText>
                      <Spacer height={Spacing.md} />
                      <View style={styles.actionRow}>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                          onPress={() => {
                            setSelectedLine(line);
                            setModalVisible(true);
                          }}
                        >
                          <Feather name="edit-2" size={16} color={theme.text} />
                          <ThemedText style={styles.actionText}>Cambia</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.success + '20' }]}
                          onPress={() => handleConfirmLine(line)}
                        >
                          <Feather name="check" size={16} color={theme.success} />
                          <ThemedText style={[styles.actionText, { color: theme.success }]}>Conferma</ThemedText>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, { backgroundColor: theme.error + '20' }]}
                          onPress={() => handleDeleteLine(line)}
                        >
                          <Feather name="trash-2" size={16} color={theme.error} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Spacer height={Spacing.lg} />
              </>
            ) : null}

            <ThemedText type="h4" style={styles.sectionTitle}>
              Materiali per Tipo
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Premi su un materiale per cambiare categoria
            </ThemedText>
            <Spacer height={Spacing.sm} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <Pressable
                  onPress={() => setMaterialFilter(null)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: !materialFilter ? theme.primary : theme.backgroundDefault }
                  ]}
                >
                  <ThemedText style={{ color: !materialFilter ? '#FFFFFF' : theme.text, fontSize: 13 }}>
                    Tutti ({totalMaterials})
                  </ThemedText>
                </Pressable>
                {materialTypes.map((type) => {
                  const count = getMaterialCount(type);
                  const config = MATERIAL_TYPE_CONFIG[type];
                  const isActive = materialFilter === type;
                  
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setMaterialFilter(isActive ? null : type)}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isActive ? config.color : theme.backgroundDefault }
                      ]}
                    >
                      <ThemedText style={{ color: isActive ? '#FFFFFF' : theme.text, fontSize: 13 }}>
                        {config.label} ({count})
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Spacer height={Spacing.lg} />

            {filteredMaterials.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
                <Feather
                  name="package"
                  size={48}
                  color={theme.tabIconDefault}
                  style={styles.emptyIcon}
                />
                <ThemedText style={styles.emptyText}>
                  Nessun materiale in magazzino
                </ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  Importa fatture con categoria "Materiali"
                </ThemedText>
              </View>
            ) : (
              filteredMaterials.map((item) => {
                const config = MATERIAL_TYPE_CONFIG[item.type];
                
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.materialCard, { backgroundColor: theme.backgroundDefault }]}
                    onPress={() => {
                      setSelectedMaterial(item);
                      setMaterialModalVisible(true);
                    }}
                  >
                    <View style={styles.materialHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: config.color + '20' }]}>
                        <Feather name={config.icon as any} size={14} color={config.color} />
                        <ThemedText style={[styles.categoryText, { color: config.color }]}>
                          {config.label}
                        </ThemedText>
                      </View>
                      <View style={styles.materialActions}>
                        <Pressable
                          style={[styles.smallActionButton, { backgroundColor: theme.error + '15' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteMaterial(item);
                          }}
                        >
                          <Feather name="trash-2" size={14} color={theme.error} />
                        </Pressable>
                        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                      </View>
                    </View>

                    <Spacer height={Spacing.sm} />

                    <ThemedText style={styles.materialName} numberOfLines={2}>
                      {item.name}
                    </ThemedText>

                    <View style={styles.materialDetails}>
                      <ThemedText style={[styles.materialQuantity, { color: theme.primary }]}>
                        {item.quantity} {item.unitOfMeasure}
                      </ThemedText>
                      <ThemedText style={[styles.materialDate, { color: theme.textSecondary }]}>
                        {item.arrivalDate}
                      </ThemedText>
                    </View>

                    {item.notes ? (
                      <ThemedText style={[styles.materialNotes, { color: theme.textSecondary }]} numberOfLines={1}>
                        {item.notes}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </>
        )}

        <Spacer height={80} />
      </ScreenScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Seleziona Categoria</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            {selectedLine ? (
              <ThemedText style={[styles.selectedDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                {selectedLine.description}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <ScrollView style={styles.categoryList}>
              {categories.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const isSelected = selectedLine?.assignedCategory === cat;
                
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: isSelected ? config.color + '20' : theme.backgroundSecondary },
                    ]}
                    onPress={() => handleChangeCategory(cat)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: config.color + '30' }]}>
                      <Feather name={config.icon as any} size={20} color={config.color} />
                    </View>
                    <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                    {isSelected ? (
                      <Feather name="check-circle" size={20} color={config.color} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Spacer height={Spacing.xl} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={materialModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMaterialModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Cambia Categoria Materiale</ThemedText>
              <Pressable onPress={() => setMaterialModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <Spacer height={Spacing.lg} />

            {selectedMaterial ? (
              <ThemedText style={[styles.selectedDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                {selectedMaterial.name}
              </ThemedText>
            ) : null}

            <Spacer height={Spacing.lg} />

            <View style={styles.categoryList}>
              {materialTypes.map((type) => {
                const config = MATERIAL_TYPE_CONFIG[type];
                const isSelected = selectedMaterial?.type === type;
                
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: isSelected ? config.color + '20' : theme.backgroundSecondary },
                    ]}
                    onPress={() => handleChangeMaterialType(type)}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: config.color + '30' }]}>
                      <Feather name={config.icon as any} size={20} color={config.color} />
                    </View>
                    <ThemedText style={styles.categoryLabel}>{config.label}</ThemedText>
                    {isSelected ? (
                      <Feather name="check-circle" size={20} color={config.color} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Spacer height={Spacing.xl} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={plantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            contentContainerStyle={styles.plantFormContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">
                {editingPlant ? "Modifica Pianta" : "Nuova Pianta"}
              </ThemedText>
              <Pressable onPress={() => setPlantModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <Spacer height={Spacing.xl} />

            <ThemedText style={styles.inputLabel}>Varieta *</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={plantForm.variety}
              onChangeText={(t) => setPlantForm({ ...plantForm, variety: t })}
              placeholder="Es. Leucospermum cordifolium"
              placeholderTextColor={theme.textSecondary}
            />

            <Spacer height={Spacing.lg} />

            <ThemedText style={styles.inputLabel}>Quantita</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={plantForm.quantity}
              onChangeText={(t) => setPlantForm({ ...plantForm, quantity: t })}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
            />

            <Spacer height={Spacing.lg} />

            <ThemedText style={styles.inputLabel}>Data Arrivo</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={plantForm.arrivalDate}
              onChangeText={(t) => setPlantForm({ ...plantForm, arrivalDate: t })}
              placeholder="AAAA-MM-GG"
              placeholderTextColor={theme.textSecondary}
            />

            <Spacer height={Spacing.lg} />

            <ThemedText style={styles.inputLabel}>Note</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              value={plantForm.notes}
              onChangeText={(t) => setPlantForm({ ...plantForm, notes: t })}
              placeholder="Note opzionali..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />

            <Spacer height={Spacing.xl} />

            <Pressable
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSavePlant}
            >
              <ThemedText style={styles.saveButtonText}>
                {editingPlant ? "Salva Modifiche" : "Aggiungi Pianta"}
              </ThemedText>
            </Pressable>

            <Spacer height={Spacing.xl} />
          </ScrollView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
  },
  genusCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  genusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  genusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  genusInfo: {
    flex: 1,
  },
  genusTotalBadge: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  genusTotalText: {
    fontSize: 18,
    fontWeight: '700',
  },
  varietiesList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  varietyInfo: {
    flex: 1,
  },
  varietyName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  quantityBadge: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
  },
  materialCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  smallActionButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  materialDate: {
    fontSize: 12,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
  },
  materialDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  materialQuantity: {
    fontSize: 16,
    fontWeight: '700',
  },
  materialNotes: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  pendingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lineDescription: {
    fontSize: 15,
    fontWeight: '500',
  },
  invoiceRef: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  varietyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  plantFormContent: {
    paddingBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
