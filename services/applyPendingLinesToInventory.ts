import { pendingInvoiceStore, PendingInvoiceLine, ItemCategory } from '@/utils/pendingInvoiceStore';
import { storage } from '@/utils/storage';
import { extractVarietyFromDescription } from '@/utils/xmlImportService';
import { inventoryMovements, ItemType } from '@/utils/inventoryMovements';
import { inventoryStore, MaterialRecord } from '@/utils/inventoryStore';

/**
 * Calcola il cycleKey (ciclo colturale) per una pianta.
 * 
 * Regola stagionale:
 * - Le piante arrivano in un intervallo da agosto a marzo/aprile dell'anno successivo
 * - Arrivi da agosto (08) a dicembre (12) → ciclo "anno/anno+1"
 * - Arrivi da gennaio (01) a aprile (04) → ciclo "anno-1/anno"
 * - Arrivi da maggio (05) a luglio (07) → ciclo "anno/anno+1" (stesso anno base)
 * 
 * Esempio: varietà "Leucospermum" arriva il 15/10/2025 → cycleKey = "Leucospermum_2025-26"
 * Esempio: varietà "Protea" arriva il 20/02/2026 → cycleKey = "Protea_2025-26"
 */
export function calculateCycleKey(variety: string, arrivalDate: string): string {
  const date = new Date(arrivalDate);
  const month = date.getMonth() + 1; // getMonth() è 0-indexed
  const year = date.getFullYear();
  
  let cycleStartYear: number;
  
  if (month >= 8 && month <= 12) {
    // Agosto-Dicembre: ciclo anno/anno+1
    cycleStartYear = year;
  } else if (month >= 1 && month <= 4) {
    // Gennaio-Aprile: ciclo anno-1/anno
    cycleStartYear = year - 1;
  } else {
    // Maggio-Luglio: segue l'anno base (stesso comportamento di agosto-dicembre)
    cycleStartYear = year;
  }
  
  const cycleEndYear = cycleStartYear + 1;
  const shortEndYear = String(cycleEndYear).slice(-2);
  
  // Estrae il genere dalla varietà (prima parola)
  const genus = variety.split(' ')[0] || variety;
  
  return `${genus}_${cycleStartYear}-${shortEndYear}`;
}

/**
 * Funzione di servizio UNICA per applicare le righe fattura pendenti all'inventario piante.
 * 
 * FLUSSO B: Pending → Inventario Piante (con cicli colturali)
 * 
 * Questa funzione:
 * 1. Legge le righe non processate dal pendingInvoiceStore
 * 2. Filtra solo le righe di categoria 'piante' o 'semi'
 * 3. Per ogni riga:
 *    - Estrae la varietà dalla descrizione
 *    - Calcola il cycleKey in base alla data di arrivo
 *    - Crea un PlantRecord con storage.savePlantRecord
 *    - Registra il movimento di entrata con inventoryMovements.recordEntry
 *    - Marca la riga come processata
 * 
 * NON devono esistere altre funzioni che scrivono in PlantInventory dalle fatture.
 */
export async function applyPendingLinesToPlantInventory(): Promise<{
  totalLines: number;
  plantLines: number;
  seedLines: number;
  errors: string[];
}> {
  const lines = await pendingInvoiceStore.getUnprocessedLines();
  const plantLines = lines.filter(l => l.assignedCategory === 'piante');
  const seedLines = lines.filter(l => l.assignedCategory === 'semi');
  const errors: string[] = [];

  // Processa piante
  for (const line of plantLines) {
    try {
      await processPlantLine(line, 'pianta');
      await pendingInvoiceStore.markAsProcessed(line.id);
    } catch (error) {
      const msg = `Errore riga pianta "${line.description}": ${error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Processa semi
  for (const line of seedLines) {
    try {
      await processPlantLine(line, 'seme');
      await pendingInvoiceStore.markAsProcessed(line.id);
    } catch (error) {
      const msg = `Errore riga semi "${line.description}": ${error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return {
    totalLines: lines.length,
    plantLines: plantLines.length,
    seedLines: seedLines.length,
    errors,
  };
}

/**
 * Processa una singola riga fattura di pianta o seme.
 * Funzione interna usata da applyPendingLinesToPlantInventory.
 */
async function processPlantLine(line: PendingInvoiceLine, itemType: 'pianta' | 'seme'): Promise<void> {
  const rawVariety = extractVarietyFromDescription(line.description);
  const variety = itemType === 'seme' ? `[Semi] ${rawVariety}` : rawVariety;
  const species = rawVariety.split(' ')[0] || rawVariety;
  const sourceDoc = `FT ${line.invoiceNumber} del ${line.invoiceDate}`;
  const cycleKey = calculateCycleKey(rawVariety, line.invoiceDate);

  console.log(`[DEBUG] Saving plant record:`, {
    variety,
    quantity: line.quantity,
    arrivalDate: line.invoiceDate,
    cycleKey,
  });

  const savedRecord = await storage.savePlantRecord({
    variety,
    species,
    quantity: line.quantity,
    arrivalDate: line.invoiceDate,
    sourceDocument: sourceDoc,
    notes: itemType === 'seme' 
      ? `SEMI. Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR/${line.unitOfMeasure || 'pz'}`
      : `Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR/${line.unitOfMeasure || 'pz'}`,
    cycleKey,
  });

  console.log(`[DEBUG] Plant record saved successfully:`, savedRecord);

  await inventoryMovements.recordEntry(
    itemType,
    rawVariety,
    line.quantity,
    line.invoiceDate,
    sourceDoc,
    `Fornitore: ${line.supplierName}`
  );
}

/**
 * Processa una singola riga fattura di qualsiasi categoria.
 * Questa funzione viene usata dalla UI per confermare singole righe.
 * 
 * IMPORTANTE: Per piante e semi, delega alla logica centralizzata
 * che include il calcolo del cycleKey.
 */
export async function processLineToInventory(line: PendingInvoiceLine): Promise<boolean> {
  const category = line.assignedCategory;
  const sourceDoc = `${line.invoiceNumber} del ${line.invoiceDate}`;
  
  try {
    if (category === 'piante') {
      await processPlantLine(line, 'pianta');
    } else if (category === 'semi') {
      await processPlantLine(line, 'seme');
    } else if (category === 'fitofarmaco' || category === 'fertilizzante') {
      await storage.saveProduct({
        name: line.description,
        activeIngredient: '',
        formulation: line.unitOfMeasure || '',
        registrationNumber: '',
        phiDays: undefined,
        fracCode: '',
        notes: `Importato: ${sourceDoc}. Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR`,
      });
      // Fitofarmaci/fertilizzanti usano 'materiale' come ItemType per i movimenti
      await inventoryMovements.recordEntry(
        'materiale',
        line.description,
        line.quantity,
        line.invoiceDate,
        sourceDoc,
        `Fornitore: ${line.supplierName} (${category})`
      );
    } else if (['vasi', 'terriccio', 'materiale', 'altro'].includes(category)) {
      const materialType = category as 'vasi' | 'terriccio' | 'materiale' | 'altro';
      const newMaterial: Omit<MaterialRecord, 'id' | 'createdAt'> = {
        name: line.description,
        type: materialType,
        quantity: line.quantity,
        unitOfMeasure: line.unitOfMeasure || 'pz',
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        sourceDocument: sourceDoc,
        arrivalDate: line.invoiceDate,
        notes: `Fornitore: ${line.supplierName}`,
      };
      await inventoryStore.saveMaterial(newMaterial);
      
      // Tutti i materiali usano 'materiale' come ItemType per i movimenti
      await inventoryMovements.recordEntry(
        'materiale',
        line.description,
        line.quantity,
        line.invoiceDate,
        sourceDoc,
        `Fornitore: ${line.supplierName}`
      );
    } else if (category === 'utenza') {
      console.log(`[INFO] Riga utenza saltata (non va in inventario): ${line.description}`);
    } else {
      console.warn(`[WARN] Categoria non gestita: ${category} per ${line.description}`);
    }
    return true;
  } catch (error) {
    console.error(`[ERROR] Errore processando riga ${line.id}:`, error);
    return false;
  }
}
