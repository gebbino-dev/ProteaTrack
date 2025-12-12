import { pendingInvoiceStore, PendingInvoiceLine, ItemCategory } from './pendingInvoiceStore';

export type CategoriaRiga = 
  | 'utenze'
  | 'piante'
  | 'semi'
  | 'terriccio'
  | 'vasi'
  | 'fitofarmaci'
  | 'fertilizzanti'
  | 'combustibile'
  | 'materiale_generico';

// Mappa CategoriaRiga -> ItemCategory per compatibilita con pendingInvoiceStore
const CATEGORIA_TO_ITEM_CATEGORY: Record<CategoriaRiga, ItemCategory> = {
  'utenze': 'utenza',
  'piante': 'piante',
  'semi': 'semi',
  'terriccio': 'terriccio',
  'vasi': 'vasi',
  'fitofarmaci': 'fitofarmaco',
  'fertilizzanti': 'fertilizzante',
  'combustibile': 'altro',
  'materiale_generico': 'materiale',
};

export type SottoCategoriaUtenza = 
  | 'spese_floratoscana'
  | 'luce'
  | 'gas'
  | 'spese_cia'
  | '';

export interface CategorizzazioneResult {
  categoria: CategoriaRiga;
  sottoCategoriaUtenza: SottoCategoriaUtenza;
}

export interface ClassificazioneStats {
  totaleRighe: number;
  righeClassificate: number;
  perCategoria: Record<CategoriaRiga, number>;
  perSottocategoriaUtenza: Record<SottoCategoriaUtenza, number>;
}

export const CATEGORIA_CONFIG: Record<CategoriaRiga, { label: string; icon: string; color: string }> = {
  utenze: { label: 'Utenze', icon: 'zap', color: '#2196F3' },
  piante: { label: 'Piante', icon: 'feather', color: '#4CAF50' },
  semi: { label: 'Semi', icon: 'sun', color: '#FFC107' },
  terriccio: { label: 'Terriccio', icon: 'layers', color: '#8B4513' },
  vasi: { label: 'Vasi', icon: 'box', color: '#795548' },
  fitofarmaci: { label: 'Fitofarmaci', icon: 'shield', color: '#9C27B0' },
  fertilizzanti: { label: 'Fertilizzanti', icon: 'droplet', color: '#FF9800' },
  combustibile: { label: 'Combustibile', icon: 'flame', color: '#F44336' },
  materiale_generico: { label: 'Materiale Generico', icon: 'package', color: '#607D8B' },
};

export const SOTTOCATEGORIA_UTENZA_CONFIG: Record<string, { label: string; color: string }> = {
  'spese_floratoscana': { label: 'Spese Flora Toscana', color: '#4CAF50' },
  'luce': { label: 'Energia Elettrica', color: '#FFEB3B' },
  'gas': { label: 'Gas/Metano', color: '#FF5722' },
  'spese_cia': { label: 'Spese CIA', color: '#3F51B5' },
  '': { label: 'Non specificata', color: '#9E9E9E' },
};

const FITOFARMACI_COMMERCIALI = [
  'decis', 'previter', 'affirm', 'karate', 'roundup', 'costar', 'katar', 
  'neem', 'confidor', 'actara', 'movento', 'sivanto', 'teppeki', 'closer',
  'epik', 'laser', 'success', 'spintor', 'spinetoram', 'switch', 'score',
  'topas', 'folicur', 'tilt', 'amistar', 'ortiva', 'signum', 'luna',
  'serenade', 'bion', 'aliette', 'ridomil', 'previcur', 'propamocarb',
  'metalaxyl', 'mancozeb', 'metiram', 'rame', 'poltiglia', 'zolfo',
  'pomarsol', 'dithane', 'ziram', 'thiram', 'captan', 'folpet',
  'chlorpyrifos', 'piretro', 'piretrina', 'abamectina', 'emamectina',
  'bacillus', 'trichoderma', 'beauveria', 'metarhizium',
];

export function classificaRiga(descrizione: string): CategorizzazioneResult {
  const d = descrizione.toLowerCase().trim();
  
  // Regole specifiche spese utenza Floratoscana (PRIORITA MASSIMA - prima di tutto)
  const utenzeFloratoscanaKeywords = [
    'progetto sviluppo soci',
    'fondo sviluppo soci',
    'detrazione costo conferimento fiori',
    'detrazione costo di servizio conf.fiori',
    'costi amministrativi',
    'sfuso_2',
  ];
  
  if (utenzeFloratoscanaKeywords.some(k => d.includes(k))) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'spese_floratoscana' };
  }
  
  // Altre regole Flora Toscana generiche
  if (d.includes('floratoscana') || 
      d.includes('flora toscana') || 
      (d.includes('spese accessorie') && d.includes('flora'))) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'spese_floratoscana' };
  }
  
  if (d.includes('energia elettrica') || 
      d.includes('enel') || 
      d.includes('kwh') || 
      d.includes(' elettrica') ||
      d.includes('corrente elettrica') ||
      d.includes('fornitura energia') ||
      d.includes('consumo energia')) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'luce' };
  }
  
  if ((d.includes('metano') || d.includes(' gas ') || d.includes('gpl')) &&
      (d.includes('fornitura') || d.includes('consumo') || d.includes('bolletta') || 
       d.includes('fattura') || d.includes('utenza') || d.includes('contatore'))) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'gas' };
  }
  
  if (d.includes('cia') || 
      d.includes('confederazione italiana agricoltori') ||
      d.includes('coldiretti') ||
      d.includes('confagricoltura')) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'spese_cia' };
  }
  
  if (d.includes('protea') || 
      d.includes('leucospermum') || 
      d.includes('serruria') || 
      d.includes('telopea') ||
      d.includes('leucadendron') ||
      d.includes('banksia') ||
      d.includes('grevillea') ||
      d.includes('pianta') || 
      d.includes('piante') || 
      d.includes('piantina') ||
      d.includes('piantine') ||
      d.includes('talea') ||
      d.includes('talee')) {
    return { categoria: 'piante', sottoCategoriaUtenza: '' };
  }
  
  if (d.includes('seme') || 
      d.includes('semi') || 
      d.includes('seeds') ||
      d.includes('sementi')) {
    return { categoria: 'semi', sottoCategoriaUtenza: '' };
  }
  
  if (d.includes('terriccio') || 
      d.includes('substrato') || 
      d.includes('torba') ||
      d.includes('perlite') ||
      d.includes('vermiculite') ||
      d.includes('fibra di cocco') ||
      d.includes('bark')) {
    return { categoria: 'terriccio', sottoCategoriaUtenza: '' };
  }
  
  if (d.includes('vaso') || 
      d.includes('vasi') || 
      d.includes('contenitore') ||
      d.includes('contenitori') ||
      d.includes('plateau') ||
      d.includes('alveolare') ||
      d.includes('alveoli') ||
      d.includes('vassoio') ||
      d.includes('placca') ||
      d.includes('placche')) {
    return { categoria: 'vasi', sottoCategoriaUtenza: '' };
  }
  
  const hasFitofarmaco = 
    d.includes('fitofarmaco') || 
    d.includes('agrofarmaco') || 
    d.includes('fungicida') || 
    d.includes('insetticida') ||
    d.includes('acaricida') ||
    d.includes('erbicida') ||
    d.includes('antiparassitario') ||
    d.includes('nematocida') ||
    d.includes('molluschicida') ||
    d.includes('rodenticida') ||
    d.includes('-clp-') ||
    FITOFARMACI_COMMERCIALI.some(nome => d.includes(nome));
  
  if (hasFitofarmaco) {
    return { categoria: 'fitofarmaci', sottoCategoriaUtenza: '' };
  }
  
  if (d.includes('concime') || 
      d.includes('fertilizzante') || 
      d.includes('npk') ||
      d.includes('stallatico') ||
      d.includes('azoto') ||
      d.includes('fosforo') ||
      d.includes('potassio') ||
      d.includes('solfato') ||
      d.includes('urea') ||
      d.includes('nitrato') ||
      d.includes('ammonio') ||
      d.includes('microelementi') ||
      d.includes('chelato') ||
      d.includes('biostimolante') ||
      d.includes('kelpak') ||
      d.includes('haifastim') ||
      d.includes('alga') ||
      d.includes('alghe')) {
    return { categoria: 'fertilizzanti', sottoCategoriaUtenza: '' };
  }
  
  if (d.includes('gasolio') || 
      d.includes('gasoil') || 
      d.includes('gasolio agricolo') ||
      d.includes('gpl') ||
      d.includes('pellet') ||
      d.includes('legna') ||
      d.includes('combustibile') ||
      d.includes('carburante') ||
      d.includes('benzina') ||
      d.includes('nafta')) {
    return { categoria: 'combustibile', sottoCategoriaUtenza: '' };
  }
  
  return { categoria: 'materiale_generico', sottoCategoriaUtenza: '' };
}

export async function classificaTutteLeRighe(): Promise<ClassificazioneStats> {
  const lines = await pendingInvoiceStore.getPendingLines();
  
  const stats: ClassificazioneStats = {
    totaleRighe: lines.length,
    righeClassificate: 0,
    perCategoria: {
      utenze: 0,
      piante: 0,
      semi: 0,
      terriccio: 0,
      vasi: 0,
      fitofarmaci: 0,
      fertilizzanti: 0,
      combustibile: 0,
      materiale_generico: 0,
    },
    perSottocategoriaUtenza: {
      'spese_floratoscana': 0,
      'luce': 0,
      'gas': 0,
      'spese_cia': 0,
      '': 0,
    },
  };
  
  for (const line of lines) {
    const result = classificaRiga(line.description);
    
    // Mappa alla categoria corretta per pendingInvoiceStore
    const itemCategory = CATEGORIA_TO_ITEM_CATEGORY[result.categoria];
    
    // Aggiorna TUTTI i campi categoria per compatibilita con entrambe le schermate
    await pendingInvoiceStore.updateLine(line.id, {
      assignedCategory: itemCategory,
      detectedCategory: itemCategory,
      categoria: result.categoria,
      sottoCategoriaUtenza: result.sottoCategoriaUtenza,
    });
    
    stats.righeClassificate++;
    stats.perCategoria[result.categoria]++;
    stats.perSottocategoriaUtenza[result.sottoCategoriaUtenza]++;
  }
  
  return stats;
}

export async function getLinesByCategoria(categoria: CategoriaRiga): Promise<PendingInvoiceLine[]> {
  const lines = await pendingInvoiceStore.getPendingLines();
  return lines.filter(l => (l as any).categoria === categoria);
}

export async function getLinesBySottoCategoriaUtenza(sottocategoria: SottoCategoriaUtenza): Promise<PendingInvoiceLine[]> {
  const lines = await pendingInvoiceStore.getPendingLines();
  return lines.filter(l => (l as any).sottoCategoriaUtenza === sottocategoria);
}

export async function getUtenzeLines(): Promise<PendingInvoiceLine[]> {
  return getLinesByCategoria('utenze');
}

export async function getCategoriaStats(): Promise<{ categoria: CategoriaRiga; count: number; total: number }[]> {
  const lines = await pendingInvoiceStore.getPendingLines();
  
  const stats: Record<CategoriaRiga, { count: number; total: number }> = {
    utenze: { count: 0, total: 0 },
    piante: { count: 0, total: 0 },
    semi: { count: 0, total: 0 },
    terriccio: { count: 0, total: 0 },
    vasi: { count: 0, total: 0 },
    fitofarmaci: { count: 0, total: 0 },
    fertilizzanti: { count: 0, total: 0 },
    combustibile: { count: 0, total: 0 },
    materiale_generico: { count: 0, total: 0 },
  };
  
  for (const line of lines) {
    const cat = (line as any).categoria as CategoriaRiga || 'materiale_generico';
    stats[cat].count++;
    stats[cat].total += line.totalPrice;
  }
  
  return Object.entries(stats)
    .map(([categoria, data]) => ({
      categoria: categoria as CategoriaRiga,
      ...data,
    }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.total - a.total);
}

export async function getSottocategoriaUtenzaStats(): Promise<{ sottocategoria: SottoCategoriaUtenza; count: number; total: number }[]> {
  const utenzeLines = await getLinesByCategoria('utenze');
  
  const stats: Record<SottoCategoriaUtenza, { count: number; total: number }> = {
    'spese_floratoscana': { count: 0, total: 0 },
    'luce': { count: 0, total: 0 },
    'gas': { count: 0, total: 0 },
    'spese_cia': { count: 0, total: 0 },
    '': { count: 0, total: 0 },
  };
  
  for (const line of utenzeLines) {
    const sub = (line as any).sottoCategoriaUtenza as SottoCategoriaUtenza || '';
    stats[sub].count++;
    stats[sub].total += line.totalPrice;
  }
  
  return Object.entries(stats)
    .map(([sottocategoria, data]) => ({
      sottocategoria: sottocategoria as SottoCategoriaUtenza,
      ...data,
    }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.total - a.total);
}
