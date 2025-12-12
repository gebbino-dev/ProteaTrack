import { storage } from './storage';
import { plantWarehouse, PlantLot } from './plantWarehouse';
import { pendingInvoiceStore, PendingInvoiceLine } from './pendingInvoiceStore';
import { Activity, Treatment, Transaction, PlantRecord } from '@/types';

export type CalendarEventType = 
  | 'activity' 
  | 'treatment' 
  | 'plant_arrival' 
  | 'transaction'
  | 'pending_import';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  subtitle: string;
  date: string;
  color: string;
  icon: string;
  metadata: {
    originalId: string;
    category?: string;
    amount?: number;
    quantity?: number;
  };
}

const EVENT_COLORS: Record<CalendarEventType, string> = {
  activity: '#2196F3',
  treatment: '#9C27B0',
  plant_arrival: '#4CAF50',
  transaction: '#FF9800',
  pending_import: '#607D8B',
};

const EVENT_ICONS: Record<CalendarEventType, string> = {
  activity: 'activity',
  treatment: 'shield',
  plant_arrival: 'sun',
  transaction: 'dollar-sign',
  pending_import: 'inbox',
};

const ACTIVITY_COLORS: Record<string, string> = {
  innaffiatura: '#2196F3',
  concimazione: '#8B4513',
  potatura: '#FF9800',
  trattamento: '#9C27B0',
  altro: '#607D8B',
};

export const eventAggregator = {
  async getEventsForDate(dateStr: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    
    const [activities, treatments, transactions, plantInventory] = await Promise.all([
      storage.getActivities(),
      storage.getTreatments(),
      storage.getTransactions(),
      storage.getPlantInventory(),
    ]);
    
    const datePrefix = dateStr.split('T')[0];
    
    activities
      .filter(a => a.date.startsWith(datePrefix))
      .forEach(a => {
        events.push(this.activityToEvent(a));
      });
    
    treatments
      .filter(t => t.date.startsWith(datePrefix))
      .forEach(t => {
        events.push(this.treatmentToEvent(t));
      });
    
    transactions
      .filter(tx => tx.date.startsWith(datePrefix))
      .forEach(tx => {
        events.push(this.transactionToEvent(tx));
      });
    
    plantInventory.plants
      .filter(p => p.arrivalDate.startsWith(datePrefix))
      .forEach(p => {
        events.push(this.plantArrivalToEvent(p));
      });
    
    return events.sort((a, b) => a.title.localeCompare(b.title));
  },

  async getAllEventDates(): Promise<Map<string, CalendarEventType[]>> {
    const dateMap = new Map<string, CalendarEventType[]>();
    
    const [activities, treatments, transactions, plantInventory] = await Promise.all([
      storage.getActivities(),
      storage.getTreatments(),
      storage.getTransactions(),
      storage.getPlantInventory(),
    ]);
    
    const addDate = (date: string, type: CalendarEventType) => {
      const dateKey = date.split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      const types = dateMap.get(dateKey)!;
      if (!types.includes(type)) {
        types.push(type);
      }
    };
    
    activities.forEach(a => addDate(a.date, 'activity'));
    treatments.forEach(t => addDate(t.date, 'treatment'));
    transactions.forEach(tx => addDate(tx.date, 'transaction'));
    plantInventory.plants.forEach(p => addDate(p.arrivalDate, 'plant_arrival'));
    
    return dateMap;
  },

  async getEventCountsByType(): Promise<Record<CalendarEventType, number>> {
    const [activities, treatments, transactions, plantInventory] = await Promise.all([
      storage.getActivities(),
      storage.getTreatments(),
      storage.getTransactions(),
      storage.getPlantInventory(),
    ]);
    
    return {
      activity: activities.length,
      treatment: treatments.length,
      plant_arrival: plantInventory.plants.length,
      transaction: transactions.length,
      pending_import: 0,
    };
  },

  async getUpcomingArrivals(days: number = 30): Promise<CalendarEvent[]> {
    const plantInventory = await storage.getPlantInventory();
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    
    return plantInventory.plants
      .filter(p => p.arrivalDate >= todayStr && p.arrivalDate <= futureStr)
      .map(p => this.plantArrivalToEvent(p))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getRecentEvents(limit: number = 20): Promise<CalendarEvent[]> {
    const [activities, treatments, transactions, plantInventory] = await Promise.all([
      storage.getActivities(),
      storage.getTreatments(),
      storage.getTransactions(),
      storage.getPlantInventory(),
    ]);
    
    const allEvents: CalendarEvent[] = [
      ...activities.map(a => this.activityToEvent(a)),
      ...treatments.map(t => this.treatmentToEvent(t)),
      ...transactions.map(tx => this.transactionToEvent(tx)),
      ...plantInventory.plants.map(p => this.plantArrivalToEvent(p)),
    ];
    
    return allEvents
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  },

  activityToEvent(activity: Activity): CalendarEvent {
    const typeLabel = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
    let location = '';
    if (activity.locationType === 'serra' && activity.greenhouse) {
      location = `Serra ${activity.greenhouse}`;
      if (activity.sector) location += `, Settore ${activity.sector}`;
    } else if (activity.customLocation) {
      location = activity.customLocation;
    }
    
    return {
      id: `activity_${activity.id}`,
      type: 'activity',
      title: typeLabel,
      subtitle: location || activity.notes || '',
      date: activity.date,
      color: ACTIVITY_COLORS[activity.type] || EVENT_COLORS.activity,
      icon: activity.type === 'innaffiatura' ? 'droplet' :
            activity.type === 'concimazione' ? 'zap' :
            activity.type === 'potatura' ? 'scissors' :
            activity.type === 'trattamento' ? 'shield' : 'activity',
      metadata: {
        originalId: activity.id,
        category: activity.type,
      },
    };
  },

  treatmentToEvent(treatment: Treatment): CalendarEvent {
    let location = '';
    if (treatment.locationType === 'serra' && treatment.greenhouse) {
      location = `Serra ${treatment.greenhouse}`;
      if (treatment.sector) location += `, Settore ${treatment.sector}`;
    } else if (treatment.customLocation) {
      location = treatment.customLocation;
    }
    
    return {
      id: `treatment_${treatment.id}`,
      type: 'treatment',
      title: treatment.productName,
      subtitle: `${treatment.dosePerHl} g/hl - ${location}`,
      date: treatment.date,
      color: EVENT_COLORS.treatment,
      icon: 'shield',
      metadata: {
        originalId: treatment.id,
        category: 'trattamento',
      },
    };
  },

  transactionToEvent(transaction: Transaction): CalendarEvent {
    const isIncome = transaction.type === 'ricavo';
    return {
      id: `transaction_${transaction.id}`,
      type: 'transaction',
      title: transaction.description || transaction.counterparty || 'Movimento',
      subtitle: `${isIncome ? '+' : '-'}${transaction.amount.toFixed(2)} EUR`,
      date: transaction.date,
      color: isIncome ? '#4CAF50' : '#F44336',
      icon: isIncome ? 'trending-up' : 'trending-down',
      metadata: {
        originalId: transaction.id,
        category: transaction.categoryId,
        amount: transaction.amount,
      },
    };
  },

  plantArrivalToEvent(plant: PlantRecord): CalendarEvent {
    return {
      id: `plant_${plant.id}`,
      type: 'plant_arrival',
      title: plant.variety,
      subtitle: `${plant.quantity} piante - ${plant.sourceDocument || 'Manuale'}`,
      date: plant.arrivalDate,
      color: EVENT_COLORS.plant_arrival,
      icon: 'sun',
      metadata: {
        originalId: plant.id,
        category: 'piante',
        quantity: plant.quantity,
      },
    };
  },

  getEventColor(type: CalendarEventType): string {
    return EVENT_COLORS[type];
  },

  getEventIcon(type: CalendarEventType): string {
    return EVENT_ICONS[type];
  },
};
