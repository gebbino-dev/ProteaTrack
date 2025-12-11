import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl, Modal, ScrollView, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

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
import { plantWarehouse, GenusGroup } from "@/utils/plantWarehouse";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

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
  const [genusGroups, setGenusGroups] = useState<GenusGroup[]>([]);
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

  const loadData = useCallback(async () => {
    try {
      const [groups, mats, pending] = await Promise.all([
        plantWarehouse.getGroupedByGenus(),
        inventoryStore.getMaterials(),
        pendingInvoiceStore.getUnprocessedLines(),
      ]);

      setGenusGroups(groups);
      setMaterials(mats);
      setPendingLines(pending);

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

  const processLineToInventory = async (line: PendingInvoiceLine): Promise<boolean> => {
    const category = line.assignedCategory;
    const sourceDoc = `${line.invoiceNumber} del ${line.invoiceDate}`;
    
    try {
      if (category === 'piante') {
        await storage.savePlantRecord({
          variety: line.description.substring(0, 100),
          quantity: line.quantity,
          arrivalDate: line.invoiceDate,
          sourceDocument: sourceDoc,
          notes: `Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR/${line.unitOfMeasure || 'pz'}`,
        });
      } else if (category === 'semi') {
        await storage.savePlantRecord({
          variety: `[Semi] ${line.description.substring(0, 90)}`,
          quantity: line.quantity,
          arrivalDate: line.invoiceDate,
          sourceDocument: sourceDoc,
          notes: `SEMI. Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR/${line.unitOfMeasure || 'pz'}`,
        });
      } else if (category === 'fitofarmaco' || category === 'fertilizzante') {
        await storage.saveProduct({
          name: line.description,
          activeIngredient: '',
          formulation: line.unitOfMeasure || '',
          registrationNumber: '',
          phiDays: undefined,
          fracCode: '',
          notes: `Importato: ${sourceDoc}. Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR`,
        });
      } else if (['vasi', 'terriccio', 'materiale', 'altro'].includes(category)) {
        await inventoryStore.saveMaterial({
          name: line.description,
          type: category as MaterialType,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure || 'pz',
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
          sourceDocument: sourceDoc,
          arrivalDate: line.invoiceDate,
          notes: `Fornitore: ${line.supplierName}`,
        });
      } else if (category === 'utenza') {
        await inventoryStore.saveMaterial({
          name: line.description,
          type: 'altro',
          quantity: 1,
          unitOfMeasure: 'servizio',
          unitPrice: line.totalPrice,
          totalPrice: line.totalPrice,
          sourceDocument: sourceDoc,
          arrivalDate: line.invoiceDate,
          notes: `UTENZA. Fornitore: ${line.supplierName}`,
        });
      }
      return true;
    } catch (error) {
      console.error("Error processing line to inventory:", error);
      return false;
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

  const totalPlants = genusGroups.reduce((sum, g) => sum + g.totalPlants, 0);
  const totalMaterials = materials.length;

  const materialTypes: MaterialType[] = ['vasi', 'terriccio', 'materiale', 'altro'];
  const getMaterialCount = (type: MaterialType) => materials.filter(m => m.type === type).length;
  
  const filteredMaterials = materialFilter 
    ? materials.filter(m => m.type === materialFilter)
    : materials;

  const categories = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

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
            <Feather name="package" size={20} color="#795548" />
            <ThemedText type="h3" style={styles.statValue}>
              {totalMaterials}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Materiali
            </ThemedText>
          </Pressable>
        </View>

        {pendingLines.length > 0 ? (
          <>
            <Spacer height={Spacing.md} />
            <Pressable
              style={[styles.pendingBanner, { backgroundColor: theme.warning + '20', borderColor: theme.warning }]}
              onPress={() => setShowPending(!showPending)}
            >
              <Feather name="inbox" size={18} color={theme.warning} />
              <ThemedText style={{ flex: 1, marginLeft: Spacing.sm }}>
                {pendingLines.length} righe fattura in attesa di conferma
              </ThemedText>
              <Feather name={showPending ? "chevron-up" : "chevron-down"} size={20} color={theme.warning} />
            </Pressable>
          </>
        ) : null}

        {showPending && pendingLines.length > 0 ? (
          <>
            <Spacer height={Spacing.md} />
            {pendingLines.map((line) => {
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
                      <ThemedText style={[styles.actionText, { color: theme.success }]}>
                        Conferma
                      </ThemedText>
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
          </>
        ) : null}

        <Spacer height={Spacing.xl} />

        {selectedTab === 'piante' ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Piante e Semi per Genere
            </ThemedText>
            <ThemedText style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Da categoria "Acquisto Piante"
            </ThemedText>
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
                        {group.varieties.map((lot, index) => (
                          <View 
                            key={`${lot.variety}-${index}`}
                            style={[styles.varietyRow, { backgroundColor: theme.backgroundSecondary }]}
                          >
                            <View style={styles.varietyInfo}>
                              <ThemedText style={styles.varietyName}>{lot.variety}</ThemedText>
                              <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
                                Totale: {lot.totalQuantity.toLocaleString()} | Distribuite: {lot.distributedQuantity.toLocaleString()}
                              </ThemedText>
                            </View>
                            <View style={styles.quantityBadge}>
                              <ThemedText style={[
                                styles.quantityText,
                                { color: lot.availableQuantity > 0 ? theme.primary : theme.textSecondary }
                              ]}>
                                {lot.availableQuantity.toLocaleString()}
                              </ThemedText>
                              <ThemedText style={{ color: theme.textSecondary, fontSize: 9 }}>disp.</ThemedText>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
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
});
