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
      customName: 'Serra 1',
      sectors: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, customName: undefined })),
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
    {
      id: 2,
      customName: 'Serra 2',
      sectors: Array.from({ length: 12 }, (_, i) => ({ id: i + 13, customName: undefined })),
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
    {
      id: 3,
      customName: 'Serra 3',
      sectors: Array.from({ length: 12 }, (_, i) => ({ id: i + 25, customName: undefined })),
      benchCount: 5,
      benchNames: ['B1', 'B2', 'B3', 'B4', 'B5'],
    },
  ],
  hasOpenField: false,
};
