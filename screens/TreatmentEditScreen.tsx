import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView as RNScrollView, Modal, Switch } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { Treatment, GreenhouseConfig, PhytosanitaryProduct, LocationType } from "@/types";
import { NotebookStackParamList } from "@/navigation/NotebookStackNavigator";

type NavigationProp = NativeStackNavigationProp<NotebookStackParamList>;
type RouteProps = RouteProp<NotebookStackParamList, 'TreatmentEdit'>;

export default function TreatmentEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { treatmentId, greenhouse: presetGreenhouse, sector: presetSector } = route.params || {};
  
  const [loading, setLoading] = useState(!!treatmentId);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);
  const [products, setProducts] = useState<PhytosanitaryProduct[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [createActivity, setCreateActivity] = useState(true);
  
  const [form, setForm] = useState({
    locationType: 'serra' as LocationType,
    greenhouse: null as number | null,
    sectors: [] as number[],
    customLocation: '',
    productId: '',
    productName: '',
    dosePerHl: '',
    waterLiters: '',
    areaM2: '',
    targetPest: '',
    date: new Date().toISOString().split('T')[0],
    weatherConditions: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cfg, prods] = await Promise.all([
        storage.getGreenhouseConfig(),
        storage.getProducts(),
      ]);
      setConfig(cfg);
      setProducts(prods);
      
      if (treatmentId) {
        const treatments = await storage.getTreatments();
        const tx = treatments.find(t => t.id === treatmentId);
        if (tx) {
          setForm({
            locationType: tx.locationType,
            greenhouse: tx.greenhouse,
            sectors: tx.sector ? [tx.sector] : [],
            customLocation: tx.customLocation,
            productId: tx.productId,
            productName: tx.productName,
            dosePerHl: tx.dosePerHl.toString(),
            waterLiters: tx.waterLiters.toString(),
            areaM2: tx.areaM2?.toString() || '',
            targetPest: tx.targetPest || '',
            date: tx.date,
            weatherConditions: tx.weatherConditions || '',
            notes: tx.notes,
          });
          setCreateActivity(false);
        }
      } else if (presetGreenhouse !== undefined || presetSector !== undefined) {
        setForm(prev => ({
          ...prev,
          greenhouse: presetGreenhouse ?? null,
          sectors: presetSector !== undefined ? [presetSector] : [],
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.productName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del prodotto');
      return;
    }
    if (!form.dosePerHl || parseFloat(form.dosePerHl) <= 0) {
      Alert.alert('Errore', 'Inserisci una dose valida');
      return;
    }
    if (!form.waterLiters || parseFloat(form.waterLiters) <= 0) {
      Alert.alert('Errore', 'Inserisci i litri di acqua');
      return;
    }
    if (form.locationType === 'serra' && form.sectors.length === 0 && !form.greenhouse) {
      Alert.alert('Errore', 'Seleziona almeno una ubicazione');
      return;
    }

    try {
      setSaving(true);
      
      const baseData = {
        locationType: form.locationType,
        greenhouse: form.greenhouse,
        bench: null as string | null,
        customLocation: form.customLocation.trim(),
        productId: form.productId,
        productName: form.productName.trim(),
        dosePerHl: parseFloat(form.dosePerHl.replace(',', '.')),
        waterLiters: parseFloat(form.waterLiters.replace(',', '.')),
        areaM2: form.areaM2 ? parseFloat(form.areaM2.replace(',', '.')) : undefined,
        targetPest: form.targetPest.trim() || undefined,
        date: form.date,
        weatherConditions: form.weatherConditions.trim() || undefined,
        notes: form.notes.trim(),
      };

      if (treatmentId) {
        await storage.updateTreatment(treatmentId, {
          ...baseData,
          sector: form.sectors.length > 0 ? form.sectors[0] : null,
        });
      } else {
        const sectorsToSave = form.sectors.length > 0 ? form.sectors : [null];
        
        for (const sector of sectorsToSave) {
          const treatment = await storage.saveTreatment({
            ...baseData,
            sector,
          });
          
          if (createActivity) {
            await storage.saveActivity({
              type: 'trattamento',
              greenhouse: form.greenhouse,
              sector,
              bench: null,
              locationType: form.locationType,
              customLocation: form.customLocation,
              date: form.date,
              notes: `${form.productName} - ${form.dosePerHl}g/hl - ${form.waterLiters}L${form.targetPest ? ` - ${form.targetPest}` : ''}`,
            });
          }
        }
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving treatment:', error);
      Alert.alert('Errore', 'Impossibile salvare il trattamento');
    } finally {
      setSaving(false);
    }
  };

  const getLocationString = (): string => {
    if (form.locationType === 'campo_aperto') {
      return form.customLocation || 'Campo aperto';
    }
    
    if (!form.greenhouse) return 'Seleziona ubicazione';
    
    let location = '';
    if (config) {
      const gh = config.greenhouses.find(g => g.id === form.greenhouse);
      location = gh?.customName || `Serra ${form.greenhouse}`;
      
      if (form.sectors.length > 0) {
        const totalSectors = gh?.sectors.length || 12;
        if (form.sectors.length === totalSectors) {
          location += ' - Tutti i settori';
        } else if (form.sectors.length <= 3) {
          location += ` - Sett. ${form.sectors.join(', ')}`;
        } else {
          location += ` - ${form.sectors.length} settori`;
        }
      }
    }
    return location;
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText>Caricamento...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenKeyboardAwareScrollView>
        <View style={styles.content}>
          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Prodotto Fitosanitario</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.productName}
            onChangeText={(t) => setForm({ ...form, productName: t })}
            placeholder="Nome del prodotto"
            placeholderTextColor={theme.textSecondary}
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <ThemedText style={[styles.label, { fontWeight: '600' }]}>Dose (g/hl)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
                value={form.dosePerHl}
                onChangeText={(t) => setForm({ ...form, dosePerHl: t })}
                placeholder="100"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfField}>
              <ThemedText style={[styles.label, { fontWeight: '600' }]}>Acqua (L)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
                value={form.waterLiters}
                onChangeText={(t) => setForm({ ...form, waterLiters: t })}
                placeholder="1000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Ubicazione</ThemedText>
          <View style={styles.locationTypeRow}>
            <Pressable
              onPress={() => setForm({ ...form, locationType: 'serra', customLocation: '' })}
              style={[
                styles.locationTypeButton,
                { 
                  backgroundColor: form.locationType === 'serra' ? theme.primary : theme.backgroundSecondary,
                  borderColor: form.locationType === 'serra' ? theme.primary : theme.backgroundTertiary,
                }
              ]}
            >
              <Feather name="grid" size={18} color={form.locationType === 'serra' ? '#FFF' : theme.text} />
              <ThemedText style={{ color: form.locationType === 'serra' ? '#FFF' : theme.text, fontWeight: '500' }}>
                Serra
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setForm({ ...form, locationType: 'campo_aperto', greenhouse: null, sectors: [] })}
              style={[
                styles.locationTypeButton,
                { 
                  backgroundColor: form.locationType === 'campo_aperto' ? theme.primary : theme.backgroundSecondary,
                  borderColor: form.locationType === 'campo_aperto' ? theme.primary : theme.backgroundTertiary,
                }
              ]}
            >
              <Feather name="sun" size={18} color={form.locationType === 'campo_aperto' ? '#FFF' : theme.text} />
              <ThemedText style={{ color: form.locationType === 'campo_aperto' ? '#FFF' : theme.text, fontWeight: '500' }}>
                Campo
              </ThemedText>
            </Pressable>
          </View>

          {form.locationType === 'serra' ? (
            <Pressable
              onPress={() => setShowLocationPicker(true)}
              style={[styles.locationSelector, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}
            >
              <Feather name="map-pin" size={20} color={theme.primary} />
              <ThemedText style={styles.locationText}>{getLocationString()}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
              value={form.customLocation}
              onChangeText={(t) => setForm({ ...form, customLocation: t })}
              placeholder="Nome zona o campo"
              placeholderTextColor={theme.textSecondary}
            />
          )}

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Data Trattamento</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.date}
            onChangeText={(t) => setForm({ ...form, date: t })}
            placeholder="AAAA-MM-GG"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Avversità Trattata</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.targetPest}
            onChangeText={(t) => setForm({ ...form, targetPest: t })}
            placeholder="Es. Afidi, Oidio, ecc."
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Condizioni Meteo</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.weatherConditions}
            onChangeText={(t) => setForm({ ...form, weatherConditions: t })}
            placeholder="Es. Soleggiato, 22°C"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Note</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.notes}
            onChangeText={(t) => setForm({ ...form, notes: t })}
            placeholder="Note aggiuntive"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />

          {!treatmentId ? (
            <View style={[styles.switchRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}>
              <View style={styles.switchInfo}>
                <ThemedText style={styles.switchLabel}>Registra anche come attività</ThemedText>
                <ThemedText style={[styles.switchHint, { color: theme.textSecondary }]}>
                  Aggiunge il trattamento al calendario attività
                </ThemedText>
              </View>
              <Switch
                value={createActivity}
                onValueChange={setCreateActivity}
                trackColor={{ false: theme.backgroundTertiary, true: theme.primary + '60' }}
                thumbColor={createActivity ? theme.primary : theme.textSecondary}
              />
            </View>
          ) : null}

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.activityTreatment, opacity: pressed || saving ? 0.7 : 1 }
            ]}
          >
            <Feather name="check" size={20} color="#FFF" />
            <ThemedText style={styles.saveButtonText}>
              {treatmentId ? 'Salva Modifiche' : 'Registra Trattamento'}
            </ThemedText>
          </Pressable>
        </View>
      </ScreenKeyboardAwareScrollView>

      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowLocationPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Seleziona Ubicazione</ThemedText>
              <Pressable onPress={() => setShowLocationPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <RNScrollView style={styles.locationList}>
              {config?.greenhouses.map((gh) => {
                const allSectorIds = gh.sectors.map(s => s.id);
                const allSelected = form.greenhouse === gh.id && 
                  allSectorIds.every(id => form.sectors.includes(id));
                
                return (
                  <View key={gh.id}>
                    <Pressable
                      onPress={() => {
                        setForm({ ...form, greenhouse: gh.id, sectors: [] });
                      }}
                      style={[
                        styles.locationOption,
                        { 
                          backgroundColor: form.greenhouse === gh.id ? theme.primary + '20' : 'transparent',
                          borderColor: form.greenhouse === gh.id ? theme.primary : theme.backgroundTertiary,
                        }
                      ]}
                    >
                      <Feather name="home" size={20} color={theme.primary} />
                      <ThemedText style={styles.locationOptionText}>
                        {gh.customName || `Serra ${gh.id}`}
                      </ThemedText>
                      {form.greenhouse === gh.id ? (
                        <Feather name="chevron-down" size={20} color={theme.primary} />
                      ) : null}
                    </Pressable>
                    
                    {form.greenhouse === gh.id ? (
                      <View style={styles.sectorSection}>
                        <Pressable
                          onPress={() => {
                            if (allSelected) {
                              setForm({ ...form, sectors: [] });
                            } else {
                              setForm({ ...form, sectors: allSectorIds });
                            }
                          }}
                          style={[
                            styles.selectAllButton,
                            { 
                              backgroundColor: allSelected ? theme.primary : theme.backgroundSecondary,
                              borderColor: theme.primary,
                            }
                          ]}
                        >
                          <Feather 
                            name={allSelected ? "check-square" : "square"} 
                            size={18} 
                            color={allSelected ? '#FFF' : theme.primary} 
                          />
                          <ThemedText style={{ color: allSelected ? '#FFF' : theme.primary, fontWeight: '600' }}>
                            Seleziona Tutti
                          </ThemedText>
                        </Pressable>
                        
                        <View style={styles.sectorList}>
                          {gh.sectors.map((sect) => {
                            const isSelected = form.sectors.includes(sect.id);
                            return (
                              <Pressable
                                key={sect.id}
                                onPress={() => {
                                  if (isSelected) {
                                    setForm({ ...form, sectors: form.sectors.filter(s => s !== sect.id) });
                                  } else {
                                    setForm({ ...form, sectors: [...form.sectors, sect.id].sort((a, b) => a - b) });
                                  }
                                }}
                                style={[
                                  styles.sectorOption,
                                  { 
                                    backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                  }
                                ]}
                              >
                                <ThemedText style={[styles.sectorText, { color: isSelected ? '#FFF' : theme.text }]}>
                                  {sect.customName || `${sect.id}`}
                                </ThemedText>
                              </Pressable>
                            );
                          })}
                        </View>
                        
                        <Pressable
                          onPress={() => setShowLocationPicker(false)}
                          style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                        >
                          <Feather name="check" size={18} color="#FFF" />
                          <ThemedText style={{ color: '#FFF', fontWeight: '600' }}>
                            Conferma ({form.sectors.length > 0 ? `${form.sectors.length} settori` : 'Tutta la serra'})
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </RNScrollView>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: Spacing.sm,
  },
  label: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  locationTypeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  locationTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 12,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  locationList: {
    padding: Spacing.md,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  locationOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  sectorSection: {
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  sectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    minWidth: 48,
    justifyContent: 'center',
  },
  sectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});
