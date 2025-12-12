import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

const ALL_STORAGE_KEYS = [
  'serra_activities',
  'serra_benches',
  'serra_settings',
  'serra_greenhouse_config',
  'serra_plant_inventory',
  'serra_transactions',
  'serra_categories',
  'serra_treatments',
  'serra_products',
  'serra_pending_invoice_lines',
  'serra_plant_distributions',
  'serra_materials',
];

export interface BackupData {
  version: number;
  createdAt: string;
  appName: string;
  data: Record<string, unknown>;
}

export const backupService = {
  async exportAllData(): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const data: Record<string, unknown> = {};
      
      for (const key of ALL_STORAGE_KEYS) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }

      const backup: BackupData = {
        version: 1,
        createdAt: new Date().toISOString(),
        appName: 'ProteaTrack',
        data,
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const fileName = `proteatrack_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, message: 'Backup scaricato con successo' };
      }

      const file = new ExpoFile(Paths.cache, fileName);
      await file.write(jsonString);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Esporta Backup ProteaTrack',
          UTI: 'public.json',
        });
        return { success: true, message: 'Backup esportato con successo', filePath: file.uri };
      } else {
        return { success: true, message: `Backup salvato`, filePath: file.uri };
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, message: `Errore durante l'esportazione: ${error}` };
    }
  },

  async importData(): Promise<{ success: boolean; message: string; itemsImported?: number }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Importazione annullata' };
      }

      const pickedFile = result.assets[0];
      let jsonString: string;

      if (Platform.OS === 'web') {
        const response = await fetch(pickedFile.uri);
        jsonString = await response.text();
      } else {
        const file = new ExpoFile(pickedFile.uri);
        jsonString = await file.text();
      }

      const backup: BackupData = JSON.parse(jsonString);

      if (!backup.version || !backup.data || backup.appName !== 'ProteaTrack') {
        return { 
          success: false, 
          message: 'File non valido. Assicurati di selezionare un backup di ProteaTrack.' 
        };
      }

      for (const key of ALL_STORAGE_KEYS) {
        await AsyncStorage.removeItem(key);
      }

      let itemsImported = 0;
      for (const [key, value] of Object.entries(backup.data)) {
        if (ALL_STORAGE_KEYS.includes(key)) {
          await AsyncStorage.setItem(key, JSON.stringify(value));
          itemsImported++;
        }
      }

      return { 
        success: true, 
        message: `Importati ${itemsImported} archivi. Riavvia l'app per applicare le modifiche.`, 
        itemsImported 
      };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, message: `Errore durante l'importazione: ${error}` };
    }
  },

  async getBackupStats(): Promise<{ 
    totalItems: number; 
    categories: { name: string; count: number }[] 
  }> {
    const categories: { name: string; count: number }[] = [];
    let totalItems = 0;

    const keyLabels: Record<string, string> = {
      'serra_activities': 'Attività',
      'serra_benches': 'Bancali',
      'serra_settings': 'Impostazioni',
      'serra_greenhouse_config': 'Configurazione Serre',
      'serra_plant_inventory': 'Inventario Piante',
      'serra_transactions': 'Transazioni',
      'serra_categories': 'Categorie',
      'serra_treatments': 'Trattamenti',
      'serra_products': 'Prodotti Fitosanitari',
      'serra_pending_invoice_lines': 'Righe Fattura in Attesa',
      'serra_plant_distributions': 'Distribuzioni Piante',
      'serra_materials': 'Materiali',
    };

    for (const key of ALL_STORAGE_KEYS) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const count = Array.isArray(parsed) ? parsed.length : 1;
          categories.push({ name: keyLabels[key] || key, count });
          totalItems += count;
        } catch {
          categories.push({ name: keyLabels[key] || key, count: 1 });
          totalItems += 1;
        }
      }
    }

    return { totalItems, categories: categories.filter(c => c.count > 0) };
  },
};
