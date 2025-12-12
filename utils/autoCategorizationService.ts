import { pendingInvoiceStore, PendingInvoiceLine } from './pendingInvoiceStore';

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
  const desc = descrizione.toLowerCase().trim();
  
  if (desc.includes('floratoscana') || 
      desc.includes('flora toscana') || 
      (desc.includes('spese accessorie') && desc.includes('flora'))) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'spese_floratoscana' };
  }
  
  if (desc.includes('energia elettrica') || 
      desc.includes('enel') || 
      desc.includes('kwh') || 
      desc.includes(' elettrica') ||
      desc.includes('corrente elettrica') ||
      desc.includes('fornitura energia') ||
      desc.includes('consumo energia')) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'luce' };
  }
  
  if ((desc.includes('metano') || desc.includes(' gas ') || desc.includes('gpl')) &&
      (desc.includes('fornitura') || desc.includes('consumo') || desc.includes('bolletta') || 
       desc.includes('fattura') || desc.includes('utenza') || desc.includes('contatore'))) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'gas' };
  }
  
  if (desc.includes('cia') || 
      desc.includes('confederazione italiana agricoltori') ||
      desc.includes('coldiretti') ||
      desc.includes('confagricoltura')) {
    return { categoria: 'utenze', sottoCategoriaUtenza: 'spese_cia' };
  }
  
  if (desc.includes('protea') || 
      desc.includes('leucospermum') || 
      desc.includes('serruria') || 
      desc.includes('telopea') ||
      desc.includes('leucadendron') ||
      desc.includes('banksia') ||
      desc.includes('grevillea') ||
      desc.includes('pianta') || 
      desc.includes('piante') || 
      desc.includes('piantina') ||
      desc.includes('piantine') ||
      desc.includes('talea') ||
      desc.includes('talee')) {
    return { categoria: 'piante', sottoCategoriaUtenza: '' };
  }
  
  if (desc.includes('seme') || 
      desc.includes('semi') || 
      desc.includes('seeds') ||
      desc.includes('sementi')) {
    return { categoria: 'semi', sottoCategoriaUtenza: '' };
  }
  
  if (desc.includes('terriccio') || 
      desc.includes('substrato') || 
      desc.includes('torba') ||
      desc.includes('perlite') ||
      desc.includes('vermiculite') ||
      desc.includes('fibra di cocco') ||
      desc.includes('bark')) {
    return { categoria: 'terriccio', sottoCategoriaUtenza: '' };
  }
  
  if (desc.includes('vaso') || 
      desc.includes('vasi') || 
      desc.includes('contenitore') ||
      desc.includes('contenitori') ||
      desc.includes('plateau') ||
      desc.includes('alveolare') ||
      desc.includes('alveoli') ||
      desc.includes('vassoio') ||
      desc.includes('placca') ||
      desc.includes('placche')) {
    return { categoria: 'vasi', sottoCategoriaUtenza: '' };
  }
  
  const hasFitofarmaco = 
    desc.includes('fitofarmaco') || 
    desc.includes('agrofarmaco') || 
    desc.includes('fungicida') || 
    desc.includes('insetticida') ||
    desc.includes('acaricida') ||
    desc.includes('erbicida') ||
    desc.includes('antiparassitario') ||
    desc.includes('nematocida') ||
    desc.includes('molluschicida') ||
    desc.includes('rodenticida') ||
    desc.includes('-clp-') ||
    FITOFARMACI_COMMERCIALI.some(nome => desc.includes(nome));
  
  if (hasFitofarmaco) {
    return { categoria: 'fitofarmaci', sottoCategoriaUtenza: '' };
  }
  
  if (desc.includes('concime') || 
      desc.includes('fertilizzante') || 
      desc.includes('npk') ||
      desc.includes('stallatico') ||
      desc.includes('azoto') ||
      desc.includes('fosforo') ||
      desc.includes('potassio') ||
      desc.includes('solfato') ||
      desc.includes('urea') ||
      desc.includes('nitrato') ||
      desc.includes('ammonio') ||
      desc.includes('microelementi') ||
      desc.includes('chelato') ||
      desc.includes('biostimolante') ||
      desc.includes('kelpak') ||
      desc.includes('haifastim') ||
      desc.includes('alga') ||
      desc.includes('alghe')) {
    return { categoria: 'fertilizzanti', sottoCategoriaUtenza: '' };
  }
  
  if (desc.includes('gasolio') || 
      desc.includes('gasoil') || 
      desc.includes('gasolio agricolo') ||
      desc.includes('gpl') ||
      desc.includes('pellet') ||
      desc.includes('legna') ||
      desc.includes('combustibile') ||
      desc.includes('carburante') ||
      desc.includes('benzina') ||
      desc.includes('nafta')) {
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
    
    await pendingInvoiceStore.updateLine(line.id, {
      categoria: result.categoria,
      sottoCategoriaUtenza: result.sottoCategoriaUtenza,
    } as Partial<PendingInvoiceLine>);
    
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
