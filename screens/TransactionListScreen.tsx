import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { Paths, File as ExpoFile } from "expo-file-system";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ScreenFlatList } from "@/components/ScreenFlatList";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Transaction, TransactionCategory, TransactionType } from "@/types";
import { AccountingStackParamList } from "@/navigation/AccountingStackNavigator";

type NavigationProp = NativeStackNavigationProp<AccountingStackParamList>;
type RouteProps = RouteProp<AccountingStackParamList, 'TransactionList'>;

const MONTHS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export default function TransactionListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>(route.params?.filterType || 'all');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedMonth, filterType])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, cats] = await Promise.all([
        selectedMonth !== null 
          ? storage.getTransactionsByPeriod(currentYear, selectedMonth)
          : storage.getTransactions(),
        storage.getCategories(),
      ]);
      
      let filtered = txs;
      if (filterType !== 'all') {
        filtered = txs.filter(t => t.type === filterType);
      }
      
      setTransactions(filtered);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading transactions:', error);
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

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Sei sicuro di voler eliminare questo movimento?');
      if (confirmed) {
        await storage.deleteTransaction(id);
        loadData();
      }
    } else {
      Alert.alert(
        'Elimina Movimento',
        'Sei sicuro di voler eliminare questo movimento?',
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Elimina',
            style: 'destructive',
            onPress: async () => {
              await storage.deleteTransaction(id);
              loadData();
            },
          },
        ]
      );
    }
  };

  const handleExport = async () => {
    try {
      const csv = await storage.exportTransactionsAsCSV(
        currentYear, 
        selectedMonth !== null ? selectedMonth : undefined
      );
      
      const filename = selectedMonth !== null 
        ? `movimenti_${currentYear}_${String(selectedMonth + 1).padStart(2, '0')}.csv`
        : `movimenti_${currentYear}.csv`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new ExpoFile(Paths.cache, filename);
        await file.write(csv);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        }
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Errore', 'Impossibile esportare i dati');
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilterType('all')}
          style={[
            styles.filterButton,
            { 
              backgroundColor: filterType === 'all' ? theme.primary : theme.backgroundSecondary,
            }
          ]}
        >
          <ThemedText style={[
            styles.filterText,
            { color: filterType === 'all' ? '#FFF' : theme.text }
          ]}>
            Tutti
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setFilterType('ricavo')}
          style={[
            styles.filterButton,
            { 
              backgroundColor: filterType === 'ricavo' ? theme.success : theme.backgroundSecondary,
            }
          ]}
        >
          <ThemedText style={[
            styles.filterText,
            { color: filterType === 'ricavo' ? '#FFF' : theme.text }
          ]}>
            Entrate
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setFilterType('costo')}
          style={[
            styles.filterButton,
            { 
              backgroundColor: filterType === 'costo' ? theme.error : theme.backgroundSecondary,
            }
          ]}
        >
          <ThemedText style={[
            styles.filterText,
            { color: filterType === 'costo' ? '#FFF' : theme.text }
          ]}>
            Uscite
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setSelectedMonth(null)}
          style={[
            styles.monthButton,
            { 
              backgroundColor: selectedMonth === null ? theme.primary : theme.backgroundSecondary,
            }
          ]}
        >
          <ThemedText style={[
            styles.monthText,
            { color: selectedMonth === null ? '#FFF' : theme.text }
          ]}>
            Anno
          </ThemedText>
        </Pressable>
        {MONTHS.map((m, i) => (
          <Pressable
            key={m}
            onPress={() => setSelectedMonth(i)}
            style={[
              styles.monthButton,
              { 
                backgroundColor: selectedMonth === i ? theme.primary : theme.backgroundSecondary,
              }
            ]}
          >
            <ThemedText style={[
              styles.monthText,
              { color: selectedMonth === i ? '#FFF' : theme.text }
            ]}>
              {m}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryText, { color: theme.textSecondary }]}>
          {transactions.length} movimenti
        </ThemedText>
        <Pressable onPress={handleExport} style={styles.exportButton}>
          <Feather name="download" size={16} color={theme.primary} />
          <ThemedText style={[styles.exportText, { color: theme.primary }]}>
            Esporta CSV
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Transaction }) => {
    const cat = getCategoryById(item.categoryId);
    return (
      <Card style={styles.transactionCard}>
        <Pressable
          onPress={() => navigation.navigate('TransactionEdit', { transactionId: item.id })}
          style={styles.transactionContent}
        >
          <View style={[styles.transactionIcon, { backgroundColor: (cat?.color || '#999') + '20' }]}>
            <Feather name={cat?.icon as any || 'circle'} size={20} color={cat?.color || '#999'} />
          </View>
          <View style={styles.transactionInfo}>
            <ThemedText style={styles.transactionDesc} numberOfLines={1}>
              {item.description || item.counterparty || cat?.name || 'Movimento'}
            </ThemedText>
            <View style={styles.transactionMeta}>
              <ThemedText style={[styles.transactionDate, { color: theme.textSecondary }]}>
                {new Date(item.date).toLocaleDateString('it-IT')}
              </ThemedText>
              {item.docRef ? (
                <ThemedText style={[styles.transactionDoc, { color: theme.textSecondary }]}>
                  {item.docRef}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <ThemedText style={[
            styles.transactionAmount,
            { color: item.type === 'ricavo' ? theme.success : theme.error }
          ]}>
            {item.type === 'ricavo' ? '+' : '-'}{formatCurrency(item.amount)}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: 'rgba(255,59,48,0.1)', opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Feather name="trash-2" size={18} color={theme.error} />
        </Pressable>
      </Card>
    );
  };

  const renderEmpty = () => (
    <Card style={styles.emptyCard}>
      <Feather name="inbox" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Nessun movimento trovato
      </ThemedText>
      <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
        Registra entrate e uscite per tenere traccia delle finanze
      </ThemedText>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <ScreenFlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
      
      <Pressable
        onPress={() => navigation.navigate('TransactionEdit')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 }
        ]}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
  },
  headerContent: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  filterText: {
    fontWeight: '600',
    fontSize: 14,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  monthButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  deleteButton: {
    width: 44,
    height: '100%',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
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
    marginBottom: 2,
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionDoc: {
    fontSize: 12,
  },
  transactionAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
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
