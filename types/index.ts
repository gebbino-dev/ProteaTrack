export type ActivityType = 'innaffiatura' | 'concimazione' | 'potatura' | 'trattamento' | 'altro';

export interface Activity {
  id: string;
  type: ActivityType;
  greenhouse: number;
  sector: number;
  bench: string;
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

export const GREENHOUSES = [1, 2, 3] as const;

export const SECTORS_PER_GREENHOUSE: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
};

export const BENCHES = ['B1', 'B2', 'B3', 'B4', 'B5'] as const;

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
