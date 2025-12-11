import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView as RNScrollView } from "react-native";
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
import { FinancialSummary, TransactionCategory, Transaction } from "@/types";
import { AccountingStackParamList } from "@/navigation/AccountingStackNavigator";

type NavigationProp = NativeStackNavigationProp<AccountingStackParamList>;

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function FinancialDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [monthSummary, setMonthSummary] = useState<FinancialSummary | null>(null);
  const [yearSummary, setYearSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [monthData, yearData, cats, transactions] = await Promise.all([
        storage.getFinancialSummary(currentYear, currentMonth),
        storage.getFinancialSummary(currentYear),
        storage.getCategories(),
        storage.getTransactions(),
      ]);
      setMonthSummary(monthData);
      setYearSummary(yearData);
      setCategories(cats);
      setRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <ScreenScrollView>
      <View style={styles.content}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {MONTHS[currentMonth]} {currentYear}
        </ThemedText>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Feather name="trending-up" size={24} color={theme.success} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Entrate
            </ThemedText>
            <ThemedText style={[styles.statValue, { color: theme.success }]}>
              {formatCurrency(monthSummary?.income || 0)}
            </ThemedText>
          </Card>

          <Card style={styles.statCard}>
            <Feather name="trending-down" size={24} color={theme.error} />
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
              Uscite
            </ThemedText>
            <ThemedText style={[styles.statValue, { color: theme.error }]}>
              {formatCurrency(monthSummary?.expenses || 0)}
            </ThemedText>
          </Card>
        </View>

        <Card style={styles.marginCard}>
          <View style={styles.marginHeader}>
            <Feather 
              name={monthSummary?.margin && monthSummary.margin >= 0 ? "arrow-up-circle" : "arrow-down-circle"} 
              size={28} 
              color={getMarginColor(monthSummary?.margin || 0)} 
            />
            <View style={styles.marginInfo}>
              <ThemedText style={[styles.marginLabel, { color: theme.textSecondary }]}>
                Margine Mensile
              </ThemedText>
              <ThemedText style={[styles.marginValue, { color: getMarginColor(monthSummary?.margin || 0) }]}>
                {formatCurrency(monthSummary?.margin || 0)}
              </ThemedText>
            </View>
          </View>
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>
          Riepilogo Annuale {currentYear}
        </ThemedText>

        <Card style={styles.yearCard}>
          <View style={styles.yearRow}>
            <View style={styles.yearItem}>
              <ThemedText style={[styles.yearLabel, { color: theme.textSecondary }]}>
                Totale Entrate
              </ThemedText>
              <ThemedText style={[styles.yearValue, { color: theme.success }]}>
                {formatCurrency(yearSummary?.income || 0)}
              </ThemedText>
            </View>
            <View style={styles.yearDivider} />
            <View style={styles.yearItem}>
              <ThemedText style={[styles.yearLabel, { color: theme.textSecondary }]}>
                Totale Uscite
              </ThemedText>
              <ThemedText style={[styles.yearValue, { color: theme.error }]}>
                {formatCurrency(yearSummary?.expenses || 0)}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.yearMargin, { borderTopColor: theme.backgroundTertiary }]}>
            <ThemedText style={[styles.yearLabel, { color: theme.textSecondary }]}>
              Margine Annuale
            </ThemedText>
            <ThemedText style={[styles.yearMarginValue, { color: getMarginColor(yearSummary?.margin || 0) }]}>
              {formatCurrency(yearSummary?.margin || 0)}
            </ThemedText>
          </View>
        </Card>

        {yearSummary && yearSummary.byCategory.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Top Categorie
            </ThemedText>
            <View style={styles.categoryList}>
              {yearSummary.byCategory.slice(0, 5).map((item) => {
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
          Ultimi Movimenti
        </ThemedText>

        {recentTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessun movimento registrato
            </ThemedText>
            <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
              Usa il pulsante + per aggiungere entrate e uscite
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
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
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
  yearCard: {
    padding: Spacing.lg,
  },
  yearRow: {
    flexDirection: 'row',
  },
  yearItem: {
    flex: 1,
    alignItems: 'center',
  },
  yearDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: Spacing.md,
  },
  yearLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  yearValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  yearMargin: {
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  yearMarginValue: {
    fontSize: 20,
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
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
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
});
