/**
 * Modulo per le regole di categorizzazione personalizzate dall'utente.
 * 
 * Le regole utente hanno PRIORITÀ sulla classificazione automatica:
 * se una keyword definita dall'utente matcha la descrizione della riga fattura,
 * viene usata la categoria/varietà specificata invece di quella dedotta automaticamente.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItemCategory } from './pendingInvoiceStore';
import { CategoriaRiga, SottoCategoriaUtenza } from './autoCategorizationService';

const STORAGE_KEY = 'serra_user_categorization_rules';

export interface UserCategorizationRule {
  id: string;
  keyword: string;
  itemCategory: ItemCategory;
  categoriaRiga?: CategoriaRiga;
  sottoCategoriaUtenza?: SottoCategoriaUtenza;
  forcedVariety?: string;
  forcedSpecies?: string;
  createdAt: string;
}

export interface UserRuleMatch {
  itemCategory?: ItemCategory;
  categoriaRiga?: CategoriaRiga;
  sottoCategoriaUtenza?: SottoCategoriaUtenza;
  forcedVariety?: string;
  forcedSpecies?: string;
}

function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const userCategorizationRulesStore = {
  async getRules(): Promise<UserCategorizationRule[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('[UserRules] Errore caricamento regole:', error);
      return [];
    }
  },

  async saveRule(ruleInput: Omit<UserCategorizationRule, 'id' | 'createdAt'>): Promise<UserCategorizationRule> {
    const rules = await this.getRules();
    
    const newRule: UserCategorizationRule = {
      ...ruleInput,
      id: generateRuleId(),
      createdAt: new Date().toISOString(),
    };
    
    rules.push(newRule);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    
    console.log('[UserRules] Regola salvata:', newRule);
    return newRule;
  },

  async updateRule(id: string, updates: Partial<Omit<UserCategorizationRule, 'id' | 'createdAt'>>): Promise<UserCategorizationRule | null> {
    const rules = await this.getRules();
    const index = rules.findIndex(r => r.id === id);
    
    if (index === -1) {
      console.warn('[UserRules] Regola non trovata:', id);
      return null;
    }
    
    rules[index] = { ...rules[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    
    console.log('[UserRules] Regola aggiornata:', rules[index]);
    return rules[index];
  },

  async deleteRule(id: string): Promise<boolean> {
    const rules = await this.getRules();
    const filtered = rules.filter(r => r.id !== id);
    
    if (filtered.length === rules.length) {
      console.warn('[UserRules] Regola non trovata per eliminazione:', id);
      return false;
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('[UserRules] Regola eliminata:', id);
    return true;
  },

  async clearRules(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[UserRules] Tutte le regole eliminate');
  },
};

/**
 * Applica le regole utente a una descrizione.
 * Ritorna il primo match trovato (le regole sono valutate in ordine).
 * 
 * @param description - Descrizione della riga fattura
 * @param rules - Array di regole utente
 * @returns Oggetto con categoria e varietà forzate, o vuoto se nessun match
 */
export function applyUserRules(
  description: string,
  rules: UserCategorizationRule[]
): UserRuleMatch {
  const desc = description.toLowerCase();
  
  for (const rule of rules) {
    if (desc.includes(rule.keyword.toLowerCase())) {
      console.log(`[UserRules] Match trovato: "${rule.keyword}" -> ${rule.itemCategory}`);
      return {
        itemCategory: rule.itemCategory,
        categoriaRiga: rule.categoriaRiga,
        sottoCategoriaUtenza: rule.sottoCategoriaUtenza,
        forcedVariety: rule.forcedVariety,
        forcedSpecies: rule.forcedSpecies,
      };
    }
  }
  
  return {};
}

/**
 * Helper per convertire ItemCategory in CategoriaRiga
 */
export function itemCategoryToCategoriaRiga(itemCategory: ItemCategory): CategoriaRiga {
  const map: Record<ItemCategory, CategoriaRiga> = {
    'piante': 'piante',
    'semi': 'semi',
    'terriccio': 'terriccio',
    'vasi': 'vasi',
    'fitofarmaco': 'fitofarmaci',
    'fertilizzante': 'fertilizzanti',
    'utenza': 'utenze',
    'materiale': 'materiale_generico',
    'altro': 'materiale_generico',
  };
  return map[itemCategory] || 'materiale_generico';
}
