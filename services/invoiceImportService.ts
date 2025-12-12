import { parseInvoiceXml, ParsedInvoice } from '../utils/xmlImportService';
import { pendingInvoiceStore, ItemCategory } from '../utils/pendingInvoiceStore';
import { classificaRiga } from '../utils/autoCategorizationService';

export async function importInvoiceToPending(xmlString: string): Promise<{ 
  parsed: ParsedInvoice; 
  linesImported: number;
}> {
  const parsed = parseInvoiceXml(xmlString);

  const pendingLinesInput = parsed.lineItems.map(line => {
    const categ = classificaRiga(line.description);

    const detectedCategory: ItemCategory =
      (line.itemType as ItemCategory) || 'altro';

    return {
      invoiceNumber: parsed.documentNumber,
      invoiceDate: parsed.documentDate,
      supplierName: parsed.supplier?.denomination || 'Fornitore',
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      totalPrice: line.totalPrice,
      unitOfMeasure: line.unitOfMeasure,
      vatRate: line.vatRate,
      detectedCategory,
      assignedCategory: detectedCategory,
      categoria: categ.categoria,
      sottoCategoriaUtenza: categ.sottoCategoriaUtenza,
      isProcessed: false,
      processedAt: undefined,
    };
  });

  await pendingInvoiceStore.savePendingLines(pendingLinesInput);

  return {
    parsed,
    linesImported: pendingLinesInput.length,
  };
}
