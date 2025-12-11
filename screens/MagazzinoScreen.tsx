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
import { inventoryStore } from "@/utils/inventoryStore";
import { storage } from "@/utils/storage";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

type MagazzinoScreenProps = {
  navigation: NativeStackNavigationProp<LavoroStackParamList, "Lavoro">;
};

export default function MagazzinoScreen({ navigation }: MagazzinoScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [pendingLines, setPendingLines] = useState<PendingInvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLine, setSelectedLine] = useState<PendingInvoiceLine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ItemCategory | null>(null);

  const loadData = useCallback(async () => {
    try {
      const lines = await pendingInvoiceStore.getUnprocessedLines();
      setPendingLines(lines);
    } catch (error) {
      console.error("Error loading pending lines:", error);
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

  const categorySummary = pendingLines.reduce((acc, line) => {
    const cat = line.assignedCategory;
    if (!acc[cat]) {
      acc[cat] = { count: 0, total: 0 };
    }
    acc[cat].count++;
    acc[cat].total += line.totalPrice;
    return acc;
  }, {} as Record<ItemCategory, { count: number; total: number }>);

  const filteredLines = filterCategory
    ? pendingLines.filter(l => l.assignedCategory === filterCategory)
    : pendingLines;

  const categories = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="inbox" size={20} color={theme.primary} />
            <ThemedText type="h3" style={styles.statValue}>
              {pendingLines.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Da Assegnare
            </ThemedText>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="check-circle" size={20} color={theme.success} />
            <ThemedText type="h3" style={styles.statValue}>
              {Object.keys(categorySummary).length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Categorie
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Filtra per Categoria
        </ThemedText>
        <Spacer height={Spacing.sm} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setFilterCategory(null)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: !filterCategory
                    ? theme.primary
                    : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  { color: !filterCategory ? "#FFFFFF" : theme.text },
                ]}
              >
                Tutte ({pendingLines.length})
              </ThemedText>
            </Pressable>
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              const count = categorySummary[cat]?.count || 0;
              if (count === 0) return null;
              
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCategory(filterCategory === cat ? null : cat)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        filterCategory === cat ? config.color : theme.backgroundDefault,
                    },
                  ]}
                >
                  <Feather
                    name={config.icon as any}
                    size={14}
                    color={filterCategory === cat ? "#FFFFFF" : config.color}
                  />
                  <ThemedText
                    style={[
                      styles.filterText,
                      { color: filterCategory === cat ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {config.label} ({count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Spacer height={Spacing.xl} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Righe Fattura ({filteredLines.length})
        </ThemedText>
        <Spacer height={Spacing.md} />

        {filteredLines.length === 0 ? (
          <View
            style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather
              name="inbox"
              size={48}
              color={theme.tabIconDefault}
              style={styles.emptyIcon}
            />
            <ThemedText style={styles.emptyText}>
              Nessuna riga da assegnare
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: theme.textSecondary }]}
            >
              Importa una fattura XML dalla sezione Contabilita
            </ThemedText>
          </View>
        ) : (
          filteredLines.map((line) => {
            const catConfig = CATEGORY_CONFIG[line.assignedCategory];
            const wasAutoDetected = line.detectedCategory === line.assignedCategory;
            
            return (
              <View
                key={line.id}
                style={[styles.lineCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={styles.lineHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
                    <Feather name={catConfig.icon as any} size={14} color={catConfig.color} />
                    <ThemedText style={[styles.categoryText, { color: catConfig.color }]}>
                      {catConfig.label}
                    </ThemedText>
                  </View>
                  {!wasAutoDetected ? (
                    <View style={[styles.manualBadge, { backgroundColor: theme.warning + '20' }]}>
                      <ThemedText style={[styles.manualText, { color: theme.warning }]}>
                        Modificato
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <Spacer height={Spacing.sm} />

                <ThemedText style={styles.lineDescription} numberOfLines={2}>
                  {line.description}
                </ThemedText>

                <Spacer height={Spacing.xs} />

                <View style={styles.lineDetails}>
                  <ThemedText style={[styles.lineInfo, { color: theme.textSecondary }]}>
                    Qta: {line.quantity} {line.unitOfMeasure || 'pz'}
                  </ThemedText>
                  <ThemedText style={[styles.linePrice, { color: theme.primary }]}>
                    {line.totalPrice.toFixed(2)} EUR
                  </ThemedText>
                </View>

                <ThemedText style={[styles.invoiceRef, { color: theme.textSecondary }]}>
                  {line.invoiceNumber} del {line.invoiceDate} - {line.supplierName}
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
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterText: {
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
  lineCard: {
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
  manualBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  manualText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lineDescription: {
    fontSize: 15,
    fontWeight: '500',
  },
  lineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineInfo: {
    fontSize: 13,
  },
  linePrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  invoiceRef: {
    fontSize: 11,
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
