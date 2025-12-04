import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { Treatment, GreenhouseConfig } from "@/types";
import { NotebookStackParamList } from "@/navigation/NotebookStackNavigator";

type NavigationProp = NativeStackNavigationProp<NotebookStackParamList>;

export default function TreatmentListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, cfg] = await Promise.all([
        storage.getTreatments(),
        storage.getGreenhouseConfig(),
      ]);
      setTreatments(txs);
      setConfig(cfg);
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Elimina Trattamento',
      'Sei sicuro di voler eliminare questo trattamento dal quaderno?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteTreatment(id);
            loadData();
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const csv = await storage.exportTreatmentsAsCSV();
      const filename = `quaderno_campagna_${new Date().toISOString().split('T')[0]}.csv`;
      
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

  const getLocationString = (t: Treatment): string => {
    if (t.locationType === 'campo_aperto') {
      return t.customLocation || 'Campo aperto';
    }
    
    let location = '';
    if (t.greenhouse && config) {
      const gh = config.greenhouses.find(g => g.id === t.greenhouse);
      location = gh?.customName || `Serra ${t.greenhouse}`;
    }
    if (t.sector) {
      location += ` - Sett. ${t.sector}`;
    }
    if (t.bench) {
      location += ` - ${t.bench}`;
    }
    return location || 'Non specificata';
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Card style={styles.infoCard}>
        <Feather name="book-open" size={24} color={theme.primary} />
        <View style={styles.infoText}>
          <ThemedText style={{ fontWeight: '600' }}>Quaderno di Campagna</ThemedText>
          <ThemedText style={[styles.infoHint, { color: theme.textSecondary }]}>
            Registro dei trattamenti fitosanitari
          </ThemedText>
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryText, { color: theme.textSecondary }]}>
          {treatments.length} trattamenti registrati
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

  const renderItem = ({ item }: { item: Treatment }) => {
    return (
      <Pressable
        onPress={() => navigation.navigate('TreatmentEdit', { treatmentId: item.id })}
        onLongPress={() => handleDelete(item.id)}
      >
        <Card style={styles.treatmentCard}>
          <View style={[styles.treatmentIcon, { backgroundColor: theme.activityTreatment + '20' }]}>
            <Feather name="shield" size={20} color={theme.activityTreatment} />
          </View>
          <View style={styles.treatmentInfo}>
            <ThemedText style={styles.treatmentProduct} numberOfLines={1}>
              {item.productName || 'Prodotto non specificato'}
            </ThemedText>
            <View style={styles.treatmentMeta}>
              <ThemedText style={[styles.treatmentDetail, { color: theme.textSecondary }]}>
                {new Date(item.date).toLocaleDateString('it-IT')}
              </ThemedText>
              <ThemedText style={[styles.treatmentDetail, { color: theme.textSecondary }]}>
                {item.dosePerHl}g/hl - {item.waterLiters}L
              </ThemedText>
            </View>
            <ThemedText style={[styles.treatmentLocation, { color: theme.textSecondary }]} numberOfLines={1}>
              {getLocationString(item)}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Card>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <Card style={styles.emptyCard}>
      <Feather name="book-open" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Nessun trattamento registrato
      </ThemedText>
      <ThemedText style={[styles.emptyHint, { color: theme.textSecondary }]}>
        Registra i trattamenti fitosanitari per mantenere il quaderno di campagna aggiornato
      </ThemedText>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
      <ScreenFlatList
        data={treatments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
      
      <Pressable
        onPress={() => navigation.navigate('TreatmentEdit')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.activityTreatment, opacity: pressed ? 0.9 : 1 }
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoHint: {
    fontSize: 13,
    marginTop: 2,
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
  treatmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  treatmentIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentProduct: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  treatmentMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  treatmentDetail: {
    fontSize: 12,
  },
  treatmentLocation: {
    fontSize: 12,
    marginTop: 2,
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
