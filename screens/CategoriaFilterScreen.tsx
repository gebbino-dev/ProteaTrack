import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl, Modal, ScrollView, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  pendingInvoiceStore, 
  PendingInvoiceLine,
  CategoriaRiga,
  SottoCategoriaUtenza,
  ItemCategory,
  CATEGORY_CONFIG,
} from "@/utils/pendingInvoiceStore";
import { 
  classificaTutteLeRighe,
  classificaRiga,
  CATEGORIA_CONFIG,
  SOTTOCATEGORIA_UTENZA_CONFIG,
} from "@/utils/autoCategorizationService";
import { inventoryStore } from "@/utils/inventoryStore";
import { storage } from "@/utils/storage";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

type MaterialType = 'vasi' | 'terriccio' | 'materiale' | 'altro';

type CategoriaFilterScreenProps = {
  navigation: NativeStackNavigationProp<LavoroStackParamList, "CategoriaFilter">;
};

const ALL_CATEGORIES: CategoriaRiga[] = [
  'utenze', 'piante', 'semi', 'terriccio', 'vasi', 
  'fitofarmaci', 'fertilizzanti', 'combustibile', 'materiale_generico'
];

const SOTTOCATEGORIE_UTENZA: SottoCategoriaUtenza[] = [
  'spese_floratoscana', 'luce', 'gas', 'spese_cia'
];

export default function CategoriaFilterScreen({ navigation }: CategoriaFilterScreenProps) {
  const { theme } = useTheme();
  const [lines, setLines] = useState<PendingInvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaRiga | null>(null);
  const [selectedSottocategoria, setSelectedSottocategoria] = useState<SottoCategoriaUtenza | null>(null);
  const [categoriaSummary, setCategoriaSummary] = useState<{ categoria: CategoriaRiga; count: number; total: number }[]>([]);
  const [sottocategoriaSummary, setSottocategoriaSummary] = useState<{ sottocategoria: SottoCategoriaUtenza; count: number; total: number }[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [selectedLine, setSelectedLine] = useState<PendingInvoiceLine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [summary, subSummary, allLines] = await Promise.all([
        pendingInvoiceStore.getCategoriaSummary(),
        pendingInvoiceStore.getSottocategoriaUtenzaSummary(),
        pendingInvoiceStore.getPendingLines(),
      ]);
      
      setCategoriaSummary(summary);
      setSottocategoriaSummary(subSummary);
      setLines(allLines);
    } catch (error) {
      console.error("Error loading data:", error);
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

  const handleClassificaTutte = () => {
    const doClassification = () => {
      setIsClassifying(true);
      
      classificaTutteLeRighe()
        .then((stats) => {
          loadData();
          const message = `Classificate ${stats.righeClassificate} righe su ${stats.totaleRighe}`;
          Alert.alert("Classificazione Completata", message);
        })
        .catch((error) => {
          console.error("Error classifying:", error);
          Alert.alert("Errore", "Errore durante la classificazione");
        })
        .finally(() => {
          setIsClassifying(false);
        });
    };

    Alert.alert(
      "Classifica Righe",
      "Classificare automaticamente tutte le righe esistenti?",
      [
        { text: "Annulla", style: "cancel" },
        { text: "Classifica", onPress: doClassification },
      ]
    );
  };

  const handleChangeCategory = async (newCategory: ItemCategory) => {
    if (!selectedLine) return;
    
    try {
      const result = classificaRiga(selectedLine.description);
      const categoriaRigaMap: Record<ItemCategory, CategoriaRiga> = {
        'piante': 'piante',
        'semi': 'semi',
        'vasi': 'vasi',
        'terriccio': 'terriccio',
        'fitofarmaco': 'fitofarmaci',
        'fertilizzante': 'fertilizzanti',
        'materiale': 'materiale_generico',
        'utenza': 'utenze',
        'altro': 'materiale_generico',
      };
      
      await pendingInvoiceStore.updateLine(selectedLine.id, {
        assignedCategory: newCategory,
        categoria: categoriaRigaMap[newCategory],
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
      } else {
        console.warn(`Unknown category: ${category}, saving as generic material`);
        await inventoryStore.saveMaterial({
          name: line.description,
          type: 'altro',
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure || 'pz',
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
          sourceDocument: sourceDoc,
          arrivalDate: line.invoiceDate,
          notes: `Categoria sconosciuta: ${category}. Fornitore: ${line.supplierName}`,
        });
      }
      return true;
    } catch (error) {
      console.error("Error processing line to inventory:", error);
      return false;
    }
  };

  const handleConfirmLine = async (line: PendingInvoiceLine) => {
    if (!line.assignedCategory) {
      Alert.alert(
        "Categoria Mancante",
        "Assegna una categoria prima di confermare questa riga.",
        [{ text: "OK" }]
      );
      return;
    }

    const categoryConfig = CATEGORY_CONFIG[line.assignedCategory];
    const categoryLabel = categoryConfig?.label || line.assignedCategory;

    const confirmAction = async () => {
      try {
        const success = await processLineToInventory(line);
        if (success) {
          await pendingInvoiceStore.markAsProcessed(line.id);
          loadData();
        } else {
          Alert.alert("Errore", "Impossibile processare la riga. Riprova.");
        }
      } catch (error) {
        console.error("Error confirming line:", error);
        Alert.alert("Errore", "Si è verificato un errore durante la conferma.");
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(`Confermare "${line.description}" come ${categoryLabel}?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Conferma Assegnazione",
        `Confermare "${line.description.substring(0, 50)}..." come ${categoryLabel}?`,
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
        `Eliminare "${line.description.substring(0, 50)}..."?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: deleteAction },
        ]
      );
    }
  };

  const categories = Object.keys(CATEGORY_CONFIG) as ItemCategory[];

  const filteredLines = lines.filter(line => {
    if (selectedSottocategoria) {
      return line.sottoCategoriaUtenza === selectedSottocategoria;
    }
    if (selectedCategoria) {
      return line.categoria === selectedCategoria;
    }
    return true;
  });

  const totalFiltered = filteredLines.reduce((sum, l) => sum + l.totalPrice, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <ThemedText type="h3">Classificazione Righe</ThemedText>
          <Pressable
            style={[styles.classifyButton, { backgroundColor: theme.primary }]}
            onPress={handleClassificaTutte}
            disabled={isClassifying}
          >
            <Feather name="zap" size={16} color="#FFFFFF" />
            <ThemedText style={styles.classifyButtonText}>
              {isClassifying ? "..." : "Classifica Tutto"}
            </ThemedText>
          </Pressable>
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Filtra per Categoria
        </ThemedText>
        <Spacer height={Spacing.sm} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => {
                setSelectedCategoria(null);
                setSelectedSottocategoria(null);
              }}
              style={[
                styles.filterChip,
                { backgroundColor: !selectedCategoria && !selectedSottocategoria ? theme.primary : theme.backgroundDefault }
              ]}
            >
              <ThemedText style={{ 
                color: !selectedCategoria && !selectedSottocategoria ? '#FFFFFF' : theme.text, 
                fontSize: 13 
              }}>
                Tutte ({lines.length})
              </ThemedText>
            </Pressable>
            {categoriaSummary.map((item) => {
              const config = CATEGORIA_CONFIG[item.categoria];
              const isActive = selectedCategoria === item.categoria && !selectedSottocategoria;
              
              return (
                <Pressable
                  key={item.categoria}
                  onPress={() => {
                    setSelectedCategoria(item.categoria);
                    setSelectedSottocategoria(null);
                  }}
                  style={[
                    styles.filterChip,
                    { backgroundColor: isActive ? config.color : theme.backgroundDefault }
                  ]}
                >
                  <Feather name={config.icon as any} size={14} color={isActive ? '#FFFFFF' : config.color} />
                  <ThemedText style={{ 
                    color: isActive ? '#FFFFFF' : theme.text, 
                    fontSize: 13, 
                    marginLeft: 4 
                  }}>
                    {config.label} ({item.count})
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {selectedCategoria === 'utenze' && sottocategoriaSummary.length > 0 ? (
          <>
            <Spacer height={Spacing.md} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              Dettaglio Utenze
            </ThemedText>
            <Spacer height={Spacing.sm} />
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <Pressable
                  onPress={() => setSelectedSottocategoria(null)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: !selectedSottocategoria ? '#2196F3' : theme.backgroundDefault }
                  ]}
                >
                  <ThemedText style={{ 
                    color: !selectedSottocategoria ? '#FFFFFF' : theme.text, 
                    fontSize: 12 
                  }}>
                    Tutte Utenze
                  </ThemedText>
                </Pressable>
                {sottocategoriaSummary.map((item) => {
                  const config = SOTTOCATEGORIA_UTENZA_CONFIG[item.sottocategoria] || 
                    { label: item.sottocategoria, color: '#9E9E9E' };
                  const isActive = selectedSottocategoria === item.sottocategoria;
                  
                  return (
                    <Pressable
                      key={item.sottocategoria}
                      onPress={() => setSelectedSottocategoria(item.sottocategoria)}
                      style={[
                        styles.filterChip,
                        { backgroundColor: isActive ? config.color : theme.backgroundDefault }
                      ]}
                    >
                      <ThemedText style={{ 
                        color: isActive ? '#FFFFFF' : theme.text, 
                        fontSize: 12 
                      }}>
                        {config.label} ({item.count})
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <View style={[styles.summaryBar, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText style={{ color: theme.textSecondary }}>
            {filteredLines.length} righe trovate
          </ThemedText>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            {formatCurrency(totalFiltered)}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        {filteredLines.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={48} color={theme.tabIconDefault} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyText}>
              Nessuna riga trovata
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Importa fatture o premi "Classifica Tutto"
            </ThemedText>
          </View>
        ) : (
          filteredLines.map((line) => {
            const catConfig = line.categoria 
              ? CATEGORIA_CONFIG[line.categoria] 
              : { label: 'Non classificato', icon: 'help-circle', color: '#9E9E9E' };
            
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
                  {line.sottoCategoriaUtenza ? (
                    <View style={[styles.subBadge, { backgroundColor: '#2196F320' }]}>
                      <ThemedText style={{ color: '#2196F3', fontSize: 10 }}>
                        {SOTTOCATEGORIA_UTENZA_CONFIG[line.sottoCategoriaUtenza]?.label || line.sottoCategoriaUtenza}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <Spacer height={Spacing.sm} />

                <ThemedText style={styles.lineDescription} numberOfLines={2}>
                  {line.description}
                </ThemedText>

                <View style={styles.lineDetails}>
                  <ThemedText style={[styles.invoiceRef, { color: theme.textSecondary }]}>
                    {line.invoiceNumber} - {line.invoiceDate}
                  </ThemedText>
                  <ThemedText style={[styles.linePrice, { color: theme.primary }]}>
                    {formatCurrency(line.totalPrice)}
                  </ThemedText>
                </View>

                <ThemedText style={[styles.supplierText, { color: theme.textSecondary }]}>
                  {line.supplierName}
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
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Cambia Categoria</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
            <Spacer height={Spacing.md} />
            
            {selectedLine ? (
              <ThemedText style={[styles.modalDescription, { color: theme.textSecondary }]} numberOfLines={2}>
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
                      { 
                        backgroundColor: isSelected ? config.color + '30' : theme.backgroundDefault,
                        borderColor: isSelected ? config.color : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      }
                    ]}
                    onPress={() => handleChangeCategory(cat)}
                  >
                    <Feather name={config.icon as any} size={20} color={config.color} />
                    <ThemedText style={styles.categoryOptionText}>
                      {config.label}
                    </ThemedText>
                    {isSelected ? (
                      <Feather name="check" size={18} color={config.color} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  classifyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
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
    flexWrap: 'wrap',
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
  subBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  lineDescription: {
    fontSize: 15,
    fontWeight: '500',
  },
  lineDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  invoiceRef: {
    fontSize: 12,
  },
  linePrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  supplierText: {
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 14,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
