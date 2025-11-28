import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, Bench, UserSettings, GreenhouseConfig, DEFAULT_GREENHOUSE_CONFIG } from '@/types';

const KEYS = {
  ACTIVITIES: 'serra_activities',
  BENCHES: 'serra_benches',
  SETTINGS: 'serra_settings',
  GREENHOUSE_CONFIG: 'serra_greenhouse_config',
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const storage = {
  async getActivities(): Promise<Activity[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  },

  async saveActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    try {
      const activities = await this.getActivities();
      const newActivity: Activity = {
        ...activity,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      activities.unshift(newActivity);
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
      return newActivity;
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  },

  async deleteActivity(id: string): Promise<void> {
    try {
      const activities = await this.getActivities();
      const filtered = activities.filter(a => a.id !== id);
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity | null> {
    try {
      const activities = await this.getActivities();
      const index = activities.findIndex(a => a.id === id);
      if (index < 0) return null;
      
      const updated = { ...activities[index], ...updates };
      activities[index] = updated;
      await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
      return updated;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  },

  async getActivitiesForBench(greenhouse: number, sector: number, bench: string): Promise<Activity[]> {
    const activities = await this.getActivities();
    return activities.filter(
      a => a.greenhouse === greenhouse && a.sector === sector && a.bench === bench
    );
  },

  async getActivitiesForDate(date: string): Promise<Activity[]> {
    const activities = await this.getActivities();
    return activities.filter(a => a.date.startsWith(date));
  },

  async getBenches(): Promise<Bench[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BENCHES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting benches:', error);
      return [];
    }
  },

  async saveBench(bench: Omit<Bench, 'id'>): Promise<Bench> {
    try {
      const benches = await this.getBenches();
      const existingIndex = benches.findIndex(
        b => b.greenhouse === bench.greenhouse && b.sector === bench.sector && b.benchNumber === bench.benchNumber
      );
      
      const newBench: Bench = {
        ...bench,
        id: existingIndex >= 0 ? benches[existingIndex].id : generateId(),
      };

      if (existingIndex >= 0) {
        benches[existingIndex] = newBench;
      } else {
        benches.push(newBench);
      }

      await AsyncStorage.setItem(KEYS.BENCHES, JSON.stringify(benches));
      return newBench;
    } catch (error) {
      console.error('Error saving bench:', error);
      throw error;
    }
  },

  async getBench(greenhouse: number, sector: number, benchNumber: string): Promise<Bench> {
    await this.initializeBenches();
    const benches = await this.getBenches();
    const found = benches.find(
      b => b.greenhouse === greenhouse && b.sector === sector && b.benchNumber === benchNumber
    );
    if (found) return found;
    return {
      id: generateId(),
      greenhouse,
      sector,
      benchNumber,
      plantCount: 0,
      variety: '',
      plantingDate: '',
      notes: '',
    };
  },

  async getSettings(): Promise<UserSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : {
        name: '',
        companyName: '',
        location: '',
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        name: '',
        companyName: '',
        location: '',
      };
    }
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async getStats(): Promise<{
    totalPlants: number;
    todayActivities: number;
    recentActivities: Activity[];
    benchesWithPlants: number;
  }> {
    const [benches, activities] = await Promise.all([
      this.getBenches(),
      this.getActivities(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.date.startsWith(today));
    const totalPlants = benches.reduce((sum, b) => sum + b.plantCount, 0);
    const benchesWithPlants = benches.filter(b => b.plantCount > 0).length;

    return {
      totalPlants,
      todayActivities: todayActivities.length,
      recentActivities: activities.slice(0, 10),
      benchesWithPlants,
    };
  },

  async getGreenhouseConfig(): Promise<GreenhouseConfig> {
    try {
      const data = await AsyncStorage.getItem(KEYS.GREENHOUSE_CONFIG);
      return data ? JSON.parse(data) : DEFAULT_GREENHOUSE_CONFIG;
    } catch (error) {
      console.error('Error getting greenhouse config:', error);
      return DEFAULT_GREENHOUSE_CONFIG;
    }
  },

  async saveGreenhouseConfig(config: GreenhouseConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.GREENHOUSE_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving greenhouse config:', error);
      throw error;
    }
  },

  async initializeBenches(): Promise<void> {
    const existingBenches = await this.getBenches();
    if (existingBenches.length > 0) return;

    const config = await this.getGreenhouseConfig();
    const benches: Bench[] = [];
    
    for (const greenhouse of config.greenhouses) {
      for (const sector of greenhouse.sectors) {
        const benchNames = greenhouse.benchNames || Array.from({ length: greenhouse.benchCount }, (_, i) => `B${i + 1}`);
        for (const benchName of benchNames) {
          benches.push({
            id: generateId(),
            greenhouse: greenhouse.id,
            sector: sector.id,
            benchNumber: benchName,
            plantCount: 0,
            variety: '',
            plantingDate: '',
            notes: '',
          });
        }
      }
    }
    await AsyncStorage.setItem(KEYS.BENCHES, JSON.stringify(benches));
  },

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEYS.ACTIVITIES, KEYS.BENCHES, KEYS.SETTINGS]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  },
};
