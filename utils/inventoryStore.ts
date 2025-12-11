import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantRecord, PhytosanitaryProduct } from '@/types';
import { storage, generateId } from './storage';
import { InventoryImportItem, ParsedInvoice } from './xmlImportService';

const KEYS = {
  MATERIALS: 'serra_materials',
};

export interface MaterialRecord {
  id: string;
  name: string;
  type: 'vasi' | 'terriccio' | 'materiale' | 'altro';
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  sourceDocument: string;
  arrivalDate: string;
  notes: string;
  createdAt: string;
}

export interface MaterialInventory {
  materials: MaterialRecord[];
}

export const inventoryStore = {
  async getMaterials(): Promise<MaterialRecord[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MATERIALS);
      const inventory: MaterialInventory = data ? JSON.parse(data) : { materials: [] };
      return inventory.materials;
    } catch (error) {
      console.error('Error getting materials:', error);
      return [];
    }
  },

  async saveMaterial(material: Omit<MaterialRecord, 'id' | 'createdAt'>): Promise<MaterialRecord> {
    try {
      const materials = await this.getMaterials();
      const newMaterial: MaterialRecord = {
        ...material,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      materials.unshift(newMaterial);
      await AsyncStorage.setItem(KEYS.MATERIALS, JSON.stringify({ materials }));
      return newMaterial;
    } catch (error) {
      console.error('Error saving material:', error);
      throw error;
    }
  },

  async deleteMaterial(id: string): Promise<void> {
    try {
      const materials = await this.getMaterials();
      const filtered = materials.filter(m => m.id !== id);
      await AsyncStorage.setItem(KEYS.MATERIALS, JSON.stringify({ materials: filtered }));
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  },

  async clearAllMaterials(): Promise<number> {
    try {
      const materials = await this.getMaterials();
      const count = materials.length;
      await AsyncStorage.setItem(KEYS.MATERIALS, JSON.stringify({ materials: [] }));
      return count;
    } catch (error) {
      console.error('Error clearing materials:', error);
      throw error;
    }
  },

  async addPlantRecord(item: InventoryImportItem): Promise<PlantRecord | null> {
    if (item.type !== 'plant' || !item.plantRecord) {
      return null;
    }
    
    const plantData = {
      variety: item.plantRecord.variety || item.description,
      species: item.plantRecord.species || '',
      quantity: item.quantity,
      arrivalDate: item.plantRecord.arrivalDate || new Date().toISOString().split('T')[0],
      sourceDocument: item.sourceDocument,
      notes: item.plantRecord.notes || `Prezzo: ${item.unitPrice.toFixed(2)} EUR/${item.unitOfMeasure || 'pz'}`,
    };
    
    return await storage.savePlantRecord(plantData);
  },

  async addMaterialFromInvoice(item: InventoryImportItem): Promise<MaterialRecord | null> {
    const validTypes = ['vasi', 'terriccio', 'materiale', 'altro'];
    if (!item.materialType || !validTypes.includes(item.materialType)) {
      return null;
    }

    const materialData = {
      name: item.description,
      type: item.materialType as 'vasi' | 'terriccio' | 'materiale' | 'altro',
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure || 'pz',
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      sourceDocument: item.sourceDocument,
      arrivalDate: new Date().toISOString().split('T')[0],
      notes: '',
    };

    return await this.saveMaterial(materialData);
  },

  async addPhytosanitaryProductFromInvoice(item: InventoryImportItem): Promise<PhytosanitaryProduct | null> {
    if (item.materialType !== 'fitofarmaco' && item.materialType !== 'fertilizzante') {
      return null;
    }

    const existingProducts = await storage.getProducts();
    const existingProduct = this.findMatchingProduct(item.description, existingProducts);

    if (existingProduct) {
      return existingProduct;
    }

    const productData = {
      name: item.description,
      activeIngredient: '',
      formulation: item.unitOfMeasure || '',
      registrationNumber: '',
      phiDays: undefined,
      fracCode: '',
      notes: `Importato da fattura: ${item.sourceDocument}. Prezzo: ${item.unitPrice.toFixed(2)} EUR/${item.unitOfMeasure || 'unità'}`,
    };

    return await storage.saveProduct(productData);
  },

  findMatchingProduct(description: string, products: PhytosanitaryProduct[]): PhytosanitaryProduct | null {
    const descLower = description.toLowerCase().trim();
    
    const exactMatch = products.find(p => p.name.toLowerCase().trim() === descLower);
    if (exactMatch) {
      return exactMatch;
    }
    
    for (const product of products) {
      const productName = product.name.toLowerCase().trim();
      if (productName.length >= 4 && descLower.includes(productName)) {
        return product;
      }
      if (descLower.length >= 4 && productName.includes(descLower)) {
        return product;
      }
    }
    
    const descWords = descLower.split(/\s+/).filter(w => w.length > 3);
    if (descWords.length === 0) {
      return null;
    }
    
    for (const product of products) {
      const productWords = product.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      if (productWords.length === 0) {
        continue;
      }
      const matchCount = descWords.filter(w => productWords.includes(w)).length;
      if (matchCount >= 1 && matchCount >= productWords.length * 0.6) {
        return product;
      }
    }
    
    return null;
  },

  async checkDuplicateInvoice(parsedInvoice: ParsedInvoice): Promise<{ isDuplicate: boolean; existingId?: string }> {
    const docRef = parsedInvoice.transaction.docRef || '';
    const counterparty = parsedInvoice.transaction.counterparty || '';
    const date = parsedInvoice.transaction.date || '';
    const amount = parsedInvoice.transaction.amount || 0;
    
    if (!docRef && !counterparty) {
      return { isDuplicate: false };
    }

    const transactions = await storage.getTransactions();
    
    const existing = transactions.find(t => {
      if (t.docRef === docRef && t.counterparty === counterparty) {
        return true;
      }
      if (t.counterparty === counterparty && t.date === date && Math.abs(t.amount - amount) < 0.01) {
        return true;
      }
      return false;
    });

    if (existing) {
      return { isDuplicate: true, existingId: existing.id };
    }
    return { isDuplicate: false };
  },

  async addTransaction(parsedInvoice: ParsedInvoice, categoryId: string): Promise<{ success: boolean; isDuplicate: boolean; existingId?: string }> {
    const duplicateCheck = await this.checkDuplicateInvoice(parsedInvoice);
    
    if (duplicateCheck.isDuplicate) {
      console.log('[inventoryStore] Fattura già importata:', duplicateCheck.existingId);
      return { success: false, isDuplicate: true, existingId: duplicateCheck.existingId };
    }

    const transactionData = {
      type: parsedInvoice.transaction.type,
      categoryId: categoryId,
      amount: parsedInvoice.transaction.amount,
      date: parsedInvoice.transaction.date,
      counterparty: parsedInvoice.transaction.counterparty,
      description: parsedInvoice.transaction.description,
      docRef: parsedInvoice.transaction.docRef,
      docType: parsedInvoice.transaction.docType,
      vatRate: parsedInvoice.transaction.vatRate,
      notes: parsedInvoice.transaction.notes,
      source: 'import' as const,
    };

    await storage.saveTransaction(transactionData);
    return { success: true, isDuplicate: false };
  },

  async processInvoiceImport(
    parsedInvoice: ParsedInvoice,
    inventoryItems: InventoryImportItem[],
    categoryId: string
  ): Promise<{
    transactionSaved: boolean;
    isDuplicate: boolean;
    plantsAdded: number;
    materialsAdded: number;
    productsAdded: number;
  }> {
    const result = {
      transactionSaved: false,
      isDuplicate: false,
      plantsAdded: 0,
      materialsAdded: 0,
      productsAdded: 0,
    };

    try {
      const txResult = await this.addTransaction(parsedInvoice, categoryId);
      result.transactionSaved = txResult.success;
      result.isDuplicate = txResult.isDuplicate;

      for (const item of inventoryItems) {
        if (!item.selected) {
          continue;
        }

        const normalizedItem = this.normalizeItemForSave(item);

        if (normalizedItem.itemType === 'piante') {
          const plantRecord = await this.addPlantRecord(normalizedItem);
          if (plantRecord) {
            result.plantsAdded++;
          }
        } else if (normalizedItem.itemType === 'fitofarmaco' || normalizedItem.itemType === 'fertilizzante') {
          const product = await this.addPhytosanitaryProductFromInvoice(normalizedItem);
          if (product) {
            result.productsAdded++;
          }
        } else if (['vasi', 'terriccio', 'materiale', 'altro'].includes(normalizedItem.itemType)) {
          const material = await this.addMaterialFromInvoice(normalizedItem);
          if (material) {
            result.materialsAdded++;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing invoice import:', error);
      throw error;
    }
  },

  normalizeItemForSave(item: InventoryImportItem): InventoryImportItem {
    const normalized = { ...item };
    
    if (item.itemType === 'piante') {
      normalized.type = 'plant';
      if (!normalized.plantRecord) {
        normalized.plantRecord = {
          variety: item.description.substring(0, 50),
          quantity: item.quantity,
          arrivalDate: new Date().toISOString().split('T')[0],
          sourceDocument: item.sourceDocument,
          notes: `Prezzo: ${item.unitPrice.toFixed(2)} EUR/pz`,
        };
      }
    } else {
      normalized.type = 'material';
      normalized.materialType = item.itemType;
    }
    
    return normalized;
  },
};
