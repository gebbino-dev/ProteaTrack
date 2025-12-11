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
    const existingProduct = existingProducts.find(
      p => p.name.toLowerCase() === item.description.toLowerCase()
    );

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

  async addTransaction(parsedInvoice: ParsedInvoice, categoryId: string): Promise<void> {
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
  },

  async processInvoiceImport(
    parsedInvoice: ParsedInvoice,
    inventoryItems: InventoryImportItem[],
    categoryId: string
  ): Promise<{
    transactionSaved: boolean;
    plantsAdded: number;
    materialsAdded: number;
    productsAdded: number;
  }> {
    const result = {
      transactionSaved: false,
      plantsAdded: 0,
      materialsAdded: 0,
      productsAdded: 0,
    };

    try {
      await this.addTransaction(parsedInvoice, categoryId);
      result.transactionSaved = true;

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
