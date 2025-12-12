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
} from "@/utils/pendingInvoiceStore";
import { 
  classificaTutteLeRighe,
  CATEGORIA_CONFIG,
  SOTTOCATEGORIA_UTENZA_CONFIG,
} from "@/utils/autoCategorizationService";
import { LavoroStackParamList } from "@/navigation/LavoroStackNavigator";

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

  const handleClassificaTutte = async () => {
    const runClassification = async () => {
      console.log('[CategoriaFilter] Avvio classificazione...');
      setIsClassifying(true);
      try {
        const stats = await classificaTutteLeRighe();
        console.log('[CategoriaFilter] Classificazione completata:', stats);
        
        await loadData();
        
        const message = `Classificate ${stats.righeClassificate} righe su ${stats.totaleRighe}`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert("Classificazione Completata", message);
        }
      } catch (error) {
        console.error("[CategoriaFilter] Error classifying:", error);
        const errorMessage = "Errore durante la classificazione";
        if (Platform.OS === 'web') {
          window.alert(errorMessage);
        } else {
          Alert.alert("Errore", errorMessage);
        }
      } finally {
        setIsClassifying(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Classificare automaticamente tutte le righe esistenti?");
      console.log('[CategoriaFilter] Conferma classificazione:', confirmed);
      if (confirmed) {
        await runClassification();
      }
    } else {
      Alert.alert(
        "Classifica Righe",
        "Classificare automaticamente tutte le righe esistenti?",
        [
          { text: "Annulla", style: "cancel" },
          { text: "Classifica", onPress: runClassification },
        ]
      );
    }
  };

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
              </View>
            );
          })
        )}

        <Spacer height={80} />
      </ScreenScrollView>
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
});
