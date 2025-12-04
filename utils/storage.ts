import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Activity, 
  Bench, 
  UserSettings, 
  GreenhouseConfig, 
  DEFAULT_GREENHOUSE_CONFIG, 
  PlantRecord, 
  PlantInventory,
  Transaction,
  TransactionCategory,
  DEFAULT_CATEGORIES,
  Treatment,
  PhytosanitaryProduct,
  FinancialSummary,
  TransactionType,
} from '@/types';

const KEYS = {
  ACTIVITIES: 'serra_activities',
  BENCHES: 'serra_benches',
  SETTINGS: 'serra_settings',
  GREENHOUSE_CONFIG: 'serra_greenhouse_config',
  PLANT_INVENTORY: 'serra_plant_inventory',
  TRANSACTIONS: 'serra_transactions',
  CATEGORIES: 'serra_categories',
  TREATMENTS: 'serra_treatments',
  PRODUCTS: 'serra_products',
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const storage = {
  async getActivities(): Promise<Activity[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  },

  async saveActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    try {
      const activities = await this.getActivities();
      const newActivity: Activity = {
        ...activity,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      activities.unshift(newActivity);
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
      return newActivity;
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  },

  async deleteActivity(id: string): Promise<void> {
    try {
      const activities = await this.getActivities();
      const filtered = activities.filter(a => a.id !== id);
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity | null> {
    try {
      const activities = await this.getActivities();
      const index = activities.findIndex(a => a.id === id);
      if (index < 0) return null;
      
      const updated = { ...activities[index], ...updates };
      activities[index] = updated;
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
      return updated;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  },

  async getActivitiesForBench(greenhouse: number, sector: number, bench: string): Promise<Activity[]> {
    const activities = await this.getActivities();
    return activities.filter(
      a => a.greenhouse === greenhouse && a.sector === sector && a.bench === bench
    );
  },

  async getActivitiesForDate(date: string): Promise<Activity[]> {
    const activities = await this.getActivities();
    return activities.filter(a => a.date.startsWith(date));
  },

  async getBenches(): Promise<Bench[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BENCHES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting benches:', error);
      return [];
    }
  },

  async saveBench(bench: Omit<Bench, 'id'>): Promise<Bench> {
    try {
      const benches = await this.getBenches();
      const existingIndex = benches.findIndex(
        b => b.greenhouse === bench.greenhouse && b.sector === bench.sector && b.benchNumber === bench.benchNumber
      );
      
      const newBench: Bench = {
        ...bench,
        id: existingIndex >= 0 ? benches[existingIndex].id : generateId(),
      };

      if (existingIndex >= 0) {
        benches[existingIndex] = newBench;
      } else {
        benches.push(newBench);
      }

      await AsyncStorage.setItem(KEYS.BENCHES, JSON.stringify(benches));
      return newBench;
    } catch (error) {
      console.error('Error saving bench:', error);
      throw error;
    }
  },

  async getBench(greenhouse: number, sector: number, benchNumber: string): Promise<Bench> {
    await this.initializeBenches();
    const benches = await this.getBenches();
    const found = benches.find(
      b => b.greenhouse === greenhouse && b.sector === sector && b.benchNumber === benchNumber
    );
    if (found) return found;
    return {
      id: generateId(),
      greenhouse,
      sector,
      benchNumber,
      plantCount: 0,
      variety: '',
      plantingDate: '',
      notes: '',
      placche: 0,
    };
  },

  async getSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        name: '',
        companyName: '',
        location: '',
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        name: '',
        companyName: '',
        location: '',
      };
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async getStats(): Promise<{
    totalPlants: number;
    todayActivities: number;
    recentActivities: Activity[];
    benchesWithPlants: number;
  }> {
    const [benches, activities] = await Promise.all([
      this.getBenches(),
      this.getActivities(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.date.startsWith(today));
    const totalPlants = benches.reduce((sum, b) => sum + b.plantCount, 0);
    const benchesWithPlants = benches.filter(b => b.plantCount > 0).length;

    return {
      totalPlants,
      todayActivities: todayActivities.length,
      recentActivities: activities.slice(0, 10),
      benchesWithPlants,
    };
  },

  async getGreenhouseConfig(): Promise<GreenhouseConfig> {
    try {
      const data = await AsyncStorage.getItem(KEYS.GREENHOUSE_CONFIG);
      return data ? JSON.parse(data) : DEFAULT_GREENHOUSE_CONFIG;
    } catch (error) {
      console.error('Error getting greenhouse config:', error);
      return DEFAULT_GREENHOUSE_CONFIG;
    }
  },

  async saveGreenhouseConfig(config: GreenhouseConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.GREENHOUSE_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving greenhouse config:', error);
      throw error;
    }
  },

  async initializeBenches(): Promise<void> {
    const existingBenches = await this.getBenches();
    if (existingBenches.length > 0) return;

    const config = await this.getGreenhouseConfig();
    const benches: Bench[] = [];
    
    for (const greenhouse of config.greenhouses) {
      for (const sector of greenhouse.sectors) {
        const benchNames = greenhouse.benchNames || Array.from({ length: greenhouse.benchCount }, (_, i) => `B${i + 1}`);
        for (const benchName of benchNames) {
          benches.push({
            id: generateId(),
            greenhouse: greenhouse.id,
            sector: sector.id,
            benchNumber: benchName,
            plantCount: 0,
            variety: '',
            plantingDate: '',
            notes: '',
            placche: 0,
          });
        }
      }
    }
    await AsyncStorage.setItem(KEYS.BENCHES, JSON.stringify(benches));
  },

  async getPlantInventory(): Promise<PlantInventory> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PLANT_INVENTORY);
      return data ? JSON.parse(data) : { plants: [] };
    } catch (error) {
      console.error('Error getting plant inventory:', error);
      return { plants: [] };
    }
  },

  async savePlantRecord(record: Omit<PlantRecord, 'id'>): Promise<PlantRecord> {
    try {
      const inventory = await this.getPlantInventory();
      const newRecord: PlantRecord = {
        ...record,
        id: generateId(),
      };
      inventory.plants.unshift(newRecord);
      await AsyncStorage.setItem(KEYS.PLANT_INVENTORY, JSON.stringify(inventory));
      return newRecord;
    } catch (error) {
      console.error('Error saving plant record:', error);
      throw error;
    }
  },

  async deletePlantRecord(id: string): Promise<void> {
    try {
      const inventory = await this.getPlantInventory();
      inventory.plants = inventory.plants.filter(p => p.id !== id);
      await AsyncStorage.setItem(KEYS.PLANT_INVENTORY, JSON.stringify(inventory));
    } catch (error) {
      console.error('Error deleting plant record:', error);
      throw error;
    }
  },

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.ACTIVITIES, 
        KEYS.BENCHES, 
        KEYS.SETTINGS, 
        KEYS.PLANT_INVENTORY,
        KEYS.TRANSACTIONS,
        KEYS.CATEGORIES,
        KEYS.TREATMENTS,
        KEYS.PRODUCTS,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  },

  // ============================================
  // GESTIONALE CONTABILE (Accounting Functions)
  // ============================================

  async getCategories(): Promise<TransactionCategory[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CATEGORIES);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    } catch (error) {
      console.error('Error getting categories:', error);
      return DEFAULT_CATEGORIES;
    }
  },

  async saveCategory(category: Omit<TransactionCategory, 'id'>): Promise<TransactionCategory> {
    try {
      const categories = await this.getCategories();
      const newCategory: TransactionCategory = {
        ...category,
        id: generateId(),
      };
      categories.push(newCategory);
      await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
      return newCategory;
    } catch (error) {
      console.error('Error saving category:', error);
      throw error;
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async saveTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    try {
      const transactions = await this.getTransactions();
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      transactions.unshift(newTransaction);
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
      return newTransaction;
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    try {
      const transactions = await this.getTransactions();
      const index = transactions.findIndex(t => t.id === id);
      if (index < 0) return null;
      
      const updated = { ...transactions[index], ...updates };
      transactions[index] = updated;
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
      return updated;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const transactions = await this.getTransactions();
      const filtered = transactions.filter(t => t.id !== id);
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },

  async getTransactionsByPeriod(year: number, month?: number): Promise<Transaction[]> {
    const transactions = await this.getTransactions();
    return transactions.filter(t => {
      const date = new Date(t.date);
      if (month !== undefined) {
        return date.getFullYear() === year && date.getMonth() === month;
      }
      return date.getFullYear() === year;
    });
  },

  async getFinancialSummary(year: number, month?: number): Promise<FinancialSummary> {
    const transactions = await this.getTransactionsByPeriod(year, month);
    const categories = await this.getCategories();
    
    let income = 0;
    let expenses = 0;
    const categoryTotals: { [key: string]: number } = {};
    
    for (const t of transactions) {
      if (t.type === 'ricavo') {
        income += t.amount;
      } else {
        expenses += t.amount;
      }
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    }
    
    const byCategory = Object.entries(categoryTotals).map(([categoryId, total]) => ({
      categoryId,
      total,
    })).sort((a, b) => b.total - a.total);
    
    return {
      period: month !== undefined ? `${year}-${String(month + 1).padStart(2, '0')}` : String(year),
      income,
      expenses,
      margin: income - expenses,
      byCategory,
    };
  },

  async exportTransactionsAsCSV(year: number, month?: number): Promise<string> {
    try {
      const transactions = await this.getTransactionsByPeriod(year, month);
      const categories = await this.getCategories();
      
      const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Altro';
      
      let csv = 'Data,Tipo,Categoria,Importo,Controparte,Descrizione,Rif. Documento,Note\n';
      
      for (const t of transactions) {
        const date = t.date;
        const tipo = t.type === 'ricavo' ? 'Entrata' : 'Uscita';
        const categoria = getCategoryName(t.categoryId).replace(/,/g, ';');
        const importo = t.amount.toFixed(2);
        const controparte = (t.counterparty || '').replace(/,/g, ';');
        const descrizione = (t.description || '').replace(/,/g, ';');
        const docRef = (t.docRef || '').replace(/,/g, ';');
        const note = (t.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
        
        csv += `"${date}","${tipo}","${categoria}",${importo},"${controparte}","${descrizione}","${docRef}","${note}"\n`;
      }
      
      const summary = await this.getFinancialSummary(year, month);
      csv += `\nTOTALE ENTRATE,,,${summary.income.toFixed(2)},,,,\n`;
      csv += `TOTALE USCITE,,,${summary.expenses.toFixed(2)},,,,\n`;
      csv += `MARGINE,,,${summary.margin.toFixed(2)},,,,\n`;
      
      return csv;
    } catch (error) {
      console.error('Error exporting transactions CSV:', error);
      throw error;
    }
  },

  // ============================================
  // QUADERNO DI CAMPAGNA (Field Notebook Functions)
  // ============================================

  async getProducts(): Promise<PhytosanitaryProduct[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  },

  async saveProduct(product: Omit<PhytosanitaryProduct, 'id'>): Promise<PhytosanitaryProduct> {
    try {
      const products = await this.getProducts();
      const newProduct: PhytosanitaryProduct = {
        ...product,
        id: generateId(),
      };
      products.push(newProduct);
      await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      return newProduct;
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const products = await this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  async getTreatments(): Promise<Treatment[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TREATMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting treatments:', error);
      return [];
    }
  },

  async saveTreatment(treatment: Omit<Treatment, 'id' | 'createdAt'>): Promise<Treatment> {
    try {
      const treatments = await this.getTreatments();
      const newTreatment: Treatment = {
        ...treatment,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      treatments.unshift(newTreatment);
      await AsyncStorage.setItem(KEYS.TREATMENTS, JSON.stringify(treatments));
      return newTreatment;
    } catch (error) {
      console.error('Error saving treatment:', error);
      throw error;
    }
  },

  async updateTreatment(id: string, updates: Partial<Treatment>): Promise<Treatment | null> {
    try {
      const treatments = await this.getTreatments();
      const index = treatments.findIndex(t => t.id === id);
      if (index < 0) return null;
      
      const updated = { ...treatments[index], ...updates };
      treatments[index] = updated;
      await AsyncStorage.setItem(KEYS.TREATMENTS, JSON.stringify(treatments));
      return updated;
    } catch (error) {
      console.error('Error updating treatment:', error);
      throw error;
    }
  },

  async deleteTreatment(id: string): Promise<void> {
    try {
      const treatments = await this.getTreatments();
      const filtered = treatments.filter(t => t.id !== id);
      await AsyncStorage.setItem(KEYS.TREATMENTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting treatment:', error);
      throw error;
    }
  },

  async getTreatmentsByLocation(greenhouse?: number, sector?: number, bench?: string): Promise<Treatment[]> {
    const treatments = await this.getTreatments();
    return treatments.filter(t => {
      if (greenhouse !== undefined && t.greenhouse !== greenhouse) return false;
      if (sector !== undefined && t.sector !== sector) return false;
      if (bench !== undefined && t.bench !== bench) return false;
      return true;
    });
  },

  async exportTreatmentsAsCSV(): Promise<string> {
    try {
      const treatments = await this.getTreatments();
      
      let csv = 'Data,Prodotto,Dose (g/hl),Acqua (L),Ubicazione,Avversità,Condizioni Meteo,Note\n';
      
      for (const t of treatments) {
        const date = t.date;
        const prodotto = (t.productName || '').replace(/,/g, ';');
        const dose = t.dosePerHl;
        const acqua = t.waterLiters;
        let ubicazione = '';
        if (t.locationType === 'serra' && t.greenhouse) {
          ubicazione = `Serra ${t.greenhouse}`;
          if (t.sector) ubicazione += ` - Sett. ${t.sector}`;
          if (t.bench) ubicazione += ` - ${t.bench}`;
        } else {
          ubicazione = t.customLocation || 'Campo aperto';
        }
        const avversita = (t.targetPest || '').replace(/,/g, ';');
        const meteo = (t.weatherConditions || '').replace(/,/g, ';');
        const note = (t.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
        
        csv += `"${date}","${prodotto}",${dose},${acqua},"${ubicazione}","${avversita}","${meteo}","${note}"\n`;
      }
      
      return csv;
    } catch (error) {
      console.error('Error exporting treatments CSV:', error);
      throw error;
    }
  },

  async exportPlantInventoryAsCSV(): Promise<string> {
    try {
      const inventory = await this.getPlantInventory();
      const plants = inventory.plants;

      if (plants.length === 0) {
        return 'Varietà,Specie,Numero Piante,Data Arrivo,Note\n';
      }

      // Ordinamento per specie/genere
      const sortedPlants = [...plants].sort((a, b) => {
        const speciesA = (a.species || a.variety || '').toLowerCase();
        const speciesB = (b.species || b.variety || '').toLowerCase();
        if (speciesA !== speciesB) {
          return speciesA.localeCompare(speciesB);
        }
        return (a.variety || '').localeCompare(b.variety || '');
      });

      // Intestazione CSV
      let csv = 'Varietà,Specie,Numero Piante,Data Arrivo,Note\n';

      // Aggiungi righe di dati
      for (const plant of sortedPlants) {
        const variety = (plant.variety || '').replace(/,/g, ';');
        const species = (plant.species || '').replace(/,/g, ';');
        const quantity = plant.quantity || 0;
        const date = plant.arrivalDate || '';
        const notes = (plant.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');

        csv += `"${variety}","${species}",${quantity},"${date}","${notes}"\n`;
      }

      // Aggiungi riga di totale
      const totalQuantity = sortedPlants.reduce((sum, plant) => sum + (plant.quantity || 0), 0);
      csv += `\nTOTALE PIANTE,,,${totalQuantity},,\n`;

      return csv;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  },
};
