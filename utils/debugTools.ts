import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction, PlantRecord, PhytosanitaryProduct } from "@/types";

const STORAGE_KEYS = {
  TRANSACTIONS: "serra_transactions",
  PLANTS: "serra_plants",
  MATERIALS: "serra_materials",
  PHYTOSANITARY_PRODUCTS: "serra_phytosanitary_products",
};

export async function resetAllData(): Promise<{
  transactionsDeleted: number;
  plantsDeleted: number;
  materialsDeleted: number;
  productsDeleted: number;
}> {
  const result = {
    transactionsDeleted: 0,
    plantsDeleted: 0,
    materialsDeleted: 0,
    productsDeleted: 0,
  };

  try {
    const transactionsJson = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (transactionsJson) {
      const transactions = JSON.parse(transactionsJson);
      result.transactionsDeleted = Array.isArray(transactions) ? transactions.length : 0;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);

    const plantsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANTS);
    if (plantsJson) {
      const plants = JSON.parse(plantsJson);
      result.plantsDeleted = Array.isArray(plants) ? plants.length : 0;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.PLANTS);

    const materialsJson = await AsyncStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (materialsJson) {
      const materials = JSON.parse(materialsJson);
      result.materialsDeleted = Array.isArray(materials) ? materials.length : 0;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.MATERIALS);

    const productsJson = await AsyncStorage.getItem(STORAGE_KEYS.PHYTOSANITARY_PRODUCTS);
    if (productsJson) {
      const products = JSON.parse(productsJson);
      result.productsDeleted = Array.isArray(products) ? products.length : 0;
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.PHYTOSANITARY_PRODUCTS);

    console.log("[DEBUG] Reset all data:", result);
    return result;
  } catch (error) {
    console.error("[DEBUG] Error resetting data:", error);
    throw error;
  }
}

export async function clearImportedData(): Promise<{
  transactionsDeleted: number;
  plantsDeleted: number;
  materialsDeleted: number;
  productsDeleted: number;
}> {
  const result = {
    transactionsDeleted: 0,
    plantsDeleted: 0,
    materialsDeleted: 0,
    productsDeleted: 0,
  };

  try {
    const transactionsJson = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (transactionsJson) {
      const transactions: Transaction[] = JSON.parse(transactionsJson);
      const filtered = transactions.filter(t => t.source !== "import");
      result.transactionsDeleted = transactions.length - filtered.length;
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
    }

    const plantsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANTS);
    if (plantsJson) {
      const plants: PlantRecord[] = JSON.parse(plantsJson);
      const filtered = plants.filter(p => !p.sourceDocument?.startsWith("Fattura"));
      result.plantsDeleted = plants.length - filtered.length;
      await AsyncStorage.setItem(STORAGE_KEYS.PLANTS, JSON.stringify(filtered));
    }

    const materialsJson = await AsyncStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (materialsJson) {
      const parsed = JSON.parse(materialsJson);
      const materials: any[] = parsed.materials || [];
      const filtered = materials.filter(m => !m.sourceDocument?.startsWith("Fattura"));
      result.materialsDeleted = materials.length - filtered.length;
      await AsyncStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify({ materials: filtered }));
    }

    const productsJson = await AsyncStorage.getItem(STORAGE_KEYS.PHYTOSANITARY_PRODUCTS);
    if (productsJson) {
      const products: PhytosanitaryProduct[] = JSON.parse(productsJson);
      const filtered = products.filter(p => !p.notes?.includes("Importato da fattura"));
      result.productsDeleted = products.length - filtered.length;
      await AsyncStorage.setItem(STORAGE_KEYS.PHYTOSANITARY_PRODUCTS, JSON.stringify(filtered));
    }

    console.log("[DEBUG] Cleared imported data:", result);
    return result;
  } catch (error) {
    console.error("[DEBUG] Error clearing imported data:", error);
    throw error;
  }
}

export async function getDataStats(): Promise<{
  transactions: number;
  plants: number;
  materials: number;
  products: number;
  importedTransactions: number;
}> {
  const stats = {
    transactions: 0,
    plants: 0,
    materials: 0,
    products: 0,
    importedTransactions: 0,
  };

  try {
    const transactionsJson = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (transactionsJson) {
      const transactions: Transaction[] = JSON.parse(transactionsJson);
      stats.transactions = transactions.length;
      stats.importedTransactions = transactions.filter(t => t.source === "import").length;
    }

    const plantsJson = await AsyncStorage.getItem(STORAGE_KEYS.PLANTS);
    if (plantsJson) {
      const plants = JSON.parse(plantsJson);
      stats.plants = Array.isArray(plants) ? plants.length : 0;
    }

    const materialsJson = await AsyncStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (materialsJson) {
      const materials = JSON.parse(materialsJson);
      stats.materials = Array.isArray(materials) ? materials.length : 0;
    }

    const productsJson = await AsyncStorage.getItem(STORAGE_KEYS.PHYTOSANITARY_PRODUCTS);
    if (productsJson) {
      const products = JSON.parse(productsJson);
      stats.products = Array.isArray(products) ? products.length : 0;
    }

    return stats;
  } catch (error) {
    console.error("[DEBUG] Error getting stats:", error);
    return stats;
  }
}
