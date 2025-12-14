import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';
import { cleanVarietyForSaving, extractGenus } from './plantWarehouse';

const MIGRATION_KEY = 'serra_migration_v2';

export async function runDataMigrations(): Promise<void> {
  try {
    const migrationDone = await AsyncStorage.getItem(MIGRATION_KEY);
    
    if (migrationDone === 'done') {
      console.log('[Migration] Already completed, skipping');
      return;
    }
    
    console.log('[Migration] Starting plant variety cleanup...');
    
    const inventory = await storage.getPlantInventory();
    let cleaned = 0;
    
    for (const plant of inventory.plants) {
      const originalVariety = plant.variety;
      const cleanedVariety = cleanVarietyForSaving(originalVariety);
      
      if (cleanedVariety !== originalVariety) {
        plant.variety = cleanedVariety;
        cleaned++;
        console.log(`[Migration] Cleaned: "${originalVariety.substring(0, 40)}..." -> "${cleanedVariety}"`);
      }
    }
    
    if (cleaned > 0) {
      await AsyncStorage.setItem('serra_plant_inventory', JSON.stringify(inventory));
      console.log(`[Migration] Cleaned ${cleaned} plant varieties`);
    } else {
      console.log('[Migration] No plants needed cleaning');
    }
    
    await AsyncStorage.setItem(MIGRATION_KEY, 'done');
    console.log('[Migration] Complete');
    
  } catch (error) {
    console.error('[Migration] Error:', error);
  }
}

export async function forceMigration(): Promise<number> {
  await AsyncStorage.removeItem(MIGRATION_KEY);
  
  const inventory = await storage.getPlantInventory();
  let cleaned = 0;
  
  for (const plant of inventory.plants) {
    const originalVariety = plant.variety;
    const cleanedVariety = cleanVarietyForSaving(originalVariety);
    
    if (cleanedVariety !== originalVariety) {
      plant.variety = cleanedVariety;
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    await AsyncStorage.setItem('serra_plant_inventory', JSON.stringify(inventory));
  }
  
  await AsyncStorage.setItem(MIGRATION_KEY, 'done');
  return cleaned;
}
