import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG_KEY = 'serra_debug_test';

export const storageDebug = {
  async testPersistence(): Promise<{ 
    canWrite: boolean; 
    canRead: boolean; 
    valueMatches: boolean;
    storedValue: string | null;
    error?: string;
  }> {
    const testValue = `test_${Date.now()}`;
    let canWrite = false;
    let canRead = false;
    let valueMatches = false;
    let storedValue: string | null = null;
    let error: string | undefined;

    try {
      await AsyncStorage.setItem(DEBUG_KEY, testValue);
      canWrite = true;
      console.log('[StorageDebug] Write successful:', testValue);
    } catch (e) {
      error = `Write failed: ${e}`;
      console.error('[StorageDebug] Write failed:', e);
    }

    try {
      storedValue = await AsyncStorage.getItem(DEBUG_KEY);
      canRead = true;
      valueMatches = storedValue === testValue;
      console.log('[StorageDebug] Read successful:', storedValue, 'matches:', valueMatches);
    } catch (e) {
      error = (error || '') + ` Read failed: ${e}`;
      console.error('[StorageDebug] Read failed:', e);
    }

    return { canWrite, canRead, valueMatches, storedValue, error };
  },

  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('[StorageDebug] All keys:', keys);
      return [...keys];
    } catch (e) {
      console.error('[StorageDebug] getAllKeys failed:', e);
      return [];
    }
  },

  async getStorageStats(): Promise<{
    totalKeys: number;
    keys: string[];
    sizes: Record<string, number>;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sizes: Record<string, number> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        sizes[key] = value ? value.length : 0;
      }

      console.log('[StorageDebug] Storage stats:', { totalKeys: keys.length, keys, sizes });
      return { totalKeys: keys.length, keys: [...keys], sizes };
    } catch (e) {
      console.error('[StorageDebug] getStorageStats failed:', e);
      return { totalKeys: 0, keys: [], sizes: {} };
    }
  },

  async logAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('[StorageDebug] === STORAGE DUMP START ===');
      console.log('[StorageDebug] Total keys:', keys.length);
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        const preview = value ? value.substring(0, 200) : 'null';
        console.log(`[StorageDebug] ${key}: ${preview}${value && value.length > 200 ? '...' : ''}`);
      }
      
      console.log('[StorageDebug] === STORAGE DUMP END ===');
    } catch (e) {
      console.error('[StorageDebug] logAllData failed:', e);
    }
  },

  async checkDataExists(): Promise<{
    pendingLines: number;
    transactions: number;
    activities: number;
    benches: number;
    treatments: number;
  }> {
    const counts = {
      pendingLines: 0,
      transactions: 0,
      activities: 0,
      benches: 0,
      treatments: 0,
    };

    try {
      const pendingData = await AsyncStorage.getItem('serra_pending_invoice_lines');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        counts.pendingLines = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('[StorageDebug] Error reading pending lines:', e);
    }

    try {
      const transData = await AsyncStorage.getItem('serra_transactions');
      if (transData) {
        const parsed = JSON.parse(transData);
        counts.transactions = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('[StorageDebug] Error reading transactions:', e);
    }

    try {
      const actData = await AsyncStorage.getItem('serra_activities');
      if (actData) {
        const parsed = JSON.parse(actData);
        counts.activities = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('[StorageDebug] Error reading activities:', e);
    }

    try {
      const benchData = await AsyncStorage.getItem('serra_benches');
      if (benchData) {
        const parsed = JSON.parse(benchData);
        counts.benches = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('[StorageDebug] Error reading benches:', e);
    }

    try {
      const treatData = await AsyncStorage.getItem('serra_treatments');
      if (treatData) {
        const parsed = JSON.parse(treatData);
        counts.treatments = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('[StorageDebug] Error reading treatments:', e);
    }

    console.log('[StorageDebug] Data counts:', counts);
    return counts;
  },
};
