import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TextInput, Alert, Pressable, Platform, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { clearImportedData } from "@/utils/debugTools";
import { backupService } from "@/utils/backupService";
import { storageDebug } from "@/utils/storageDebug";
import { UserSettings } from "@/types";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { userCategorizationRulesStore, UserCategorizationRule } from "@/utils/userCategorizationRules";
import { ItemCategory, CATEGORY_CONFIG } from "@/utils/pendingInvoiceStore";

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, "Profile">;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    companyName: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    pendingLines: number;
    transactions: number;
    activities: number;
    benches: number;
    treatments: number;
  } | null>(null);
  const [stats, setStats] = useState({
    totalPlants: 0,
    totalActivities: 0,
    benchesWithPlants: 0,
  });
  const [userRules, setUserRules] = useState<UserCategorizationRule[]>([]);
  const [newRuleKeyword, setNewRuleKeyword] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<ItemCategory>('piante');
  const [newRuleVariety, setNewRuleVariety] = useState('');
  const [newRuleSpecies, setNewRuleSpecies] = useState('');
  const [showRulesSection, setShowRulesSection] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const [savedSettings, statsData, debugData, rules] = await Promise.all([
          storage.getSettings(),
          storage.getStats(),
          storageDebug.checkDataExists(),
          userCategorizationRulesStore.getRules(),
        ]);
        setSettings(savedSettings);
        setStats({
          totalPlants: statsData.totalPlants,
          totalActivities: statsData.recentActivities.length,
          benchesWithPlants: statsData.benchesWithPlants,
        });
        setDebugInfo(debugData);
        setUserRules(rules);
      };
      loadData();
    }, [])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await storage.saveSettings(settings);
      Alert.alert("Salvato", "Le impostazioni sono state salvate con successo");
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare le impostazioni");
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    const doClear = async () => {
      try {
        await storage.clearAllData();
        setSettings({ name: "", companyName: "", location: "" });
        setStats({ totalPlants: 0, totalActivities: 0, benchesWithPlants: 0 });
        if (Platform.OS === 'web') {
          window.alert("Tutti i dati sono stati cancellati");
        } else {
          Alert.alert("Completato", "Tutti i dati sono stati cancellati");
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert("Errore: Impossibile cancellare i dati");
        } else {
          Alert.alert("Errore", "Impossibile cancellare i dati");
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Questa azione cancellerà tutti i dati salvati nell'app. Sei sicuro?");
      if (confirmed) await doClear();
    } else {
      Alert.alert(
        "Cancella Tutti i Dati",
        "Questa azione cancellerà tutti i dati salvati nell'app. Sei sicuro?",
        [
          { text: "Annulla", style: "cancel" },
          { text: "Cancella", style: "destructive", onPress: doClear },
        ]
      );
    }
  };

  const handleClearImportedData = async () => {
    const doClear = async () => {
      try {
        const result = await clearImportedData();
        const message = `Rimossi: ${result.transactionsDeleted} transazioni, ${result.plantsDeleted} piante, ${result.materialsDeleted} materiali, ${result.productsDeleted} prodotti`;
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert("Pulizia Completata", message);
        }
        const statsData = await storage.getStats();
        setStats({
          totalPlants: statsData.totalPlants,
          totalActivities: statsData.recentActivities.length,
          benchesWithPlants: statsData.benchesWithPlants,
        });
      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert("Errore durante la pulizia");
        } else {
          Alert.alert("Errore", "Impossibile pulire i dati importati");
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Rimuovere tutte le transazioni e materiali importati da fattura?");
      if (confirmed) await doClear();
    } else {
      Alert.alert(
        "Pulisci Dati Importati",
        "Rimuovere tutte le transazioni e materiali importati da fattura?",
        [
          { text: "Annulla", style: "cancel" },
          { text: "Pulisci", style: "destructive", onPress: doClear },
        ]
      );
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const result = await backupService.exportAllData();
      Alert.alert(
        result.success ? "Esportazione Completata" : "Errore",
        result.message
      );
    } catch (error) {
      Alert.alert("Errore", "Impossibile esportare i dati");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = () => {
    const doImport = async () => {
      setImporting(true);
      try {
        const result = await backupService.importData();
        if (result.success) {
          const statsData = await storage.getStats();
          setStats({
            totalPlants: statsData.totalPlants,
            totalActivities: statsData.recentActivities.length,
            benchesWithPlants: statsData.benchesWithPlants,
          });
          const savedSettings = await storage.getSettings();
          setSettings(savedSettings);
        }
        Alert.alert(
          result.success ? "Importazione Completata" : "Errore",
          result.message
        );
      } catch (error) {
        Alert.alert("Errore", "Impossibile importare i dati");
      } finally {
        setImporting(false);
      }
    };

    Alert.alert(
      "Importa Backup",
      "I dati esistenti verranno sostituiti con quelli del backup. Continuare?",
      [
        { text: "Annulla", style: "cancel" },
        { text: "Importa", onPress: doImport },
      ]
    );
  };

  const handleTestStorage = async () => {
    try {
      const testResult = await storageDebug.testPersistence();
      const dataCheck = await storageDebug.checkDataExists();
      setDebugInfo(dataCheck);
      
      const message = [
        `Scrittura: ${testResult.canWrite ? 'OK' : 'FALLITA'}`,
        `Lettura: ${testResult.canRead ? 'OK' : 'FALLITA'}`,
        `Verifica: ${testResult.valueMatches ? 'OK' : 'FALLITA'}`,
        '',
        'Dati in memoria:',
        `- Righe fattura: ${dataCheck.pendingLines}`,
        `- Transazioni: ${dataCheck.transactions}`,
        `- Attivita: ${dataCheck.activities}`,
        `- Bancali: ${dataCheck.benches}`,
        `- Trattamenti: ${dataCheck.treatments}`,
      ].join('\n');
      
      Alert.alert('Test Storage', message);
    } catch (error) {
      Alert.alert('Errore', `Test fallito: ${error}`);
    }
  };

  const handleDumpStorage = async () => {
    try {
      await storageDebug.logAllData();
      const stats = await storageDebug.getStorageStats();
      Alert.alert(
        'Storage Dump', 
        `Totale chiavi: ${stats.totalKeys}\n\nChiavi: ${stats.keys.join(', ')}\n\n(Controlla la console per dettagli)`
      );
    } catch (error) {
      Alert.alert('Errore', `Dump fallito: ${error}`);
    }
  };

  const handleAddRule = async () => {
    if (!newRuleKeyword.trim()) {
      Alert.alert('Errore', 'Inserisci una keyword');
      return;
    }
    
    try {
      const newRule = await userCategorizationRulesStore.saveRule({
        keyword: newRuleKeyword.trim().toLowerCase(),
        itemCategory: newRuleCategory,
        forcedVariety: newRuleVariety.trim() || undefined,
        forcedSpecies: newRuleSpecies.trim() || undefined,
      });
      
      setUserRules([...userRules, newRule]);
      setNewRuleKeyword('');
      setNewRuleVariety('');
      setNewRuleSpecies('');
      Alert.alert('Successo', `Regola "${newRule.keyword}" salvata`);
    } catch (error) {
      Alert.alert('Errore', `Impossibile salvare la regola: ${error}`);
    }
  };

  const handleDeleteRule = async (ruleId: string, keyword: string) => {
    const doDelete = async () => {
      await userCategorizationRulesStore.deleteRule(ruleId);
      setUserRules(userRules.filter(r => r.id !== ruleId));
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm(`Eliminare la regola "${keyword}"?`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Conferma',
        `Eliminare la regola "${keyword}"?`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleClearAllRules = async () => {
    const doClear = async () => {
      await userCategorizationRulesStore.clearRules();
      setUserRules([]);
      Alert.alert('Completato', 'Tutte le regole eliminate');
    };
    
    if (Platform.OS === 'web') {
      if (window.confirm('Eliminare tutte le regole di categorizzazione?')) {
        await doClear();
      }
    } else {
      Alert.alert(
        'Conferma',
        'Eliminare tutte le regole di categorizzazione?',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina Tutte', style: 'destructive', onPress: doClear },
        ]
      );
    }
  };

  const categoryOptions: { value: ItemCategory; label: string }[] = [
    { value: 'piante', label: 'Piante' },
    { value: 'semi', label: 'Semi' },
    { value: 'vasi', label: 'Vasi' },
    { value: 'terriccio', label: 'Terriccio' },
    { value: 'fitofarmaco', label: 'Fitofarmaci' },
    { value: 'fertilizzante', label: 'Fertilizzanti' },
    { value: 'materiale', label: 'Materiale' },
    { value: 'utenza', label: 'Utenze' },
    { value: 'altro', label: 'Altro' },
  ];

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundDefault,
      color: theme.text,
    },
  ];

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={[styles.statsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              {stats.totalPlants}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Piante
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.activityWatering }}>
              {stats.benchesWithPlants}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Bancali
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: theme.activityTreatment }}>
              3
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              Serre
            </ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Informazioni Azienda
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Nome Responsabile
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.name}
          onChangeText={(text) => setSettings({ ...settings, name: text })}
          placeholder="Inserisci il tuo nome"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Nome Azienda
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.companyName}
          onChangeText={(text) => setSettings({ ...settings, companyName: text })}
          placeholder="Nome della tua azienda"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <Spacer height={Spacing.lg} />

      <View style={styles.fieldContainer}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Località
        </ThemedText>
        <TextInput
          style={inputStyle}
          value={settings.location}
          onChangeText={(text) => setSettings({ ...settings, location: text })}
          placeholder="Dove si trova l'azienda"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
        />
      </View>

      <Spacer height={Spacing["2xl"]} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed || saving ? 0.8 : 1,
          },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Feather name="save" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {saving ? "Salvataggio..." : "Salva Impostazioni"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Scansione Documenti
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.activityWatering,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("DocumentScan")}
      >
        <Feather name="camera" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Scansiona Documento
        </ThemedText>
      </Pressable>

      <ThemedText style={[styles.infoText, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
        Inventario piante ora disponibile in Magazzino
      </ThemedText>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Configurazione Serre
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => navigation.navigate("ConfigureGreenhouse")}
      >
        <Feather name="settings" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Configura Struttura Serre
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Backup e Ripristino
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.activityWatering,
            opacity: pressed || exporting ? 0.8 : 1,
          },
        ]}
        onPress={handleExportBackup}
        disabled={exporting}
      >
        <Feather name="download" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {exporting ? "Esportazione..." : "Esporta Backup"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: pressed || importing ? 0.8 : 1,
          },
        ]}
        onPress={handleImportBackup}
        disabled={importing}
      >
        <Feather name="upload" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          {importing ? "Importazione..." : "Importa Backup"}
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Gestione Dati
      </ThemedText>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.dangerButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.activityTreatment,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleClearImportedData}
      >
        <Feather name="refresh-cw" size={20} color={theme.activityTreatment} />
        <ThemedText style={[styles.dangerButtonText, { color: theme.activityTreatment }]}>
          Pulisci Dati Importati
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.dangerButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.error,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleClearData}
      >
        <Feather name="trash-2" size={20} color={theme.error} />
        <ThemedText style={[styles.dangerButtonText, { color: theme.error }]}>
          Cancella Tutti i Dati
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <ThemedText type="h4" style={styles.sectionTitle}>
        Diagnostica Storage
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {debugInfo ? (
        <View style={[styles.debugCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.debugRow}>
            <ThemedText style={{ color: theme.textSecondary }}>Righe fattura:</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{debugInfo.pendingLines}</ThemedText>
          </View>
          <View style={styles.debugRow}>
            <ThemedText style={{ color: theme.textSecondary }}>Transazioni:</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{debugInfo.transactions}</ThemedText>
          </View>
          <View style={styles.debugRow}>
            <ThemedText style={{ color: theme.textSecondary }}>Attivita:</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{debugInfo.activities}</ThemedText>
          </View>
          <View style={styles.debugRow}>
            <ThemedText style={{ color: theme.textSecondary }}>Bancali:</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{debugInfo.benches}</ThemedText>
          </View>
          <View style={styles.debugRow}>
            <ThemedText style={{ color: theme.textSecondary }}>Trattamenti:</ThemedText>
            <ThemedText style={{ fontWeight: '600' }}>{debugInfo.treatments}</ThemedText>
          </View>
        </View>
      ) : null}

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: '#FF9800',
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleTestStorage}
      >
        <Feather name="activity" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Test Persistenza Storage
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing.lg} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.textSecondary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={handleDumpStorage}
      >
        <Feather name="terminal" size={20} color="#FFFFFF" />
        <ThemedText style={styles.saveButtonText}>
          Mostra Chiavi Storage
        </ThemedText>
      </Pressable>

      <Spacer height={Spacing["3xl"]} />

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: showRulesSection ? theme.primary : theme.backgroundDefault,
            borderWidth: showRulesSection ? 0 : 1,
            borderColor: theme.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => setShowRulesSection(!showRulesSection)}
      >
        <Feather name="sliders" size={20} color={showRulesSection ? '#FFFFFF' : theme.primary} />
        <ThemedText style={[styles.saveButtonText, { color: showRulesSection ? '#FFFFFF' : theme.primary }]}>
          Regole di Categorizzazione ({userRules.length})
        </ThemedText>
        <Feather name={showRulesSection ? 'chevron-up' : 'chevron-down'} size={20} color={showRulesSection ? '#FFFFFF' : theme.primary} />
      </Pressable>

      {showRulesSection ? (
        <View style={{ marginTop: Spacing.lg }}>
          <View style={[styles.debugCard, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={{ fontWeight: '600', fontSize: 16, marginBottom: Spacing.md }}>
              Aggiungi Regola
            </ThemedText>

            <View style={styles.fieldContainer}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Keyword (parola chiave)
              </ThemedText>
              <TextInput
                style={inputStyle}
                value={newRuleKeyword}
                onChangeText={setNewRuleKeyword}
                placeholder="es. protea, leucospermum, terriccio"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <Spacer height={Spacing.md} />

            <View style={styles.fieldContainer}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                Categoria
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                {categoryOptions.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: newRuleCategory === opt.value ? theme.primary : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setNewRuleCategory(opt.value)}
                  >
                    <ThemedText style={{ 
                      fontSize: 12, 
                      color: newRuleCategory === opt.value ? '#FFFFFF' : theme.text,
                    }}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {(newRuleCategory === 'piante' || newRuleCategory === 'semi') ? (
              <>
                <Spacer height={Spacing.md} />
                <View style={styles.fieldContainer}>
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Varieta forzata (opzionale)
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    value={newRuleVariety}
                    onChangeText={setNewRuleVariety}
                    placeholder="es. Leucospermum cordifolium"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <Spacer height={Spacing.md} />
                <View style={styles.fieldContainer}>
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    Specie forzata (opzionale)
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    value={newRuleSpecies}
                    onChangeText={setNewRuleSpecies}
                    placeholder="es. Leucospermum"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </>
            ) : null}

            <Spacer height={Spacing.lg} />

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: theme.activityWatering,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleAddRule}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <ThemedText style={styles.saveButtonText}>
                Salva Regola
              </ThemedText>
            </Pressable>
          </View>

          {userRules.length > 0 ? (
            <View style={[styles.debugCard, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.lg }]}>
              <ThemedText style={{ fontWeight: '600', fontSize: 16, marginBottom: Spacing.md }}>
                Regole Attive ({userRules.length})
              </ThemedText>

              {userRules.map(rule => (
                <View 
                  key={rule.id} 
                  style={[
                    styles.ruleItem,
                    { borderBottomColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: '600' }}>
                      "{rule.keyword}" {'->'} {CATEGORY_CONFIG[rule.itemCategory]?.label || rule.itemCategory}
                    </ThemedText>
                    {rule.forcedVariety ? (
                      <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                        Varieta: {rule.forcedVariety}
                      </ThemedText>
                    ) : null}
                    {rule.forcedSpecies ? (
                      <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                        Specie: {rule.forcedSpecies}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => handleDeleteRule(rule.id, rule.keyword)}
                    style={{ padding: Spacing.sm }}
                  >
                    <Feather name="trash-2" size={18} color={theme.error} />
                  </Pressable>
                </View>
              ))}

              <Spacer height={Spacing.lg} />

              <Pressable
                style={({ pressed }) => [
                  styles.dangerButton,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.error,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleClearAllRules}
              >
                <Feather name="trash" size={18} color={theme.error} />
                <ThemedText style={[styles.dangerButtonText, { color: theme.error }]}>
                  Elimina Tutte le Regole
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Spacer height={Spacing["2xl"]} />

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="info" size={20} color={theme.textSecondary} />
        <View style={styles.infoText}>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
            ProteaTrack v1.0.0
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
            Gestione serre per coltivazione Proteaceae
          </ThemedText>
        </View>
      </View>

      <Spacer height={Spacing["2xl"]} />
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  fieldContainer: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
  debugCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  debugRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
});
