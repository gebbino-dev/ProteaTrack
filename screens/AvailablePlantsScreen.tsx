import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Modal, TextInput, Platform, Alert, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { plantWarehouse, GenusGroup, PlantLot } from "@/utils/plantWarehouse";
import { GreenhouseConfig } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type AvailablePlantsScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "AvailablePlants">;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface VarietyRowProps {
  lot: PlantLot;
  onDistribute: (lot: PlantLot) => void;
}

function VarietyRow({ lot, onDistribute }: VarietyRowProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatDate = (dateString: string): string => {
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const getArrivalDateDisplay = (): string | null => {
    if (!lot.sources || lot.sources.length === 0) return null;
    
    const validDates = lot.sources
      .map(s => s.arrivalDate)
      .filter(d => d && d.length > 0)
      .sort();
    
    if (validDates.length === 0) return null;
    
    const earliest = validDates[0];
    const latest = validDates[validDates.length - 1];
    
    if (earliest === latest) {
      return `Arrivo: ${formatDate(earliest)}`;
    }
    return `Arrivi: ${formatDate(earliest)} - ${formatDate(latest)}`;
  };

  const arrivalDisplay = getArrivalDateDisplay();

  return (
    <AnimatedPressable
      onPress={() => lot.availableQuantity > 0 ? onDistribute(lot) : null}
      onPressIn={() => { scale.value = withSpring(0.98); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[
        styles.varietyRow,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.varietyInfo}>
        <ThemedText style={styles.varietyName}>{lot.variety}</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
          Totale: {lot.totalQuantity.toLocaleString()} | Distribuite: {lot.distributedQuantity.toLocaleString()}
        </ThemedText>
        {arrivalDisplay ? (
          <ThemedText style={{ color: theme.activityWatering, fontSize: 11, marginTop: 2 }}>
            {arrivalDisplay}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.quantityBadge}>
        <ThemedText style={[
          styles.quantityText,
          { color: lot.availableQuantity > 0 ? theme.primary : theme.textSecondary }
        ]}>
          {lot.availableQuantity.toLocaleString()}
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>disponibili</ThemedText>
      </View>
      {lot.availableQuantity > 0 ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </AnimatedPressable>
  );
}

interface GenusCardProps {
  group: GenusGroup;
  expanded: boolean;
  onToggle: () => void;
  onDistribute: (lot: PlantLot) => void;
}

function GenusCard({ group, expanded, onToggle, onDistribute }: GenusCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const getGenusColor = (genus: string): string => {
    const colors: Record<string, string> = {
      'Protea': '#E91E63',
      'Leucospermum': '#FF9800',
      'Leucadendron': '#4CAF50',
      'Serruria': '#9C27B0',
      'Telopea': '#F44336',
      'Banksia': '#795548',
      'Grevillea': '#00BCD4',
      'Altro': '#607D8B',
    };
    return colors[genus] || theme.primary;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.genusCard, { backgroundColor: theme.backgroundSecondary }]}>
      <AnimatedPressable
        onPress={onToggle}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.genusHeader, animatedStyle]}
      >
        <View style={[styles.genusIcon, { backgroundColor: getGenusColor(group.genus) }]}>
          <Feather name="sun" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.genusInfo}>
          <ThemedText type="h4">{group.genus}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {group.varieties.length} varietà
          </ThemedText>
        </View>
        <View style={styles.genusTotalBadge}>
          <ThemedText style={[styles.genusTotalText, { color: theme.primary }]}>
            {group.totalPlants.toLocaleString()}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 10 }}>piante</ThemedText>
        </View>
        <Feather 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color={theme.textSecondary} 
        />
      </AnimatedPressable>
      
      {expanded ? (
        <View style={styles.varietiesList}>
          {group.varieties.map((lot, index) => (
            <VarietyRow 
              key={`${lot.variety}-${index}`} 
              lot={lot} 
              onDistribute={onDistribute}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AvailablePlantsScreen({ navigation }: AvailablePlantsScreenProps) {
  const { theme } = useTheme();
  const [genusGroups, setGenusGroups] = useState<GenusGroup[]>([]);
  const [expandedGenus, setExpandedGenus] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLot, setSelectedLot] = useState<PlantLot | null>(null);
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);
  const [selectedGreenhouse, setSelectedGreenhouse] = useState<number>(1);
  const [selectedSector, setSelectedSector] = useState<number>(1);
  const [quantity, setQuantity] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groups, greenhouseConfig] = await Promise.all([
        plantWarehouse.getGroupedByGenus(),
        storage.getGreenhouseConfig(),
      ]);
      setGenusGroups(groups);
      setConfig(greenhouseConfig);
      
      if (groups.length > 0) {
        setExpandedGenus(new Set([groups[0].genus]));
      }
    } catch (error) {
      console.error('Error loading plant data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  const handleDistribute = (lot: PlantLot) => {
    setSelectedLot(lot);
    setQuantity("");
    setSelectedGreenhouse(1);
    setSelectedSector(1);
    setModalVisible(true);
  };

  const confirmDistribution = async () => {
    if (!selectedLot) return;
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      if (Platform.OS === 'web') {
        window.alert("Inserisci una quantità valida");
      } else {
        Alert.alert("Errore", "Inserisci una quantità valida");
      }
      return;
    }
    
    if (qty > selectedLot.availableQuantity) {
      if (Platform.OS === 'web') {
        window.alert(`Quantità massima disponibile: ${selectedLot.availableQuantity}`);
      } else {
        Alert.alert("Errore", `Quantità massima disponibile: ${selectedLot.availableQuantity}`);
      }
      return;
    }
    
    try {
      await plantWarehouse.saveDistribution({
        variety: selectedLot.variety,
        genus: selectedLot.genus,
        greenhouse: selectedGreenhouse,
        sector: selectedSector,
        quantity: qty,
        distributionDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      
      setModalVisible(false);
      loadData();
      
      const message = `${qty} piante di ${selectedLot.variety} distribuite nel Settore ${selectedSector} della Serra ${selectedGreenhouse}`;
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert("Distribuzione Completata", message);
      }
    } catch (error) {
      console.error('Error saving distribution:', error);
      if (Platform.OS === 'web') {
        window.alert("Errore durante la distribuzione");
      } else {
        Alert.alert("Errore", "Impossibile salvare la distribuzione");
      }
    }
  };

  const totalPlants = genusGroups.reduce((sum, g) => sum + g.totalPlants, 0);
  const totalVarieties = genusGroups.reduce((sum, g) => sum + g.varieties.length, 0);

  const getSectorsForGreenhouse = (greenhouseId: number): number[] => {
    if (!config) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const greenhouse = config.greenhouses.find(g => g.id === greenhouseId);
    if (!greenhouse) return [];
    return greenhouse.sectors.map(s => s.id);
  };

  return (
    <ScreenScrollView>
      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Feather name="sun" size={24} color={theme.primary} />
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {totalPlants.toLocaleString()}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Piante Disponibili
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.summaryItem}>
            <Feather name="layers" size={24} color={theme.activityTreatment} />
            <ThemedText type="h2" style={{ color: theme.activityTreatment }}>
              {totalVarieties}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Varietà
            </ThemedText>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.summaryItem}>
            <Feather name="grid" size={24} color={theme.activityWatering} />
            <ThemedText type="h2" style={{ color: theme.activityWatering }}>
              {genusGroups.length}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Generi
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing.xl} />

      {loading ? (
        <ThemedView style={styles.emptyState}>
          <ThemedText>Caricamento...</ThemedText>
        </ThemedView>
      ) : genusGroups.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Feather name="inbox" size={48} color={theme.textSecondary} />
          <Spacer height={Spacing.lg} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Nessuna pianta in magazzino.{"\n"}Importa fatture per popolare l'inventario.
          </ThemedText>
        </ThemedView>
      ) : (
        genusGroups.map((group) => (
          <React.Fragment key={group.genus}>
            <GenusCard
              group={group}
              expanded={expandedGenus.has(group.genus)}
              onToggle={() => handleToggleGenus(group.genus)}
              onDistribute={handleDistribute}
            />
            <Spacer height={Spacing.md} />
          </React.Fragment>
        ))
      )}

      <Spacer height={Spacing["3xl"]} />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Distribuisci Piante</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <KeyboardAwareScrollView 
              style={styles.modalScrollContent}
              contentContainerStyle={styles.modalScrollContainer}
            >
              {selectedLot ? (
                <>
                  <View style={[styles.selectedPlantInfo, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="h4" style={{ color: theme.primary }}>
                      {selectedLot.variety}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      Disponibili: {selectedLot.availableQuantity.toLocaleString()} piante
                    </ThemedText>
                  </View>

                  <Spacer height={Spacing.xl} />

                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Serra
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
                    {config?.greenhouses.map(gh => (
                      <Pressable
                        key={gh.id}
                        style={[
                          styles.selectorButton,
                          { 
                            backgroundColor: selectedGreenhouse === gh.id 
                              ? theme.primary 
                              : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => {
                          setSelectedGreenhouse(gh.id);
                          const sectors = getSectorsForGreenhouse(gh.id);
                          if (sectors.length > 0) setSelectedSector(sectors[0]);
                        }}
                      >
                        <ThemedText style={{ 
                          color: selectedGreenhouse === gh.id ? '#FFFFFF' : theme.text 
                        }}>
                          Serra {gh.id}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Spacer height={Spacing.lg} />

                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Settore
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
                    {getSectorsForGreenhouse(selectedGreenhouse).map(sector => (
                      <Pressable
                        key={sector}
                        style={[
                          styles.selectorButton,
                          { 
                            backgroundColor: selectedSector === sector 
                              ? theme.activityWatering 
                              : theme.backgroundSecondary,
                          },
                        ]}
                        onPress={() => setSelectedSector(sector)}
                      >
                        <ThemedText style={{ 
                          color: selectedSector === sector ? '#FFFFFF' : theme.text 
                        }}>
                          {sector}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Spacer height={Spacing.lg} />

                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Quantità da distribuire
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.quantityInput,
                      { backgroundColor: theme.backgroundSecondary, color: theme.text },
                    ]}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder={`Max ${selectedLot.availableQuantity}`}
                    placeholderTextColor={theme.textSecondary}
                  />

                  <Spacer height={Spacing.xl} />

                  <Pressable
                    style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                    onPress={confirmDistribution}
                  >
                    <Feather name="check" size={20} color="#FFFFFF" />
                    <ThemedText style={styles.confirmButtonText}>
                      Conferma Distribuzione
                    </ThemedText>
                  </Pressable>

                  <Spacer height={Spacing.xl} />
                </>
              ) : null}
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  genusCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  genusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  genusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genusInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  genusTotalBadge: {
    alignItems: 'flex-end',
    marginRight: Spacing.md,
  },
  genusTotalText: {
    fontSize: 20,
    fontWeight: '700',
  },
  varietiesList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingLeft: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  varietyInfo: {
    flex: 1,
  },
  varietyName: {
    fontSize: 15,
    fontWeight: '500',
  },
  quantityBadge: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    padding: Spacing["3xl"],
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    maxHeight: '80%',
  },
  modalScrollContent: {
    flex: 1,
  },
  modalScrollContainer: {
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPlantInfo: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  selectorButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  quantityInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 18,
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
