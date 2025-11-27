import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, Bench, UserSettings, SECTORS_PER_GREENHOUSE, BENCHES } from '@/types';

const KEYS = {
  ACTIVITIES: 'serra_activities',
  BENCHES: 'serra_benches',
  SETTINGS: 'serra_settings',
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

  async getBench(greenhouse: number, sector: number, benchNumber: string): Promise<Bench | null> {
    const benches = await this.getBenches();
    return benches.find(
      b => b.greenhouse === greenhouse && b.sector === sector && b.benchNumber === benchNumber
    ) || null;
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

  async initializeBenches(): Promise<void> {
    const existingBenches = await this.getBenches();
    if (existingBenches.length > 0) return;

    const benches: Bench[] = [];
    for (const [greenhouse, sectors] of Object.entries(SECTORS_PER_GREENHOUSE)) {
      for (const sector of sectors) {
        for (const benchNumber of BENCHES) {
          benches.push({
            id: generateId(),
            greenhouse: parseInt(greenhouse),
            sector,
            benchNumber,
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
