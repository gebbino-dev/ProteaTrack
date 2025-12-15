import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, RefreshControl, Modal, ScrollView as RNScrollView } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { FinancialSummary, TransactionCategory, Transaction, Activity, Treatment } from "@/types";
import { AccountingStackParamList } from "@/navigation/AccountingStackNavigator";

type NavigationProp = NativeStackNavigationProp<AccountingStackParamList>;

const MONTHS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const FULL_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface PeriodRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

function getMonthsBetween(start: PeriodRange): number {
  return (start.endYear - start.startYear) * 12 + (start.endMonth - start.startMonth) + 1;
}

function formatPeriodLabel(period: PeriodRange): string {
  const monthCount = getMonthsBetween(period);
  if (monthCount === 1) {
    return `${FULL_MONTHS[period.startMonth]} ${period.startYear}`;
  }
  if (period.startYear === period.endYear) {
    return `${MONTHS[period.startMonth]} - ${MONTHS[period.endMonth]} ${period.startYear}`;
  }
  return `${MONTHS[period.startMonth]} ${period.startYear} - ${MONTHS[period.endMonth]} ${period.endYear}`;
}

export default function FinancialDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [period, setPeriod] = useState<PeriodRange>({
    startYear: currentYear,
    startMonth: 0,
    endYear: currentYear,
    endMonth: currentMonth,
  });
  
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempPeriod, setTempPeriod] = useState<PeriodRange>(period);
  const [selectingStart, setSelectingStart] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [activityStats, setActivityStats] = useState({ total: 0, byType: {} as Record<string, number> });
  const [treatmentStats, setTreatmentStats] = useState({ total: 0, byProduct: {} as Record<string, number> });
  const [greenhouseStats, setGreenhouseStats] = useState({ totalPlants: 0, activeSectors: 0 });

  const loadData = useCallback(async () => {
    try {
      const [cats, transactions, activities, treatments, benches] = await Promise.all([
        storage.getCategories(),
        storage.getTransactions(),
        storage.getActivities(),
        storage.getTreatments(),
        storage.getBenches(),
      ]);
      
      setCategories(cats);
      
      const filteredTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        const y = date.getFullYear();
        const m = date.getMonth();
        const startVal = period.startYear * 12 + period.startMonth;
        const endVal = period.endYear * 12 + period.endMonth;
        const tVal = y * 12 + m;
        return tVal >= startVal && tVal <= endVal;
      });
      
      let income = 0;
      let expenses = 0;
      const byCategory: { categoryId: string; total: number }[] = [];
      const catTotals: Record<string, number> = {};
      
      for (const t of filteredTransactions) {
        if (t.type === 'ricavo') {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
        catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
      }
      
      for (const [categoryId, total] of Object.entries(catTotals)) {
        byCategory.push({ categoryId, total });
      }
      byCategory.sort((a, b) => b.total - a.total);
      
      setSummary({
        period: formatPeriodLabel(period),
        income,
        expenses,
        margin: income - expenses,
        byCategory,
      });
      
      setRecentTransactions(filteredTransactions.slice(0, 5));
      
      const filteredActivities = activities.filter(a => {
        const date = new Date(a.date);
        const y = date.getFullYear();
        const m = date.getMonth();
        const startVal = period.startYear * 12 + period.startMonth;
        const endVal = period.endYear * 12 + period.endMonth;
        const aVal = y * 12 + m;
        return aVal >= startVal && aVal <= endVal;
      });
      
      const byType: Record<string, number> = {};
      for (const a of filteredActivities) {
        byType[a.type] = (byType[a.type] || 0) + 1;
      }
      setActivityStats({ total: filteredActivities.length, byType });
      
      const filteredTreatments = treatments.filter(t => {
        const date = new Date(t.date);
        const y = date.getFullYear();
        const m = date.getMonth();
        const startVal = period.startYear * 12 + period.startMonth;
        const endVal = period.endYear * 12 + period.endMonth;
        const tVal = y * 12 + m;
        return tVal >= startVal && tVal <= endVal;
      });
      
      const byProduct: Record<string, number> = {};
      for (const t of filteredTreatments) {
        const name = t.productName || 'Sconosciuto';
        byProduct[name] = (byProduct[name] || 0) + 1;
      }
      setTreatmentStats({ total: filteredTreatments.length, byProduct });
      
      const totalPlants = benches.reduce((sum, b) => sum + b.plantCount, 0);
      const activeSectors = new Set(
        benches.filter(b => b.plantCount > 0).map(b => `${b.greenhouse}-${b.sector}`)
      ).size;
      setGreenhouseStats({ totalPlants, activeSectors });
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const getMarginColor = (margin: number) => {
    if (margin > 0) return theme.success;
    if (margin < 0) return theme.error;
    return theme.textSecondary;
  };

  const activityLabels: Record<string, string> = {
    innaffiatura: 'Innaffiatura',
    concimazione: 'Concimazione',
    potatura: 'Potatura',
    trattamento: 'Trattamento',
    altro: 'Altro',
  };

  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear - 3; y <= currentYear + 1; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentYear]);

  const openPeriodModal = () => {
    setTempPeriod(period);
    setSelectingStart(true);
    setShowPeriodModal(true);
  };

  const handleMonthSelect = (year: number, month: number) => {
    if (selectingStart) {
      setTempPeriod({
        startYear: year,
        startMonth: month,
        endYear: year,
        endMonth: month,
      });
      setSelectingStart(false);
    } else {
      const startVal = tempPeriod.startYear * 12 + tempPeriod.startMonth;
      const endVal = year * 12 + month;
      
      if (endVal < startVal) {
        setTempPeriod({
          startYear: year,
          startMonth: month,
          endYear: tempPeriod.startYear,
          endMonth: tempPeriod.startMonth,
        });
      } else {
        setTempPeriod({
          ...tempPeriod,
          endYear: year,
          endMonth: month,
        });
      }
    }
  };

  const isMonthInRange = (year: number, month: number) => {
    const val = year * 12 + month;
    const startVal = tempPeriod.startYear * 12 + tempPeriod.startMonth;
    const endVal = tempPeriod.endYear * 12 + tempPeriod.endMonth;
    return val >= startVal && val <= endVal;
  };

  const isStartMonth = (year: number, month: number) => {
    return year === tempPeriod.startYear && month === tempPeriod.startMonth;
  };

  const isEndMonth = (year: number, month: number) => {
    return year === tempPeriod.endYear && month === tempPeriod.endMonth;
  };

  const confirmPeriod = () => {
    setPeriod(tempPeriod);
    setShowPeriodModal(false);
  };

  const setQuickPeriod = (type: 'month' | 'quarter' | 'year' | 'ytd') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    
    let newPeriod: PeriodRange;
    
    switch (type) {
      case 'month':
        newPeriod = { startYear: y, startMonth: m, endYear: y, endMonth: m };
        break;
      case 'quarter':
        const qStart = Math.floor(m / 3) * 3;
        newPeriod = { startYear: y, startMonth: qStart, endYear: y, endMonth: qStart + 2 };
        break;
      case 'year':
        newPeriod = { startYear: y, startMonth: 0, endYear: y, endMonth: 11 };
        break;
      case 'ytd':
        newPeriod = { startYear: y, startMonth: 0, endYear: y, endMonth: m };
        break;
      default:
        return;
    }
    
    setTempPeriod(newPeriod);
  };

  const monthCount = getMonthsBetween(period);

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Pressable
          onPress={openPeriodModal}
          style={({ pressed }) => [
            styles.periodSelector,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Feather name="calendar" size={20} color={theme.primary} />
          <View style={styles.periodInfo}>
            <ThemedText style={styles.periodLabel}>Periodo selezionato</ThemedText>
            <ThemedText type="h4">{formatPeriodLabel(period)}</ThemedText>
            <ThemedText style={[styles.periodCount, { color: theme.textSecondary }]}>
              {monthCount} {monthCount === 1 ? 'mese' : 'mesi'}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Riepilogo Finanziario
        </ThemedText>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Feather name="trending-up" size={24} color={theme.success} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Entrate
            </ThemedText>
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {formatCurrency(summary?.income || 0)}
            </ThemedText>
          </Card>

          <Card style={styles.statCard}>
            <Feather name="trending-down" size={24} color={theme.error} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Uscite
            </ThemedText>
            <ThemedText style={[styles.statValue, { color: theme.error }]}>
              {formatCurrency(summary?.expenses || 0)}
            </ThemedText>
          </Card>
        </View>

        <Card style={styles.marginCard}>
          <View style={styles.marginHeader}>
            <Feather 
              name={summary?.margin && summary.margin >= 0 ? "arrow-up-circle" : "arrow-down-circle"} 
              size={28} 
              color={getMarginColor(summary?.margin || 0)} 
            />
            <View style={styles.marginInfo}>
              <ThemedText style={[styles.marginLabel, { color: theme.textSecondary }]}>
                Margine Periodo
              </ThemedText>
              <ThemedText style={[styles.marginValue, { color: getMarginColor(summary?.margin || 0) }]}>
                {formatCurrency(summary?.margin || 0)}
              </ThemedText>
            </View>
          </View>
        </Card>

        {summary && summary.byCategory.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Top Categorie
            </ThemedText>
            <View style={styles.categoryList}>
              {summary.byCategory.slice(0, 5).map((item) => {
                const cat = getCategoryById(item.categoryId);
                if (!cat) return null;
                return (
                  <Card key={item.categoryId} style={styles.categoryCard}>
                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                      <Feather name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <ThemedText style={styles.categoryName}>{cat.name}</ThemedText>
                      <ThemedText style={[styles.categoryType, { color: theme.textSecondary }]}>
                        {cat.type === 'ricavo' ? 'Entrata' : 'Uscita'}
                      </ThemedText>
                    </View>
                    <ThemedText style={[
                      styles.categoryAmount,
                      { color: cat.type === 'ricavo' ? theme.success : theme.error }
                    ]}>
                      {formatCurrency(item.total)}
                    </ThemedText>
                  </Card>
                );
              })}
            </View>
          </>
        ) : null}

        <ThemedText type="h4" style={styles.sectionTitle}>
          Statistiche Serre
        </ThemedText>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Feather name="sun" size={24} color={theme.primary} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Piante Totali
            </ThemedText>
            <ThemedText style={styles.statValue}>
              {greenhouseStats.totalPlants}
            </ThemedText>
          </Card>

          <Card style={styles.statCard}>
            <Feather name="grid" size={24} color={theme.activityFertilizing} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Settori Attivi
            </ThemedText>
            <ThemedText style={styles.statValue}>
              {greenhouseStats.activeSectors}
            </ThemedText>
          </Card>
        </View>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Attività nel Periodo
        </ThemedText>

        <Card style={styles.statsCard}>
          <View style={styles.statHeader}>
            <Feather name="activity" size={20} color={theme.activityWatering} />
            <ThemedText type="h3" style={styles.statHeaderText}>
              {activityStats.total}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>attività</ThemedText>
          </View>
          {Object.entries(activityStats.byType).length > 0 ? (
            <View style={styles.breakdownList}>
              {Object.entries(activityStats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <View key={type} style={styles.breakdownRow}>
                    <ThemedText>{activityLabels[type] || type}</ThemedText>
                    <ThemedText type="h4">{count}</ThemedText>
                  </View>
                ))}
            </View>
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessuna attività nel periodo
            </ThemedText>
          )}
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Trattamenti nel Periodo
        </ThemedText>

        <Card style={styles.statsCard}>
          <View style={styles.statHeader}>
            <Feather name="shield" size={20} color={theme.activityTreatment} />
            <ThemedText type="h3" style={styles.statHeaderText}>
              {treatmentStats.total}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>trattamenti</ThemedText>
          </View>
          {Object.entries(treatmentStats.byProduct).length > 0 ? (
            <View style={styles.breakdownList}>
              {Object.entries(treatmentStats.byProduct)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([product, count]) => (
                  <View key={product} style={styles.breakdownRow}>
                    <ThemedText numberOfLines={1} style={{ flex: 1 }}>
                      {product}
                    </ThemedText>
                    <ThemedText type="h4">{count}</ThemedText>
                  </View>
                ))}
            </View>
          ) : (
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessun trattamento nel periodo
            </ThemedText>
          )}
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Ultimi Movimenti
        </ThemedText>

        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyCardText, { color: theme.textSecondary }]}>
              Nessun movimento nel periodo
            </ThemedText>
          </Card>
        ) : (
          <View style={styles.transactionList}>
            {recentTransactions.map((t) => {
              const cat = getCategoryById(t.categoryId);
              return (
                <Card key={t.id} style={styles.transactionCard}>
                  <View style={[styles.transactionIcon, { backgroundColor: (cat?.color || '#999') + '20' }]}>
                    <Feather name={cat?.icon as any || 'circle'} size={18} color={cat?.color || '#999'} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <ThemedText style={styles.transactionDesc} numberOfLines={1}>
                      {t.description || t.counterparty || cat?.name || 'Movimento'}
                    </ThemedText>
                    <ThemedText style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {new Date(t.date).toLocaleDateString('it-IT')}
                    </ThemedText>
                  </View>
                  <ThemedText style={[
                    styles.transactionAmount,
                    { color: t.type === 'ricavo' ? theme.success : theme.error }
                  ]}>
                    {t.type === 'ricavo' ? '+' : '-'}{formatCurrency(t.amount)}
                  </ThemedText>
                </Card>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => navigation.navigate('TransactionList')}
          style={({ pressed }) => [
            styles.viewAllButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <ThemedText style={styles.viewAllText}>Vedi Tutti i Movimenti</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.text} />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('InvoiceImport')}
          style={({ pressed }) => [
            styles.importButton,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.primary, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Feather name="file-text" size={20} color={theme.primary} />
          <ThemedText style={[styles.importButtonText, { color: theme.primary }]}>
            Importa Fattura XML
          </ThemedText>
        </Pressable>
      </View>

      <Pressable
        onPress={() => navigation.navigate('TransactionEdit')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 }
        ]}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </Pressable>

      <Modal
        visible={showPeriodModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPeriodModal(false)}>
              <ThemedText style={{ color: theme.error }}>Annulla</ThemedText>
            </Pressable>
            <ThemedText type="h4">Seleziona Periodo</ThemedText>
            <Pressable onPress={confirmPeriod}>
              <ThemedText style={{ color: theme.primary, fontWeight: '600' }}>Conferma</ThemedText>
            </Pressable>
          </View>

          <View style={styles.quickButtons}>
            <Pressable
              onPress={() => setQuickPeriod('month')}
              style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={styles.quickButtonText}>Mese</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setQuickPeriod('quarter')}
              style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={styles.quickButtonText}>Trimestre</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setQuickPeriod('ytd')}
              style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={styles.quickButtonText}>Da inizio anno</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setQuickPeriod('year')}
              style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <ThemedText style={styles.quickButtonText}>Anno intero</ThemedText>
            </Pressable>
          </View>

          <View style={styles.selectionInfo}>
            <ThemedText style={[styles.selectionLabel, { color: theme.textSecondary }]}>
              {selectingStart ? 'Seleziona mese iniziale' : 'Seleziona mese finale'}
            </ThemedText>
            <ThemedText type="h4">
              {formatPeriodLabel(tempPeriod)} ({getMonthsBetween(tempPeriod)} {getMonthsBetween(tempPeriod) === 1 ? 'mese' : 'mesi'})
            </ThemedText>
          </View>

          <RNScrollView style={styles.yearsList}>
            {years.map((year) => (
              <View key={year} style={styles.yearSection}>
                <ThemedText type="h3" style={styles.yearTitle}>{year}</ThemedText>
                <View style={styles.monthsGrid}>
                  {MONTHS.map((month, index) => {
                    const inRange = isMonthInRange(year, index);
                    const isStart = isStartMonth(year, index);
                    const isEnd = isEndMonth(year, index);
                    
                    return (
                      <Pressable
                        key={`${year}-${index}`}
                        onPress={() => handleMonthSelect(year, index)}
                        style={[
                          styles.monthChip,
                          {
                            backgroundColor: inRange ? theme.primary + '30' : theme.backgroundSecondary,
                            borderWidth: isStart || isEnd ? 2 : 0,
                            borderColor: theme.primary,
                          }
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.monthChipText,
                            {
                              color: isStart || isEnd ? theme.primary : theme.text,
                              fontWeight: isStart || isEnd ? '700' : '500',
                            }
                          ]}
                        >
                          {month}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </RNScrollView>

          {!selectingStart ? (
            <Pressable
              onPress={() => setSelectingStart(true)}
              style={[styles.resetButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="rotate-ccw" size={16} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary }}>
                Ricomincia selezione
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  periodInfo: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  periodCount: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  statLabel: {
    fontSize: 13,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  marginCard: {
    padding: Spacing.lg,
  },
  marginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  marginInfo: {
    flex: 1,
  },
  marginLabel: {
    fontSize: 14,
  },
  marginValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  categoryList: {
    gap: Spacing.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '500',
    fontSize: 15,
  },
  categoryType: {
    fontSize: 12,
  },
  categoryAmount: {
    fontWeight: '600',
    fontSize: 15,
  },
  statsCard: {
    padding: Spacing.lg,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statHeaderText: {
    marginLeft: Spacing.xs,
  },
  breakdownList: {
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  transactionList: {
    gap: Spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontWeight: '500',
    fontSize: 15,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 15,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyCardText: {
    fontSize: 16,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  viewAllText: {
    fontWeight: '500',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  importButtonText: {
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  quickButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectionInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectionLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  yearsList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  yearSection: {
    marginVertical: Spacing.lg,
  },
  yearTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  monthChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  monthChipText: {
    fontSize: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
