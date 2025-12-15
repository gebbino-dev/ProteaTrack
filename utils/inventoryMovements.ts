import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './storage';

const KEYS = {
  MOVEMENTS: 'serra_inventory_movements',
};

export type MovementType = 'entrata' | 'uscita';
export type ItemType = 'pianta' | 'materiale' | 'seme';

export interface InventoryMovement {
  id: string;
  itemType: ItemType;
  itemId?: string;
  itemName: string;
  movementType: MovementType;
  quantity: number;
  date: string;
  sourceDocument?: string;
  notes: string;
  createdAt: string;
}

export interface InventorySnapshot {
  asOfDate: string;
  plants: { name: string; quantity: number }[];
  seeds: { name: string; quantity: number }[];
  materials: { name: string; type: string; quantity: number }[];
  totals: {
    plants: number;
    seeds: number;
    materials: number;
  };
}

export interface YearEndInventory {
  year: number;
  snapshot: InventorySnapshot;
  movements: {
    entriesCount: number;
    exitsCount: number;
    entriesTotal: number;
    exitsTotal: number;
  };
}

export const inventoryMovements = {
  async getMovements(): Promise<InventoryMovement[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.MOVEMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting movements:', error);
      return [];
    }
  },

  async saveMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> {
    try {
      const movements = await this.getMovements();
      const newMovement: InventoryMovement = {
        ...movement,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      movements.unshift(newMovement);
      await AsyncStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(movements));
      return newMovement;
    } catch (error) {
      console.error('Error saving movement:', error);
      throw error;
    }
  },

  async recordEntry(
    itemType: ItemType,
    itemName: string,
    quantity: number,
    date: string,
    sourceDocument?: string,
    notes?: string
  ): Promise<InventoryMovement> {
    return this.saveMovement({
      itemType,
      itemName,
      movementType: 'entrata',
      quantity,
      date,
      sourceDocument,
      notes: notes || '',
    });
  },

  async recordExit(
    itemType: ItemType,
    itemName: string,
    quantity: number,
    date: string,
    notes?: string
  ): Promise<InventoryMovement> {
    return this.saveMovement({
      itemType,
      itemName,
      movementType: 'uscita',
      quantity,
      date,
      notes: notes || '',
    });
  },

  async getMovementsByPeriod(startDate: string, endDate: string): Promise<InventoryMovement[]> {
    const movements = await this.getMovements();
    return movements.filter(m => m.date >= startDate && m.date <= endDate);
  },

  async getMovementsByYear(year: number): Promise<InventoryMovement[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return this.getMovementsByPeriod(startDate, endDate);
  },

  async getBalanceAsOfDate(asOfDate: string): Promise<Map<string, { itemType: ItemType; quantity: number }>> {
    const movements = await this.getMovements();
    const filteredMovements = movements.filter(m => m.date <= asOfDate);
    
    const balances = new Map<string, { itemType: ItemType; quantity: number }>();
    
    for (const m of filteredMovements) {
      const key = `${m.itemType}:${m.itemName}`;
      const current = balances.get(key) || { itemType: m.itemType, quantity: 0 };
      
      if (m.movementType === 'entrata') {
        current.quantity += m.quantity;
      } else {
        current.quantity -= m.quantity;
      }
      
      balances.set(key, current);
    }
    
    return balances;
  },

  async getInventorySnapshot(asOfDate: string): Promise<InventorySnapshot> {
    const balances = await this.getBalanceAsOfDate(asOfDate);
    
    const plants: { name: string; quantity: number }[] = [];
    const seeds: { name: string; quantity: number }[] = [];
    const materials: { name: string; type: string; quantity: number }[] = [];
    
    for (const [key, value] of balances) {
      const [itemType, itemName] = key.split(':');
      if (value.quantity <= 0) continue;
      
      if (itemType === 'pianta') {
        plants.push({ name: itemName, quantity: value.quantity });
      } else if (itemType === 'seme') {
        seeds.push({ name: itemName, quantity: value.quantity });
      } else if (itemType === 'materiale') {
        materials.push({ name: itemName, type: 'materiale', quantity: value.quantity });
      }
    }
    
    return {
      asOfDate,
      plants: plants.sort((a, b) => a.name.localeCompare(b.name)),
      seeds: seeds.sort((a, b) => a.name.localeCompare(b.name)),
      materials: materials.sort((a, b) => a.name.localeCompare(b.name)),
      totals: {
        plants: plants.reduce((sum, p) => sum + p.quantity, 0),
        seeds: seeds.reduce((sum, s) => sum + s.quantity, 0),
        materials: materials.reduce((sum, m) => sum + m.quantity, 0),
      },
    };
  },

  async getYearEndInventory(year: number): Promise<YearEndInventory> {
    const endOfYear = `${year}-12-31`;
    const snapshot = await this.getInventorySnapshot(endOfYear);
    const yearMovements = await this.getMovementsByYear(year);
    
    const entries = yearMovements.filter(m => m.movementType === 'entrata');
    const exits = yearMovements.filter(m => m.movementType === 'uscita');
    
    return {
      year,
      snapshot,
      movements: {
        entriesCount: entries.length,
        exitsCount: exits.length,
        entriesTotal: entries.reduce((sum, m) => sum + m.quantity, 0),
        exitsTotal: exits.reduce((sum, m) => sum + m.quantity, 0),
      },
    };
  },

  async getMonthlyMovementSummary(year: number): Promise<{
    month: number;
    entries: number;
    exits: number;
    entriesQty: number;
    exitsQty: number;
  }[]> {
    const yearMovements = await this.getMovementsByYear(year);
    const summary: { month: number; entries: number; exits: number; entriesQty: number; exitsQty: number }[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, '0');
      const monthMovements = yearMovements.filter(m => m.date.substring(5, 7) === monthStr);
      
      const entries = monthMovements.filter(m => m.movementType === 'entrata');
      const exits = monthMovements.filter(m => m.movementType === 'uscita');
      
      summary.push({
        month,
        entries: entries.length,
        exits: exits.length,
        entriesQty: entries.reduce((sum, m) => sum + m.quantity, 0),
        exitsQty: exits.reduce((sum, m) => sum + m.quantity, 0),
      });
    }
    
    return summary;
  },

  async clearAllMovements(): Promise<number> {
    try {
      const movements = await this.getMovements();
      const count = movements.length;
      await AsyncStorage.setItem(KEYS.MOVEMENTS, JSON.stringify([]));
      return count;
    } catch (error) {
      console.error('Error clearing movements:', error);
      throw error;
    }
  },

  async deleteMovement(id: string): Promise<void> {
    try {
      const movements = await this.getMovements();
      const filtered = movements.filter(m => m.id !== id);
      await AsyncStorage.setItem(KEYS.MOVEMENTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting movement:', error);
      throw error;
    }
  },
};
