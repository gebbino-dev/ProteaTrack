import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantRecord } from '@/types';
import { storage, generateId } from './storage';

const KEYS = {
  PLANT_DISTRIBUTIONS: 'serra_plant_distributions',
};

export interface PlantDistribution {
  id: string;
  variety: string;
  genus: string;
  greenhouse: number;
  sector: number;
  bench?: string;
  quantity: number;
  distributionDate: string;
  notes: string;
  createdAt: string;
}

export interface PlantLot {
  variety: string;
  genus: string;
  totalQuantity: number;
  distributedQuantity: number;
  availableQuantity: number;
  sources: { sourceDocument: string; quantity: number; arrivalDate: string }[];
}

export interface GenusGroup {
  genus: string;
  totalPlants: number;
  varieties: PlantLot[];
}

const KNOWN_GENERA = [
  'Protea',
  'Leucospermum',
  'Leucadendron',
  'Serruria',
  'Telopea',
  'Banksia',
  'Grevillea',
  'Aulax',
  'Mimetes',
  'Paranomus',
  'Spatalla',
  'Dryandra',
];

export function extractGenus(description: string): string {
  const upperDesc = description.toUpperCase();
  
  for (const genus of KNOWN_GENERA) {
    if (upperDesc.includes(genus.toUpperCase())) {
      return genus;
    }
  }
  
  return 'Altro';
}

export function extractVariety(description: string): string {
  let variety = description.trim();
  
  // Remove leading quantity patterns like "100 x " or "50-"
  variety = variety.replace(/^\d+\s*[-x×]\s*/i, '');
  // Remove trailing quantity/multiplier patterns
  variety = variety.replace(/\s+x\s*\d+.*$/i, '');
  
  // Remove size/packaging info (VASO, CM, etc.) but keep cultivar names
  variety = variety.replace(/\bVASO?\s*\d*/gi, '');
  variety = variety.replace(/\bCM\.?\s*\d+/gi, '');
  variety = variety.replace(/\b\d+\s*CM\.?\b/gi, '');
  variety = variety.replace(/\bLT\.?\s*\d+/gi, '');
  variety = variety.replace(/\b\d+\s*LT\.?\b/gi, '');
  
  // Remove common invoice phrases and notes
  variety = variety.replace(/\btanto\s+vi\b.*$/gi, '');
  variety = variety.replace(/\baccredit.*$/gi, '');
  variety = variety.replace(/\bper\s+problemi\b.*$/gi, '');
  variety = variety.replace(/\bavuti\s+su\b.*$/gi, '');
  variety = variety.replace(/\brimborso\b.*$/gi, '');
  variety = variety.replace(/\bnota\s+credito\b.*$/gi, '');
  variety = variety.replace(/\bsconto\b.*$/gi, '');
  variety = variety.replace(/\bomaggio\b.*$/gi, '');
  
  // Remove asterisks and special markers
  variety = variety.replace(/\*+/g, '');
  variety = variety.replace(/®/g, '');
  variety = variety.replace(/™/g, '');
  
  // Normalize whitespace
  variety = variety.replace(/\s+/g, ' ').trim();
  
  if (variety.length < 3) {
    return description.trim();
  }
  
  return variety;
}

// Clean variety name for saving - more aggressive cleaning
export function cleanVarietyForSaving(description: string): string {
  // First extract the variety
  let variety = extractVariety(description);
  
  // Remove trailing codes in parentheses like (901), (060611), etc.
  variety = variety.replace(/\s*\(\d+\)?\s*$/g, '');
  variety = variety.replace(/\s*\([^)]*\d+[^)]*\)\s*$/g, '');
  
  // Remove backticks and other stray punctuation at end
  variety = variety.replace(/[`'"\s]+$/g, '');
  
  // Remove "MMEA" "HORO" codes that appear after trademark
  variety = variety.replace(/\s+MMEA\s*/gi, ' ');
  variety = variety.replace(/\s+HORO\s*/gi, ' ');
  
  // Additional cleaning for saving
  // Limit to first meaningful portion (before any invoice notes)
  const notePatterns = [
    /\s+tanto\s+/i,
    /\s+per\s+problemi/i,
    /\s+vi\s+accredit/i,
    /\s+nota\s+/i,
    /\s+omaggio\s+/i,
    /\s+NUMERO\s*/i,
    /\s+Fornitore:/i,
  ];
  
  for (const pattern of notePatterns) {
    const match = variety.search(pattern);
    if (match > 10) {
      variety = variety.substring(0, match);
    }
  }
  
  // Normalize multiple spaces
  variety = variety.replace(/\s+/g, ' ').trim();
  
  // Limit length to avoid very long descriptions
  if (variety.length > 60) {
    // Try to find a natural break point
    const breakPoint = variety.lastIndexOf(' ', 60);
    if (breakPoint > 25) {
      variety = variety.substring(0, breakPoint);
    } else {
      variety = variety.substring(0, 60);
    }
  }
  
  return variety.trim();
}

export function normalizeVarietyName(variety: string): string {
  // Canonicalize punctuation for consistent matching
  return variety
    .toLowerCase()
    // Standardize quotes to nothing (remove them)
    .replace(/[''`"\"]/g, '')
    // Standardize dashes/hyphens to single space
    .replace(/[-–—]/g, ' ')
    // Remove parentheses content for matching (but keep outside)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export const plantWarehouse = {
  async getDistributions(): Promise<PlantDistribution[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PLANT_DISTRIBUTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting distributions:', error);
      return [];
    }
  },

  async saveDistribution(distribution: Omit<PlantDistribution, 'id' | 'createdAt'>): Promise<PlantDistribution> {
    try {
      const distributions = await this.getDistributions();
      const newDistribution: PlantDistribution = {
        ...distribution,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      distributions.unshift(newDistribution);
      await AsyncStorage.setItem(KEYS.PLANT_DISTRIBUTIONS, JSON.stringify(distributions));
      return newDistribution;
    } catch (error) {
      console.error('Error saving distribution:', error);
      throw error;
    }
  },

  async deleteDistribution(id: string): Promise<void> {
    try {
      const distributions = await this.getDistributions();
      const filtered = distributions.filter(d => d.id !== id);
      await AsyncStorage.setItem(KEYS.PLANT_DISTRIBUTIONS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting distribution:', error);
      throw error;
    }
  },

  async getPlantLots(): Promise<PlantLot[]> {
    try {
      const inventory = await storage.getPlantInventory();
      const plants = inventory.plants;
      const distributions = await this.getDistributions();
      
      const lotMap = new Map<string, PlantLot>();
      
      for (const plant of plants) {
        const genus = extractGenus(plant.variety);
        const variety = extractVariety(plant.variety);
        const normalizedKey = normalizeVarietyName(variety);
        
        if (lotMap.has(normalizedKey)) {
          const lot = lotMap.get(normalizedKey)!;
          lot.totalQuantity += plant.quantity;
          lot.sources.push({
            sourceDocument: plant.sourceDocument || 'Manuale',
            quantity: plant.quantity,
            arrivalDate: plant.arrivalDate,
          });
        } else {
          lotMap.set(normalizedKey, {
            variety,
            genus,
            totalQuantity: plant.quantity,
            distributedQuantity: 0,
            availableQuantity: plant.quantity,
            sources: [{
              sourceDocument: plant.sourceDocument || 'Manuale',
              quantity: plant.quantity,
              arrivalDate: plant.arrivalDate,
            }],
          });
        }
      }
      
      for (const dist of distributions) {
        const normalizedKey = normalizeVarietyName(dist.variety);
        if (lotMap.has(normalizedKey)) {
          const lot = lotMap.get(normalizedKey)!;
          lot.distributedQuantity += dist.quantity;
          lot.availableQuantity = lot.totalQuantity - lot.distributedQuantity;
        }
      }
      
      return Array.from(lotMap.values()).sort((a, b) => {
        if (a.genus !== b.genus) return a.genus.localeCompare(b.genus);
        return a.variety.localeCompare(b.variety);
      });
    } catch (error) {
      console.error('Error getting plant lots:', error);
      return [];
    }
  },

  async getGroupedByGenus(): Promise<GenusGroup[]> {
    try {
      const lots = await this.getPlantLots();
      
      const genusMap = new Map<string, GenusGroup>();
      
      for (const lot of lots) {
        if (genusMap.has(lot.genus)) {
          const group = genusMap.get(lot.genus)!;
          group.totalPlants += lot.availableQuantity;
          group.varieties.push(lot);
        } else {
          genusMap.set(lot.genus, {
            genus: lot.genus,
            totalPlants: lot.availableQuantity,
            varieties: [lot],
          });
        }
      }
      
      return Array.from(genusMap.values())
        .sort((a, b) => a.genus.localeCompare(b.genus));
    } catch (error) {
      console.error('Error getting grouped plants:', error);
      return [];
    }
  },

  async getDistributionsBySector(greenhouse: number, sector: number): Promise<PlantDistribution[]> {
    try {
      const distributions = await this.getDistributions();
      return distributions.filter(d => d.greenhouse === greenhouse && d.sector === sector);
    } catch (error) {
      console.error('Error getting sector distributions:', error);
      return [];
    }
  },

  async getSectorSummary(): Promise<Map<string, { total: number; byVariety: Map<string, number> }>> {
    try {
      const distributions = await this.getDistributions();
      const summary = new Map<string, { total: number; byVariety: Map<string, number> }>();
      
      for (const dist of distributions) {
        const key = `${dist.greenhouse}-${dist.sector}`;
        
        if (!summary.has(key)) {
          summary.set(key, { total: 0, byVariety: new Map() });
        }
        
        const sectorData = summary.get(key)!;
        sectorData.total += dist.quantity;
        
        const currentVarietyCount = sectorData.byVariety.get(dist.variety) || 0;
        sectorData.byVariety.set(dist.variety, currentVarietyCount + dist.quantity);
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting sector summary:', error);
      return new Map();
    }
  },

  async clearAllDistributions(): Promise<number> {
    try {
      const distributions = await this.getDistributions();
      const count = distributions.length;
      await AsyncStorage.setItem(KEYS.PLANT_DISTRIBUTIONS, JSON.stringify([]));
      return count;
    } catch (error) {
      console.error('Error clearing distributions:', error);
      throw error;
    }
  },
};
