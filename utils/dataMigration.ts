import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';
import { cleanVarietyForSaving } from './plantWarehouse';

const CURRENT_MIGRATION_VERSION = 4;
const MIGRATION_VERSION_KEY = 'serra_migration_version';

export async function runDataMigrations(): Promise<void> {
  try {
    const versionStr = await AsyncStorage.getItem(MIGRATION_VERSION_KEY);
    const currentVersion = versionStr ? parseInt(versionStr, 10) : 0;
    
    if (currentVersion >= CURRENT_MIGRATION_VERSION) {
      console.log(`[Migration] Already at version ${currentVersion}, skipping`);
      return;
    }
    
    console.log(`[Migration] Upgrading from version ${currentVersion} to ${CURRENT_MIGRATION_VERSION}...`);
    
    const inventory = await storage.getPlantInventory();
    let cleaned = 0;
    
    for (const plant of inventory.plants) {
      const originalVariety = plant.variety;
      const cleanedVariety = cleanVarietyForSaving(originalVariety);
      
      if (cleanedVariety !== originalVariety) {
        plant.variety = cleanedVariety;
        cleaned++;
        console.log(`[Migration] Cleaned: "${originalVariety.substring(0, 50)}..." -> "${cleanedVariety}"`);
      }
    }
    
    if (cleaned > 0) {
      await AsyncStorage.setItem('serra_plant_inventory', JSON.stringify(inventory));
      console.log(`[Migration] Cleaned ${cleaned} plant varieties`);
    } else {
      console.log('[Migration] No plants needed cleaning');
    }
    
    await AsyncStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION.toString());
    console.log(`[Migration] Complete - now at version ${CURRENT_MIGRATION_VERSION}`);
    
  } catch (error) {
    console.error('[Migration] Error:', error);
  }
}

export async function forceMigration(): Promise<number> {
  await AsyncStorage.removeItem(MIGRATION_VERSION_KEY);
  
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
