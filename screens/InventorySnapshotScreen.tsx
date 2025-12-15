import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { inventoryMovements, InventorySnapshot, InventoryMovement, YearEndInventory } from "@/utils/inventoryMovements";

const MONTHS = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export default function InventorySnapshotScreen() {
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [yearEndData, setYearEndData] = useState<YearEndInventory | null>(null);
  const [monthlyData, setMonthlyData] = useState<{
    month: number;
    entries: number;
    exits: number;
    entriesQty: number;
    exitsQty: number;
  }[]>([]);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const years = [currentYear - 2, currentYear - 1, currentYear];

  const loadData = useCallback(async () => {
    try {
      const [yearEnd, monthly, allMovements] = await Promise.all([
        inventoryMovements.getYearEndInventory(selectedYear),
        inventoryMovements.getMonthlyMovementSummary(selectedYear),
        inventoryMovements.getMovements(),
      ]);

      setYearEndData(yearEnd);
      setMonthlyData(monthly);
      setRecentMovements(allMovements.slice(0, 20));
    } catch (error) {
      console.error("Error loading inventory data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.yearSelector}>
          {years.map((year) => (
            <Pressable
              key={year}
              style={[
                styles.yearButton,
                { 
                  backgroundColor: selectedYear === year ? theme.primary : theme.backgroundSecondary,
                }
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <ThemedText 
                style={[
                  styles.yearButtonText,
                  { color: selectedYear === year ? '#FFFFFF' : theme.text }
                ]}
              >
                {year}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Giacenze Fine Anno {selectedYear}
        </ThemedText>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Feather name="sun" size={24} color={theme.primary} />
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Piante
              </ThemedText>
              <ThemedText type="h3" style={styles.summaryValue}>
                {yearEndData?.snapshot.totals.plants || 0}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Feather name="droplet" size={24} color="#FFC107" />
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Semi
              </ThemedText>
              <ThemedText type="h3" style={styles.summaryValue}>
                {yearEndData?.snapshot.totals.seeds || 0}
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <Feather name="package" size={24} color="#795548" />
              <ThemedText style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Materiali
              </ThemedText>
              <ThemedText type="h3" style={styles.summaryValue}>
                {yearEndData?.snapshot.totals.materials || 0}
              </ThemedText>
            </View>
          </View>
        </Card>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Movimenti {selectedYear}
        </ThemedText>

        <Card style={styles.movementsCard}>
          <View style={styles.movementsSummary}>
            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: theme.success + '20' }]}>
                <Feather name="arrow-down" size={18} color={theme.success} />
              </View>
              <View>
                <ThemedText style={[styles.movementLabel, { color: theme.textSecondary }]}>
                  Entrate
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.success }}>
                  {yearEndData?.movements.entriesCount || 0} mov.
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {yearEndData?.movements.entriesTotal || 0} unita
                </ThemedText>
              </View>
            </View>
            <View style={styles.movementItem}>
              <View style={[styles.movementIcon, { backgroundColor: theme.error + '20' }]}>
                <Feather name="arrow-up" size={18} color={theme.error} />
              </View>
              <View>
                <ThemedText style={[styles.movementLabel, { color: theme.textSecondary }]}>
                  Uscite
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.error }}>
                  {yearEndData?.movements.exitsCount || 0} mov.
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {yearEndData?.movements.exitsTotal || 0} unita
                </ThemedText>
              </View>
            </View>
          </View>
        </Card>

        <Spacer height={Spacing.lg} />

        <ThemedText type="h4" style={styles.sectionTitle}>
          Andamento Mensile
        </ThemedText>

        <View style={styles.monthlyGrid}>
          {monthlyData.map((item) => {
            const hasActivity = item.entries > 0 || item.exits > 0;
            return (
              <View 
                key={item.month} 
                style={[
                  styles.monthCell, 
                  { 
                    backgroundColor: hasActivity ? theme.primary + '10' : theme.backgroundSecondary,
                    borderColor: hasActivity ? theme.primary : 'transparent',
                    borderWidth: hasActivity ? 1 : 0,
                  }
                ]}
              >
                <ThemedText style={[styles.monthName, { color: theme.textSecondary }]}>
                  {MONTHS[item.month - 1]}
                </ThemedText>
                {hasActivity ? (
                  <>
                    <ThemedText style={{ color: theme.success, fontSize: 11 }}>
                      +{item.entriesQty}
                    </ThemedText>
                    <ThemedText style={{ color: theme.error, fontSize: 11 }}>
                      -{item.exitsQty}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 11 }}>
                    -
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>

        <Spacer height={Spacing.lg} />

        {yearEndData && yearEndData.snapshot.plants.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Dettaglio Piante
            </ThemedText>
            {yearEndData.snapshot.plants.slice(0, 10).map((plant, index) => (
              <View 
                key={`plant-${index}`}
                style={[styles.detailRow, { borderBottomColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={styles.detailName} numberOfLines={1}>
                  {plant.name}
                </ThemedText>
                <ThemedText type="h4">{plant.quantity}</ThemedText>
              </View>
            ))}
            {yearEndData.snapshot.plants.length > 10 ? (
              <ThemedText style={[styles.moreText, { color: theme.textSecondary }]}>
                +{yearEndData.snapshot.plants.length - 10} altre varieta
              </ThemedText>
            ) : null}
            <Spacer height={Spacing.lg} />
          </>
        ) : null}

        {recentMovements.length > 0 ? (
          <>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Ultimi Movimenti
            </ThemedText>
            {recentMovements.map((movement) => (
              <Card key={movement.id} style={styles.movementCard}>
                <View style={styles.movementCardHeader}>
                  <View style={[
                    styles.movementBadge, 
                    { backgroundColor: movement.movementType === 'entrata' ? theme.success + '20' : theme.error + '20' }
                  ]}>
                    <Feather 
                      name={movement.movementType === 'entrata' ? 'arrow-down' : 'arrow-up'} 
                      size={14} 
                      color={movement.movementType === 'entrata' ? theme.success : theme.error} 
                    />
                    <ThemedText style={{ 
                      color: movement.movementType === 'entrata' ? theme.success : theme.error,
                      fontSize: 12,
                      fontWeight: '500',
                    }}>
                      {movement.movementType === 'entrata' ? 'Entrata' : 'Uscita'}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {formatDate(movement.date)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.movementItemName} numberOfLines={1}>
                  {movement.itemName}
                </ThemedText>
                <View style={styles.movementCardFooter}>
                  <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {movement.itemType === 'pianta' ? 'Pianta' : movement.itemType === 'seme' ? 'Seme' : 'Materiale'}
                  </ThemedText>
                  <ThemedText type="h4">
                    {movement.movementType === 'entrata' ? '+' : '-'}{movement.quantity}
                  </ThemedText>
                </View>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nessun movimento registrato
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              I movimenti verranno registrati quando confermi le righe fattura
            </ThemedText>
          </Card>
        )}

        <Spacer height={Spacing["2xl"]} />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
  },
  yearSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  yearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  yearButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 24,
  },
  movementsCard: {
    padding: Spacing.lg,
  },
  movementsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movementLabel: {
    fontSize: 12,
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  monthCell: {
    width: '15%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  monthName: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  detailName: {
    flex: 1,
    marginRight: Spacing.md,
  },
  moreText: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  movementCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  movementCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  movementItemName: {
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  movementCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
