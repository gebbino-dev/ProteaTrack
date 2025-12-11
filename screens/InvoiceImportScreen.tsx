import React, { useState } from "react";
import { View, StyleSheet, Alert, Platform, ScrollView, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import Spacer from "@/components/Spacer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  parseInvoiceXml, 
  extractInventoryItems, 
  ParsedInvoice,
  getDocumentTypeDescription,
  formatCurrency,
  InventoryImportItem 
} from "@/utils/xmlImportService";
import { inventoryStore } from "@/utils/inventoryStore";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_REVENUE_CATEGORIES } from "@/types";
import { AccountingStackParamList } from "@/navigation/AccountingStackNavigator";

type InvoiceImportScreenProps = {
  navigation: NativeStackNavigationProp<AccountingStackParamList, "InvoiceImport">;
};

export default function InvoiceImportScreen({ navigation }: InvoiceImportScreenProps) {
  const { theme } = useTheme();
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryImportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const pickDocument = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/xml", "application/xml", "*/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      
      if (Platform.OS === "web") {
        const response = await fetch(file.uri);
        const xmlContent = await response.text();
        processXml(xmlContent);
      } else {
        const xmlContent = await FileSystem.readAsStringAsync(file.uri);
        processXml(xmlContent);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Errore", "Impossibile leggere il file selezionato");
    } finally {
      setLoading(false);
    }
  };

  const processXml = (xmlContent: string) => {
    try {
      const parsed = parseInvoiceXml(xmlContent);
      setParsedInvoice(parsed);
      
      const items = extractInventoryItems(parsed);
      setInventoryItems(items);
      
      const categories = parsed.transaction.type === "costo" 
        ? DEFAULT_EXPENSE_CATEGORIES 
        : DEFAULT_REVENUE_CATEGORIES;
      
      const suggestedCat = categories.find(c => 
        c.id === parsed.transaction.categoryId
      );
      setSelectedCategory(suggestedCat?.id || categories[0].id);
      
    } catch (error) {
      console.error("Error parsing XML:", error);
      Alert.alert("Errore", "Il file XML non è una fattura elettronica valida");
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedInvoice) return;

    try {
      setLoading(true);

      const result = await inventoryStore.processInvoiceImport(
        parsedInvoice,
        inventoryItems,
        selectedCategory
      );

      const messageParts = [
        `Fattura ${parsedInvoice.documentNumber} importata con successo.`,
        `Importo: ${formatCurrency(parsedInvoice.totalAmount)}`,
      ];

      if (result.plantsAdded > 0) {
        messageParts.push(`Piante registrate: ${result.plantsAdded} lotti`);
      }
      if (result.materialsAdded > 0) {
        messageParts.push(`Materiali registrati: ${result.materialsAdded}`);
      }
      if (result.productsAdded > 0) {
        messageParts.push(`Prodotti fitosanitari: ${result.productsAdded}`);
      }

      Alert.alert(
        "Importazione completata",
        messageParts.join("\n"),
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error saving import:", error);
      Alert.alert("Errore", "Impossibile salvare i dati importati");
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeIcon = (itemType: string): string => {
    switch (itemType) {
      case "piante": return "sun";
      case "vasi": return "package";
      case "terriccio": return "layers";
      case "fitofarmaco": return "shield";
      case "fertilizzante": return "droplet";
      default: return "box";
    }
  };

  const getItemTypeColor = (itemType: string): string => {
    switch (itemType) {
      case "piante": return theme.primary;
      case "vasi": return theme.activityFertilizing;
      case "terriccio": return theme.activityOther;
      case "fitofarmaco": return theme.activityTreatment;
      case "fertilizzante": return theme.activityWatering;
      default: return theme.textSecondary;
    }
  };

  const categories = parsedInvoice?.transaction.type === "costo" 
    ? DEFAULT_EXPENSE_CATEGORIES 
    : DEFAULT_REVENUE_CATEGORIES;

  const expenseColor = "#F44336";
  const incomeColor = "#4CAF50";

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView>
        <ThemedText type="h2">Importa Fattura XML</ThemedText>
        <Spacer height={Spacing.sm} />
        <ThemedText style={{ color: theme.textSecondary }}>
          Seleziona un file XML di fattura elettronica italiana (formato SDI)
        </ThemedText>
        
        <Spacer height={Spacing.xl} />
        
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={pickDocument}
          disabled={loading}
        >
          <Feather name="file-text" size={20} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {loading ? "Caricamento..." : "Seleziona File XML"}
          </ThemedText>
        </Pressable>

        {parsedInvoice ? (
          <>
            <Spacer height={Spacing["2xl"]} />
            
            <Card>
              <View style={styles.invoiceHeader}>
                <View style={[
                  styles.typeIndicator,
                  { backgroundColor: parsedInvoice.transaction.type === "costo" 
                    ? expenseColor 
                    : incomeColor 
                  }
                ]} />
                <View style={styles.invoiceHeaderText}>
                  <ThemedText type="h3">
                    {getDocumentTypeDescription(parsedInvoice.documentType)} n. {parsedInvoice.documentNumber}
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary }}>
                    {new Date(parsedInvoice.documentDate).toLocaleDateString("it-IT")}
                  </ThemedText>
                </View>
              </View>
              
              <Spacer height={Spacing.md} />
              
              <View style={styles.partyRow}>
                <Feather name="user" size={16} color={theme.textSecondary} />
                <ThemedText style={styles.partyText}>
                  {parsedInvoice.transaction.type === "costo" 
                    ? `Fornitore: ${parsedInvoice.supplier?.denomination || "N/D"}`
                    : `Cliente: ${parsedInvoice.customer?.denomination || "N/D"}`
                  }
                </ThemedText>
              </View>
              
              {parsedInvoice.supplier?.vatNumber ? (
                <View style={styles.partyRow}>
                  <Feather name="hash" size={16} color={theme.textSecondary} />
                  <ThemedText style={[styles.partyText, { color: theme.textSecondary }]}>
                    P.IVA: {parsedInvoice.supplier.vatNumber}
                  </ThemedText>
                </View>
              ) : null}
              
              <Spacer height={Spacing.lg} />
              
              <View style={[styles.totalsCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.totalRow}>
                  <ThemedText>Imponibile:</ThemedText>
                  <ThemedText style={{ fontWeight: "600" }}>
                    {formatCurrency(parsedInvoice.totalTaxable)}
                  </ThemedText>
                </View>
                <View style={styles.totalRow}>
                  <ThemedText>IVA:</ThemedText>
                  <ThemedText style={{ fontWeight: "600" }}>
                    {formatCurrency(parsedInvoice.totalVat)}
                  </ThemedText>
                </View>
                <View style={[styles.totalRow, styles.grandTotal]}>
                  <ThemedText type="h3">Totale:</ThemedText>
                  <ThemedText type="h3" style={{ 
                    color: parsedInvoice.transaction.type === "costo" 
                      ? expenseColor 
                      : incomeColor 
                  }}>
                    {formatCurrency(parsedInvoice.totalAmount)}
                  </ThemedText>
                </View>
              </View>
            </Card>

            <Spacer height={Spacing.xl} />
            
            <ThemedText type="h3">Righe Fattura ({parsedInvoice.lineItems.length})</ThemedText>
            <Spacer height={Spacing.md} />
            
            {parsedInvoice.lineItems.map((item, index) => (
              <View key={index}>
                <Card>
                  <View style={styles.lineItemHeader}>
                    <View style={[
                      styles.itemTypeIcon,
                      { backgroundColor: getItemTypeColor(item.itemType || "altro") + "20" }
                    ]}>
                      <Feather 
                        name={getItemTypeIcon(item.itemType || "altro") as any} 
                        size={16} 
                        color={getItemTypeColor(item.itemType || "altro")} 
                      />
                    </View>
                    <View style={styles.lineItemContent}>
                      <ThemedText numberOfLines={2} style={{ fontWeight: "500" }}>
                        {item.description}
                      </ThemedText>
                      <View style={styles.lineItemDetails}>
                        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
                          {item.quantity} {item.unitOfMeasure || "pz"} x {formatCurrency(item.unitPrice)}
                        </ThemedText>
                        <ThemedText style={{ fontWeight: "600" }}>
                          {formatCurrency(item.totalPrice)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </Card>
                <Spacer height={Spacing.sm} />
              </View>
            ))}

            {parsedInvoice.vatSummaries.length > 0 ? (
              <>
                <Spacer height={Spacing.lg} />
                <ThemedText type="h3">Riepilogo IVA</ThemedText>
                <Spacer height={Spacing.md} />
                
                {parsedInvoice.vatSummaries.map((vat, index) => (
                  <View key={index} style={[styles.vatRow, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText>Aliquota {vat.vatRate}%</ThemedText>
                    <View style={styles.vatAmounts}>
                      <ThemedText style={{ color: theme.textSecondary, marginRight: Spacing.md }}>
                        Imponibile: {formatCurrency(vat.taxableAmount)}
                      </ThemedText>
                      <ThemedText style={{ fontWeight: "600" }}>
                        IVA: {formatCurrency(vat.vatAmount)}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            <Spacer height={Spacing.xl} />
            
            <ThemedText type="h3">Categoria</ThemedText>
            <Spacer height={Spacing.md} />
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { 
                        backgroundColor: selectedCategory === cat.id 
                          ? theme.primary 
                          : theme.backgroundSecondary 
                      }
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <ThemedText style={{ 
                      color: selectedCategory === cat.id ? "#FFFFFF" : theme.text,
                      fontSize: 14,
                    }}>
                      {cat.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Spacer height={Spacing["2xl"]} />
            
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
              onPress={handleConfirmImport}
              disabled={loading}
            >
              <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {loading ? "Importazione..." : "Conferma Importazione"}
              </ThemedText>
            </Pressable>
            
            <Spacer height={Spacing.md} />
            
            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.primary }]}
              onPress={() => navigation.goBack()}
            >
              <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
                Annulla
              </ThemedText>
            </Pressable>
          </>
        ) : null}
        
        <Spacer height={Spacing["3xl"]} />
      </ScreenScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  invoiceHeaderText: {
    flex: 1,
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  partyText: {
    marginLeft: Spacing.sm,
  },
  totalsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  grandTotal: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  lineItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  lineItemContent: {
    flex: 1,
  },
  lineItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  vatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  vatAmounts: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryRow: {
    flexDirection: "row",
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
});
