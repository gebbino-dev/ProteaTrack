export type ActivityType = 'innaffiatura' | 'concimazione' | 'potatura' | 'trattamento' | 'altro';
export type LocationType = 'serra' | 'campo_aperto';

export interface Activity {
  id: string;
  type: ActivityType;
  greenhouse: number | null;
  sector: number | null;
  bench: string | null;
  locationType: LocationType;
  customLocation: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Bench {
  id: string;
  greenhouse: number;
  sector: number;
  benchNumber: string;
  plantCount: number;
  variety: string;
  plantingDate: string;
  notes: string;
  placche: number;
}

export interface PlantRecord {
  id: string;
  variety: string;
  species?: string;
  quantity: number;
  arrivalDate: string;
  sourceDocument?: string;
  notes: string;
}

export interface PlantInventory {
  plants: PlantRecord[];
}

export interface Sector {
  id: number;
  customName?: string;
}

export interface Greenhouse {
  id: number;
  customName?: string;
  sectors: Sector[];
  benchCount: number;
  benchNames?: string[];
}

export interface GreenhouseConfig {
  greenhouses: Greenhouse[];
  hasOpenField: boolean;
}

export interface UserSettings {
  name: string;
  companyName: string;
  location: string;
}

// ============================================
// GESTIONALE CONTABILE (Accounting Types)
// ============================================

export type TransactionType = 'ricavo' | 'costo';

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  categoryId: string;
  amount: number;
  date: string;
  counterparty: string;
  description: string;
  docRef?: string;
  docType?: string;
  vatRate?: number;
  notes: string;
  source: 'manual' | 'ocr' | 'import';
  createdAt: string;
}

export interface FinancialSummary {
  period: string;
  income: number;
  expenses: number;
  margin: number;
  byCategory: { categoryId: string; total: number }[];
}

// ============================================
// QUADERNO DI CAMPAGNA (Field Notebook Types)
// ============================================

export interface PhytosanitaryProduct {
  id: string;
  name: string;
  activeIngredient?: string;
  formulation?: string;
  registrationNumber?: string;
  phiDays?: number;
  fracCode?: string;
  notes: string;
}

export interface Treatment {
  id: string;
  greenhouse: number | null;
  sector: number | null;
  bench: string | null;
  locationType: LocationType;
  customLocation: string;
  productId: string;
  productName: string;
  dosePerHl: number;
  waterLiters: number;
  areaM2?: number;
  targetPest?: string;
  date: string;
  weatherConditions?: string;
  notes: string;
  linkedActivityId?: string;
  externalId?: string;
  createdAt: string;
}

// Default categories for accounting
export const DEFAULT_EXPENSE_CATEGORIES: TransactionCategory[] = [
  { id: 'cat_materiali', name: 'Materiali', type: 'costo', icon: 'package', color: '#8B4513' },
  { id: 'cat_manodopera', name: 'Manodopera', type: 'costo', icon: 'users', color: '#2196F3' },
  { id: 'cat_fitofarmaci', name: 'Fitofarmaci', type: 'costo', icon: 'shield', color: '#9C27B0' },
  { id: 'cat_fertilizzanti', name: 'Fertilizzanti', type: 'costo', icon: 'droplet', color: '#4CAF50' },
  { id: 'cat_piante', name: 'Acquisto Piante', type: 'costo', icon: 'feather', color: '#FF9800' },
  { id: 'cat_utenze', name: 'Utenze', type: 'costo', icon: 'zap', color: '#FFC107' },
  { id: 'cat_manutenzione', name: 'Manutenzione', type: 'costo', icon: 'tool', color: '#607D8B' },
  { id: 'cat_carburante', name: 'Carburante', type: 'costo', icon: 'truck', color: '#795548' },
  { id: 'cat_altro_costo', name: 'Altro', type: 'costo', icon: 'more-horizontal', color: '#9E9E9E' },
];

export const DEFAULT_REVENUE_CATEGORIES: TransactionCategory[] = [
  { id: 'cat_vendita_piante', name: 'Vendita Piante', type: 'ricavo', icon: 'shopping-bag', color: '#4CAF50' },
  { id: 'cat_vendita_fiori', name: 'Vendita Fiori Recisi', type: 'ricavo', icon: 'gift', color: '#E91E63' },
  { id: 'cat_servizi', name: 'Servizi', type: 'ricavo', icon: 'briefcase', color: '#3F51B5' },
  { id: 'cat_contributi', name: 'Contributi/Sussidi', type: 'ricavo', icon: 'award', color: '#00BCD4' },
  { id: 'cat_altro_ricavo', name: 'Altro', type: 'ricavo', icon: 'more-horizontal', color: '#9E9E9E' },
];

export const DEFAULT_CATEGORIES: TransactionCategory[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_REVENUE_CATEGORIES,
];

export interface GreenhouseStats {
  totalPlants: number;
  activeSectors: number;
  todayActivities: number;
}

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'innaffiatura', label: 'Innaffiatura', icon: 'droplet' },
  { value: 'concimazione', label: 'Concimazione', icon: 'package' },
  { value: 'potatura', label: 'Potatura', icon: 'scissors' },
  { value: 'trattamento', label: 'Trattamento', icon: 'shield' },
  { value: 'altro', label: 'Altro', icon: 'more-horizontal' },
];

export const PROTEACEAE_VARIETIES = [
  'Leucospermum cordifolium',
  'Protea cynaroides',
  'Leucadendron salignum',
  'Banksia coccinea',
  'Protea magnifica',
  'Leucospermum reflexum',
  'Protea repens',
  'Leucadendron laureolum',
  'Banksia prionotes',
  'Protea neriifolia',
];

export const DEFAULT_GREENHOUSE_CONFIG: GreenhouseConfig = {
  greenhouses: [
    {
      id: 1,
      customName: 'Serra 1 nord',
      sectors: [
        { id: 1, customName: undefined },
        { id: 2, customName: undefined },
        { id: 3, customName: undefined },
        { id: 6, customName: undefined },
        { id: 5, customName: undefined },
        { id: 4, customName: undefined },
        { id: 7, customName: undefined },
        { id: 8, customName: undefined },
        { id: 9, customName: undefined },
        { id: 12, customName: undefined },
        { id: 11, customName: undefined },
        { id: 10, customName: undefined },
      ],
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
    {
      id: 2,
      customName: 'Serra 2 nord',
      sectors: [
        { id: 13, customName: 'vivaio' },
        { id: 14, customName: 'vivaio' },
        { id: 15, customName: 'vivaio' },
        { id: 18, customName: undefined },
        { id: 17, customName: undefined },
        { id: 16, customName: undefined },
        { id: 19, customName: undefined },
        { id: 20, customName: undefined },
        { id: 21, customName: undefined },
        { id: 24, customName: undefined },
        { id: 23, customName: undefined },
        { id: 22, customName: undefined },
      ],
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
    {
      id: 3,
      customName: 'Serra 3 nord',
      sectors: [
        { id: 25, customName: undefined },
        { id: 26, customName: undefined },
        { id: 27, customName: undefined },
        { id: 30, customName: undefined },
        { id: 29, customName: undefined },
        { id: 28, customName: undefined },
        { id: 31, customName: undefined },
        { id: 32, customName: undefined },
        { id: 33, customName: undefined },
        { id: 36, customName: undefined },
        { id: 35, customName: undefined },
        { id: 34, customName: undefined },
      ],
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
  ],
  hasOpenField: true,
};
