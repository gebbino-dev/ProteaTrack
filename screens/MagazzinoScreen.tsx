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
import { PlantRecord } from "@/types";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

type MagazzinoScreenProps = {
  navigation: NativeStackNavigationProp<LavoroStackParamList, "Lavoro">;
};

type InventoryCategory = 'tutti' | 'piante' | 'semi' | 'vasi' | 'terriccio' | 'materiali';

interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unitOfMeasure: string;
  date: string;
  notes?: string;
  sourceDocument?: string;
}

const INVENTORY_TABS: { key: InventoryCategory; label: string; icon: string }[] = [
  { key: 'tutti', label: 'Tutti', icon: 'grid' },
  { key: 'piante', label: 'Piante', icon: 'sun' },
  { key: 'semi', label: 'Semi', icon: 'disc' },
  { key: 'vasi', label: 'Vasi', icon: 'box' },
  { key: 'terriccio', label: 'Terriccio', icon: 'layers' },
  { key: 'materiali', label: 'Materiali', icon: 'tool' },
];

export default function MagazzinoScreen({ navigation }: MagazzinoScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [pendingLines, setPendingLines] = useState<PendingInvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<InventoryCategory>('tutti');
  const [selectedLine, setSelectedLine] = useState<PendingInvoiceLine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [plantInventory, materials, pending] = await Promise.all([
        storage.getPlantInventory(),
        inventoryStore.getMaterials(),
        pendingInvoiceStore.getUnprocessedLines(),
      ]);

      const items: InventoryItem[] = [];

      plantInventory.plants.forEach((plant: PlantRecord) => {
        const isSeed = plant.variety.startsWith('[Semi]') || plant.notes?.includes('SEMI');
        items.push({
          id: plant.id,
          name: plant.variety.replace('[Semi] ', ''),
          category: isSeed ? 'semi' : 'piante',
          quantity: plant.quantity,
          unitOfMeasure: 'pz',
          date: plant.arrivalDate,
          notes: plant.notes,
          sourceDocument: plant.sourceDocument,
        });
      });

      materials.forEach((mat: MaterialRecord) => {
        let category: InventoryCategory = 'materiali';
        if (mat.type === 'vasi') category = 'vasi';
        else if (mat.type === 'terriccio') category = 'terriccio';
        
        items.push({
          id: mat.id,
          name: mat.name,
          category,
          quantity: mat.quantity,
          unitOfMeasure: mat.unitOfMeasure,
          date: mat.arrivalDate,
          notes: mat.notes,
          sourceDocument: mat.sourceDocument,
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setInventoryItems(items);
      setPendingLines(pending);
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
          type: category as 'vasi' | 'terriccio' | 'materiale' | 'altro',
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

  const filteredItems = selectedTab === 'tutti'
    ? inventoryItems
    : inventoryItems.filter(item => item.category === selectedTab);

  const getCategoryCounts = () => {
    const counts: Record<InventoryCategory, number> = {
      tutti: inventoryItems.length,
      piante: 0,
      semi: 0,
      vasi: 0,
      terriccio: 0,
      materiali: 0,
    };
    inventoryItems.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();
  const categories = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

  const getCategoryColor = (cat: InventoryCategory): string => {
    switch (cat) {
      case 'piante': return '#4CAF50';
      case 'semi': return '#8BC34A';
      case 'vasi': return '#FF9800';
      case 'terriccio': return '#795548';
      case 'materiali': return '#607D8B';
      default: return theme.primary;
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
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="package" size={20} color={theme.primary} />
            <ThemedText type="h3" style={styles.statValue}>
              {inventoryItems.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Articoli
            </ThemedText>
          </View>
          <Pressable
            style={[styles.statCard, { backgroundColor: pendingLines.length > 0 ? theme.warning + '20' : theme.backgroundDefault }]}
            onPress={() => setShowPending(!showPending)}
          >
            <Feather name="inbox" size={20} color={pendingLines.length > 0 ? theme.warning : theme.textSecondary} />
            <ThemedText type="h3" style={styles.statValue}>
              {pendingLines.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              In Attesa
            </ThemedText>
          </Pressable>
        </View>

        <Spacer height={Spacing.lg} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {INVENTORY_TABS.map((tab) => {
              const isActive = selectedTab === tab.key;
              const count = categoryCounts[tab.key];
              const color = getCategoryColor(tab.key);
              
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setSelectedTab(tab.key)}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: isActive ? color : theme.backgroundDefault,
                      borderColor: isActive ? color : theme.backgroundSecondary,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Feather
                    name={tab.icon as any}
                    size={14}
                    color={isActive ? "#FFFFFF" : color}
                  />
                  <ThemedText
                    style={[
                      styles.tabText,
                      { color: isActive ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {tab.label} ({count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Spacer height={Spacing.xl} />

        {showPending && pendingLines.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText type="h4">Righe da Confermare ({pendingLines.length})</ThemedText>
              <Pressable onPress={() => setShowPending(false)}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Spacer height={Spacing.md} />

            {pendingLines.map((line) => {
              const catConfig = CATEGORY_CONFIG[line.assignedCategory];
              
              return (
                <View
                  key={line.id}
                  style={[styles.pendingCard, { backgroundColor: theme.warning + '10', borderColor: theme.warning + '30' }]}
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

            <Spacer height={Spacing.xl} />
          </>
        ) : null}

        <ThemedText type="h4" style={styles.sectionTitle}>
          Inventario ({filteredItems.length})
        </ThemedText>
        <Spacer height={Spacing.md} />

        {filteredItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather
              name="package"
              size={48}
              color={theme.tabIconDefault}
              style={styles.emptyIcon}
            />
            <ThemedText style={styles.emptyText}>
              {selectedTab === 'tutti' ? 'Magazzino vuoto' : `Nessun articolo in ${INVENTORY_TABS.find(t => t.key === selectedTab)?.label}`}
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Importa fatture XML dalla sezione Contabilita
            </ThemedText>
          </View>
        ) : (
          filteredItems.map((item) => {
            const color = getCategoryColor(item.category);
            const tabInfo = INVENTORY_TABS.find(t => t.key === item.category);
            
            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={styles.itemHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: color + '20' }]}>
                    <Feather name={(tabInfo?.icon || 'box') as any} size={14} color={color} />
                    <ThemedText style={[styles.categoryText, { color }]}>
                      {tabInfo?.label || item.category}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.itemDate, { color: theme.textSecondary }]}>
                    {item.date}
                  </ThemedText>
                </View>

                <Spacer height={Spacing.sm} />

                <ThemedText style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </ThemedText>

                <Spacer height={Spacing.xs} />

                <View style={styles.itemDetails}>
                  <ThemedText style={[styles.itemQuantity, { color: theme.primary }]}>
                    {item.quantity} {item.unitOfMeasure}
                  </ThemedText>
                  {item.sourceDocument ? (
                    <ThemedText style={[styles.itemSource, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.sourceDocument}
                    </ThemedText>
                  ) : null}
                </View>

                {item.notes ? (
                  <>
                    <Spacer height={Spacing.xs} />
                    <ThemedText style={[styles.itemNotes, { color: theme.textSecondary }]} numberOfLines={2}>
                      {item.notes}
                    </ThemedText>
                  </>
                ) : null}
              </View>
            );
          })
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
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
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
  itemCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSource: {
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  itemNotes: {
    fontSize: 12,
  },
  pendingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
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
