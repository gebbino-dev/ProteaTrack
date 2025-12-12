import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from './storage';

const KEYS = {
  PENDING_LINES: 'serra_pending_invoice_lines',
};

export type ItemCategory = 'piante' | 'vasi' | 'terriccio' | 'fitofarmaco' | 'fertilizzante' | 'materiale' | 'semi' | 'utenza' | 'altro';

export type CategoriaRiga = 
  | 'utenze'
  | 'piante'
  | 'semi'
  | 'terriccio'
  | 'vasi'
  | 'fitofarmaci'
  | 'fertilizzanti'
  | 'combustibile'
  | 'materiale_generico';

export type SottoCategoriaUtenza = 
  | 'spese_floratoscana'
  | 'luce'
  | 'gas'
  | 'spese_cia'
  | '';

export interface PendingInvoiceLine {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unitOfMeasure?: string;
  vatRate?: number;
  detectedCategory: ItemCategory;
  assignedCategory: ItemCategory;
  categoria: CategoriaRiga;
  sottoCategoriaUtenza: SottoCategoriaUtenza;
  isProcessed: boolean;
  processedAt?: string;
  createdAt: string;
}

export const CATEGORY_CONFIG: Record<ItemCategory, { label: string; icon: string; color: string }> = {
  piante: { label: 'Piante', icon: 'feather', color: '#4CAF50' },
  vasi: { label: 'Vasi', icon: 'box', color: '#795548' },
  terriccio: { label: 'Terriccio', icon: 'layers', color: '#8B4513' },
  fitofarmaco: { label: 'Fitofarmaci', icon: 'shield', color: '#9C27B0' },
  fertilizzante: { label: 'Fertilizzanti', icon: 'zap', color: '#FF9800' },
  materiale: { label: 'Materiali', icon: 'tool', color: '#607D8B' },
  semi: { label: 'Semi', icon: 'sun', color: '#FFC107' },
  utenza: { label: 'Utenze', icon: 'file-text', color: '#2196F3' },
  altro: { label: 'Altro', icon: 'more-horizontal', color: '#9E9E9E' },
};

export const pendingInvoiceStore = {
  async getPendingLines(): Promise<PendingInvoiceLine[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PENDING_LINES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending lines:', error);
      return [];
    }
  },

  async savePendingLine(line: Omit<PendingInvoiceLine, 'id' | 'createdAt'>): Promise<PendingInvoiceLine> {
    try {
      const lines = await this.getPendingLines();
      const newLine: PendingInvoiceLine = {
        ...line,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      lines.unshift(newLine);
      await AsyncStorage.setItem(KEYS.PENDING_LINES, JSON.stringify(lines));
      return newLine;
    } catch (error) {
      console.error('Error saving pending line:', error);
      throw error;
    }
  },

  async savePendingLines(lines: Omit<PendingInvoiceLine, 'id' | 'createdAt'>[]): Promise<PendingInvoiceLine[]> {
    try {
      const existingLines = await this.getPendingLines();
      const newLines: PendingInvoiceLine[] = lines.map(line => ({
        ...line,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }));
      const allLines = [...newLines, ...existingLines];
      await AsyncStorage.setItem(KEYS.PENDING_LINES, JSON.stringify(allLines));
      return newLines;
    } catch (error) {
      console.error('Error saving pending lines:', error);
      throw error;
    }
  },

  async updateLine(id: string, updates: Partial<PendingInvoiceLine>): Promise<PendingInvoiceLine | null> {
    try {
      const lines = await this.getPendingLines();
      const index = lines.findIndex(l => l.id === id);
      if (index < 0) return null;
      
      const updated = { ...lines[index], ...updates };
      lines[index] = updated;
      await AsyncStorage.setItem(KEYS.PENDING_LINES, JSON.stringify(lines));
      return updated;
    } catch (error) {
      console.error('Error updating pending line:', error);
      throw error;
    }
  },

  async deleteLine(id: string): Promise<void> {
    try {
      const lines = await this.getPendingLines();
      const filtered = lines.filter(l => l.id !== id);
      await AsyncStorage.setItem(KEYS.PENDING_LINES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting pending line:', error);
      throw error;
    }
  },

  async markAsProcessed(id: string): Promise<void> {
    await this.updateLine(id, {
      isProcessed: true,
      processedAt: new Date().toISOString(),
    });
  },

  async getUnprocessedLines(): Promise<PendingInvoiceLine[]> {
    const lines = await this.getPendingLines();
    return lines.filter(l => !l.isProcessed);
  },

  async getLinesByCategory(category: ItemCategory): Promise<PendingInvoiceLine[]> {
    const lines = await this.getPendingLines();
    return lines.filter(l => l.assignedCategory === category);
  },

  async clearAllPendingLines(): Promise<number> {
    try {
      const lines = await this.getPendingLines();
      const count = lines.length;
      await AsyncStorage.setItem(KEYS.PENDING_LINES, JSON.stringify([]));
      return count;
    } catch (error) {
      console.error('Error clearing pending lines:', error);
      throw error;
    }
  },

  async getCategorySummary(): Promise<{ category: ItemCategory; count: number; total: number }[]> {
    const lines = await this.getUnprocessedLines();
    const summary: Record<ItemCategory, { count: number; total: number }> = {
      piante: { count: 0, total: 0 },
      vasi: { count: 0, total: 0 },
      terriccio: { count: 0, total: 0 },
      fitofarmaco: { count: 0, total: 0 },
      fertilizzante: { count: 0, total: 0 },
      materiale: { count: 0, total: 0 },
      semi: { count: 0, total: 0 },
      utenza: { count: 0, total: 0 },
      altro: { count: 0, total: 0 },
    };

    for (const line of lines) {
      const cat = line.assignedCategory;
      summary[cat].count++;
      summary[cat].total += line.totalPrice;
    }

    return Object.entries(summary)
      .map(([category, data]) => ({
        category: category as ItemCategory,
        ...data,
      }))
      .filter(s => s.count > 0);
  },

  async getLinesByCategoria(categoria: CategoriaRiga): Promise<PendingInvoiceLine[]> {
    const lines = await this.getPendingLines();
    return lines.filter(l => l.categoria === categoria);
  },

  async getLinesBySottoCategoriaUtenza(sottocategoria: SottoCategoriaUtenza): Promise<PendingInvoiceLine[]> {
    const lines = await this.getPendingLines();
    return lines.filter(l => l.sottoCategoriaUtenza === sottocategoria);
  },

  async getCategoriaSummary(): Promise<{ categoria: CategoriaRiga; count: number; total: number }[]> {
    const lines = await this.getPendingLines();
    const summary: Record<CategoriaRiga, { count: number; total: number }> = {
      utenze: { count: 0, total: 0 },
      piante: { count: 0, total: 0 },
      semi: { count: 0, total: 0 },
      terriccio: { count: 0, total: 0 },
      vasi: { count: 0, total: 0 },
      fitofarmaci: { count: 0, total: 0 },
      fertilizzanti: { count: 0, total: 0 },
      combustibile: { count: 0, total: 0 },
      materiale_generico: { count: 0, total: 0 },
    };

    for (const line of lines) {
      const cat = line.categoria || 'materiale_generico';
      summary[cat].count++;
      summary[cat].total += line.totalPrice;
    }

    return Object.entries(summary)
      .map(([categoria, data]) => ({
        categoria: categoria as CategoriaRiga,
        ...data,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.total - a.total);
  },

  async getSottocategoriaUtenzaSummary(): Promise<{ sottocategoria: SottoCategoriaUtenza; count: number; total: number }[]> {
    const utenzeLines = await this.getLinesByCategoria('utenze');
    const summary: Record<SottoCategoriaUtenza, { count: number; total: number }> = {
      'spese_floratoscana': { count: 0, total: 0 },
      'luce': { count: 0, total: 0 },
      'gas': { count: 0, total: 0 },
      'spese_cia': { count: 0, total: 0 },
      '': { count: 0, total: 0 },
    };

    for (const line of utenzeLines) {
      const sub = line.sottoCategoriaUtenza || '';
      summary[sub].count++;
      summary[sub].total += line.totalPrice;
    }

    return Object.entries(summary)
      .map(([sottocategoria, data]) => ({
        sottocategoria: sottocategoria as SottoCategoriaUtenza,
        ...data,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.total - a.total);
  },
};
