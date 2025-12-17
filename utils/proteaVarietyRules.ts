import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'serra_protea_variety_rules';

export type ProteaGenus = 'Protea' | 'Leucospermum' | 'Telopea' | 'Serruria' | 'Banksia' | 'Leucadendron' | 'Grevillea';

export interface ProteaVarietyRule {
  id: string;
  genus: ProteaGenus;
  scientificName: string;
  tradeName?: string;
  keywords: string[];
  createdAt: string;
}

export interface ProteaMatchResult {
  genus?: ProteaGenus;
  scientificName?: string;
  tradeName?: string;
  matchedRuleId?: string;
}

function generateRuleId(): string {
  return `protea_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const proteaVarietyRulesStore = {
  async getRules(): Promise<ProteaVarietyRule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[ProteaRules] Errore caricamento regole:', error);
      return [];
    }
  },

  async saveRule(input: Omit<ProteaVarietyRule, 'id' | 'createdAt'>): Promise<ProteaVarietyRule> {
    const rules = await this.getRules();
    
    const newRule: ProteaVarietyRule = {
      ...input,
      id: generateRuleId(),
      createdAt: new Date().toISOString(),
    };
    
    rules.push(newRule);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    
    console.log('[ProteaRules] Regola salvata:', newRule);
    return newRule;
  },

  async updateRule(id: string, updates: Partial<Omit<ProteaVarietyRule, 'id' | 'createdAt'>>): Promise<ProteaVarietyRule | null> {
    const rules = await this.getRules();
    const index = rules.findIndex(r => r.id === id);
    
    if (index === -1) {
      console.warn('[ProteaRules] Regola non trovata:', id);
      return null;
    }
    
    rules[index] = { ...rules[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    
    console.log('[ProteaRules] Regola aggiornata:', rules[index]);
    return rules[index];
  },

  async deleteRule(id: string): Promise<boolean> {
    const rules = await this.getRules();
    const filtered = rules.filter(r => r.id !== id);
    
    if (filtered.length === rules.length) {
      console.warn('[ProteaRules] Regola non trovata per eliminazione:', id);
      return false;
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('[ProteaRules] Regola eliminata:', id);
    return true;
  },

  async clearRules(): Promise<number> {
    const rules = await this.getRules();
    const count = rules.length;
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[ProteaRules] Tutte le regole eliminate:', count);
    return count;
  },
};

export function matchProteaVariety(
  description: string,
  rules: ProteaVarietyRule[]
): ProteaMatchResult {
  const desc = description.toLowerCase();

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (!kw) continue;
      if (desc.includes(kw.toLowerCase())) {
        console.log(`[ProteaRules] Match trovato: "${kw}" -> ${rule.genus} ${rule.scientificName}`);
        return {
          genus: rule.genus,
          scientificName: rule.scientificName,
          tradeName: rule.tradeName,
          matchedRuleId: rule.id,
        };
      }
    }
  }

  return {};
}

export const PROTEA_GENUS_LIST: ProteaGenus[] = [
  'Protea',
  'Leucospermum',
  'Leucadendron',
  'Telopea',
  'Serruria',
  'Banksia',
  'Grevillea',
];

export const PROTEA_GENUS_CONFIG: Record<ProteaGenus, { label: string; color: string }> = {
  'Protea': { label: 'Protea', color: '#E91E63' },
  'Leucospermum': { label: 'Leucospermum', color: '#FF9800' },
  'Leucadendron': { label: 'Leucadendron', color: '#4CAF50' },
  'Telopea': { label: 'Telopea', color: '#F44336' },
  'Serruria': { label: 'Serruria', color: '#9C27B0' },
  'Banksia': { label: 'Banksia', color: '#795548' },
  'Grevillea': { label: 'Grevillea', color: '#00BCD4' },
};

export async function quickAddRule(
  genus: ProteaGenus,
  scientificName: string,
  keywordsCsv: string,
  tradeName?: string
): Promise<ProteaVarietyRule> {
  const keywords = keywordsCsv.split(',').map(k => k.trim()).filter(Boolean);
  return proteaVarietyRulesStore.saveRule({ genus, scientificName, keywords, tradeName });
}
