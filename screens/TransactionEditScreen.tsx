import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ScrollView as RNScrollView, Modal } from "react-native";
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
import { Transaction, TransactionCategory, TransactionType } from "@/types";
import { AccountingStackParamList } from "@/navigation/AccountingStackNavigator";

type NavigationProp = NativeStackNavigationProp<AccountingStackParamList>;
type RouteProps = RouteProp<AccountingStackParamList, 'TransactionEdit'>;

export default function TransactionEditScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { transactionId, type: initialType } = route.params || {};
  
  const [loading, setLoading] = useState(!!transactionId);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const [form, setForm] = useState({
    type: (initialType || 'costo') as TransactionType,
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    counterparty: '',
    description: '',
    docRef: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const cats = await storage.getCategories();
      setCategories(cats);
      
      if (transactionId) {
        const transactions = await storage.getTransactions();
        const tx = transactions.find(t => t.id === transactionId);
        if (tx) {
          setForm({
            type: tx.type,
            categoryId: tx.categoryId,
            amount: tx.amount.toString(),
            date: tx.date,
            counterparty: tx.counterparty,
            description: tx.description,
            docRef: tx.docRef || '',
            notes: tx.notes,
          });
        }
      } else {
        const defaultCat = cats.find(c => c.type === form.type);
        if (defaultCat) {
          setForm(f => ({ ...f, categoryId: defaultCat.id }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    setForm(f => ({ ...f, type }));
    const defaultCat = categories.find(c => c.type === type);
    if (defaultCat) {
      setForm(f => ({ ...f, categoryId: defaultCat.id }));
    }
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('Errore', 'Inserisci un importo valido');
      return;
    }
    if (!form.categoryId) {
      Alert.alert('Errore', 'Seleziona una categoria');
      return;
    }

    try {
      setSaving(true);
      const data = {
        type: form.type,
        categoryId: form.categoryId,
        amount: parseFloat(form.amount.replace(',', '.')),
        date: form.date,
        counterparty: form.counterparty.trim(),
        description: form.description.trim(),
        docRef: form.docRef.trim() || undefined,
        notes: form.notes.trim(),
        source: 'manual' as const,
      };

      if (transactionId) {
        await storage.updateTransaction(transactionId, data);
      } else {
        await storage.saveTransaction(data);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Errore', 'Impossibile salvare il movimento');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const filteredCategories = categories.filter(c => c.type === form.type);

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
          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Tipo Movimento</ThemedText>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => handleTypeChange('costo')}
              style={[
                styles.typeButton,
                { 
                  backgroundColor: form.type === 'costo' ? theme.error : theme.backgroundSecondary,
                  borderColor: form.type === 'costo' ? theme.error : theme.backgroundTertiary,
                }
              ]}
            >
              <Feather name="trending-down" size={20} color={form.type === 'costo' ? '#FFF' : theme.text} />
              <ThemedText style={[
                styles.typeText,
                { color: form.type === 'costo' ? '#FFF' : theme.text }
              ]}>
                Uscita
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleTypeChange('ricavo')}
              style={[
                styles.typeButton,
                { 
                  backgroundColor: form.type === 'ricavo' ? theme.success : theme.backgroundSecondary,
                  borderColor: form.type === 'ricavo' ? theme.success : theme.backgroundTertiary,
                }
              ]}
            >
              <Feather name="trending-up" size={20} color={form.type === 'ricavo' ? '#FFF' : theme.text} />
              <ThemedText style={[
                styles.typeText,
                { color: form.type === 'ricavo' ? '#FFF' : theme.text }
              ]}>
                Entrata
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Importo</ThemedText>
          <View style={[styles.amountRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}>
            <ThemedText style={styles.currencySymbol}>EUR</ThemedText>
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              value={form.amount}
              onChangeText={(t) => setForm({ ...form, amount: t })}
              placeholder="0,00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Categoria</ThemedText>
          <Pressable
            onPress={() => setShowCategoryPicker(true)}
            style={[styles.categorySelector, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary }]}
          >
            {selectedCategory ? (
              <View style={styles.categorySelected}>
                <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                  <Feather name={selectedCategory.icon as any} size={18} color={selectedCategory.color} />
                </View>
                <ThemedText style={styles.categoryName}>{selectedCategory.name}</ThemedText>
              </View>
            ) : (
              <ThemedText style={{ color: theme.textSecondary }}>Seleziona categoria</ThemedText>
            )}
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Pressable>

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Data</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.date}
            onChangeText={(t) => setForm({ ...form, date: t })}
            placeholder="AAAA-MM-GG"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Controparte</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.counterparty}
            onChangeText={(t) => setForm({ ...form, counterparty: t })}
            placeholder="Nome fornitore o cliente"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Descrizione</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
            placeholder="Descrizione del movimento"
            placeholderTextColor={theme.textSecondary}
          />

          <ThemedText style={[styles.label, { fontWeight: '600' }]}>Rif. Documento</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.backgroundTertiary, color: theme.text }]}
            value={form.docRef}
            onChangeText={(t) => setForm({ ...form, docRef: t })}
            placeholder="Es. Fattura n. 123"
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

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.primary, opacity: pressed || saving ? 0.7 : 1 }
            ]}
          >
            <Feather name="check" size={20} color="#FFF" />
            <ThemedText style={styles.saveButtonText}>
              {transactionId ? 'Salva Modifiche' : 'Registra Movimento'}
            </ThemedText>
          </Pressable>
        </View>
      </ScreenKeyboardAwareScrollView>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Seleziona Categoria</ThemedText>
              <Pressable onPress={() => setShowCategoryPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <RNScrollView style={styles.categoryList}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setForm({ ...form, categoryId: cat.id });
                    setShowCategoryPicker(false);
                  }}
                  style={[
                    styles.categoryOption,
                    { 
                      backgroundColor: form.categoryId === cat.id ? cat.color + '20' : 'transparent',
                      borderColor: form.categoryId === cat.id ? cat.color : theme.backgroundTertiary,
                    }
                  ]}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Feather name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <ThemedText style={styles.categoryOptionText}>{cat.name}</ThemedText>
                  {form.categoryId === cat.id ? (
                    <Feather name="check" size={20} color={cat.color} />
                  ) : null}
                </Pressable>
              ))}
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
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  typeText: {
    fontWeight: '600',
    fontSize: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    height: 52,
    fontSize: 24,
    fontWeight: '700',
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
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  categorySelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
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
  categoryList: {
    padding: Spacing.md,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
  },
});
