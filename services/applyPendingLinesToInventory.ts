import { pendingInvoiceStore } from '@/utils/pendingInvoiceStore';
import { storage } from '@/utils/storage';
import { extractVarietyFromDescription } from '@/utils/xmlImportService';
import { inventoryMovements } from '@/utils/inventoryMovements';

export async function applyPendingLinesToPlantInventory() {
  const lines = await pendingInvoiceStore.getUnprocessedLines();
  const plantLines = lines.filter(l => l.assignedCategory === 'piante');

  for (const line of plantLines) {
    const variety = extractVarietyFromDescription(line.description);
    const species = variety.split(' ')[0] || variety;
    const sourceDoc = `FT ${line.invoiceNumber} del ${line.invoiceDate}`;

    await storage.savePlantRecord({
      variety,
      species,
      quantity: line.quantity,
      arrivalDate: line.invoiceDate,
      sourceDocument: sourceDoc,
      notes: `Fornitore: ${line.supplierName}. Prezzo: ${line.unitPrice.toFixed(2)} EUR/${line.unitOfMeasure || 'pz'}`,
    });

    await inventoryMovements.recordEntry(
      'pianta',
      variety,
      line.quantity,
      line.invoiceDate,
      sourceDoc,
      `Fornitore: ${line.supplierName}`
    );

    await pendingInvoiceStore.markAsProcessed(line.id);
  }

  return { totalLines: lines.length, plantLines: plantLines.length };
}
