import { Transaction, TransactionType, PlantRecord } from "@/types";

export interface InvoiceLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unitOfMeasure?: string;
  vatRate?: number;
  totalPrice: number;
  itemType?: 'piante' | 'vasi' | 'terriccio' | 'fitofarmaco' | 'fertilizzante' | 'materiale' | 'altro';
}

export interface VatSummary {
  vatRate: number;
  taxableAmount: number;
  vatAmount: number;
  collectability?: string;
}

export interface InvoiceParty {
  denomination: string;
  vatNumber?: string;
  fiscalCode?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
}

export interface ParsedInvoice {
  transaction: Omit<Transaction, 'categoryId'> & { categoryId?: string };
  lineItems: InvoiceLineItem[];
  vatSummaries: VatSummary[];
  supplier?: InvoiceParty;
  customer?: InvoiceParty;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  totalAmount: number;
  totalTaxable: number;
  totalVat: number;
  paymentTerms?: string;
  causale?: string;
}

export type ItemTypeOption = 'piante' | 'vasi' | 'terriccio' | 'fitofarmaco' | 'fertilizzante' | 'materiale' | 'semi' | 'utenza' | 'altro';

export interface InventoryImportItem {
  type: 'plant' | 'material';
  plantRecord?: Partial<PlantRecord>;
  materialType?: string;
  quantity: number;
  unitOfMeasure?: string;
  description: string;
  unitPrice: number;
  sourceDocument: string;
  selected: boolean;
  itemType: ItemTypeOption;
  lineNumber: number;
}

function getTextContent(xml: string, tagName: string): string | null {
  const regexWithNs = new RegExp(`<(?:[a-z0-9]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-z0-9]+:)?${tagName}>`, 'i');
  const match = xml.match(regexWithNs);
  if (match) {
    return match[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '');
  }
  return null;
}

function getAllElements(xml: string, tagName: string): string[] {
  const regexWithNs = new RegExp(`<(?:[a-z0-9]+:)?${tagName}[^>]*>[\\s\\S]*?<\\/(?:[a-z0-9]+:)?${tagName}>`, 'gi');
  const matches = xml.match(regexWithNs);
  return matches || [];
}

function getNestedTextContent(xml: string, ...tags: string[]): string | null {
  let current = xml;
  for (const tag of tags) {
    const content = getTextContent(current, tag);
    if (!content) return null;
    current = content;
  }
  return current;
}

function parseNumber(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function detectItemType(description: string): InvoiceLineItem['itemType'] {
  const desc = description.toLowerCase();
  
  if (desc.includes('pianta') || desc.includes('piante') || 
      desc.includes('leucospermum') || desc.includes('protea') ||
      desc.includes('leucadendron') || desc.includes('banksia') ||
      desc.includes('talea') || desc.includes('talee')) {
    return 'piante';
  }
  
  if (desc.includes('vaso') || desc.includes('vasi') || 
      desc.includes('vassoio') || desc.includes('contenitor') ||
      desc.includes('placca')) {
    return 'vasi';
  }
  
  if (desc.includes('terriccio') || desc.includes('substrato') || 
      desc.includes('torba') || desc.includes('perlite') ||
      desc.includes('floratoscana 2')) {
    return 'terriccio';
  }
  
  if (desc.includes('fitofarmaco') || desc.includes('fungicida') ||
      desc.includes('insetticida') || desc.includes('acaricida') ||
      desc.includes('erbicida') || desc.includes('antiparassitario') ||
      desc.includes('decis') || desc.includes('previter') ||
      desc.includes('affirm') || desc.includes('karate') ||
      desc.includes('roundup') || desc.includes('costar') ||
      desc.includes('katar') || desc.includes('neem') ||
      desc.includes('-clp-')) {
    return 'fitofarmaco';
  }
  
  if (desc.includes('fertilizzante') || desc.includes('concime') ||
      desc.includes('npk') || desc.includes('azoto') ||
      desc.includes('fosforo') || desc.includes('potassio') ||
      desc.includes('solfato') || desc.includes('calcium') ||
      desc.includes('kelpak') || desc.includes('haifastim') ||
      desc.includes('acido solforico')) {
    return 'fertilizzante';
  }
  
  if (desc.includes('contributo') || desc.includes('costi amministrativi') ||
      desc.includes('conai')) {
    return 'altro';
  }
  
  return 'materiale';
}

function parseParty(partyXml: string): InvoiceParty {
  const datiAnagrafici = getTextContent(partyXml, 'DatiAnagrafici') || '';
  const sede = getTextContent(partyXml, 'Sede') || '';
  
  const denominazione = getTextContent(datiAnagrafici, 'Denominazione') ||
    `${getTextContent(datiAnagrafici, 'Nome') || ''} ${getTextContent(datiAnagrafici, 'Cognome') || ''}`.trim();
  
  return {
    denomination: denominazione || 'N/D',
    vatNumber: getNestedTextContent(datiAnagrafici, 'IdFiscaleIVA', 'IdCodice') || undefined,
    fiscalCode: getTextContent(datiAnagrafici, 'CodiceFiscale') || undefined,
    address: getTextContent(sede, 'Indirizzo') || undefined,
    city: getTextContent(sede, 'Comune') || undefined,
    postalCode: getTextContent(sede, 'CAP') || undefined,
    province: getTextContent(sede, 'Provincia') || undefined,
    country: getTextContent(sede, 'Nazione') || undefined,
  };
}

const MY_VAT = "IT01747200473";

const REVENUE_KEYWORDS = [
  'conferimento fiori',
  'acconto conferimento',
  'vendita fiori',
  'vendita piante',
];

function containsRevenueKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  for (const keyword of REVENUE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  if (lowerText.includes('conferimento') && lowerText.includes('fiori')) {
    return true;
  }
  
  return false;
}

function determineTransactionType(tipoDocumento: string, xml: string): TransactionType {
  const fatturaBody = getTextContent(xml, 'FatturaElettronicaBody') || xml;
  const datiGenerali = getTextContent(fatturaBody, 'DatiGenerali') || '';
  const datiGeneraliDocumento = getTextContent(datiGenerali, 'DatiGeneraliDocumento') || '';
  const datiBeniServizi = getTextContent(fatturaBody, 'DatiBeniServizi') || '';
  
  const causale = getTextContent(datiGeneraliDocumento, 'Causale') || '';
  
  const dettaglioLineeElements = getAllElements(datiBeniServizi, 'DettaglioLinee');
  const lineDescriptions = dettaglioLineeElements
    .map(lineXml => getTextContent(lineXml, 'Descrizione') || '')
    .join(' ');
  
  const combinedText = `${causale} ${lineDescriptions}`;
  
  if (containsRevenueKeywords(combinedText)) {
    return 'ricavo';
  }
  
  const cedenteXml = getTextContent(xml, 'CedentePrestatore') || '';
  const cessionarioXml = getTextContent(xml, 'CessionarioCommittente') || '';
  
  const cedenteVat = getNestedTextContent(cedenteXml, 'IdFiscaleIVA', 'IdCodice');
  const cessionarioVat = getNestedTextContent(cessionarioXml, 'IdFiscaleIVA', 'IdCodice');
  
  if (cessionarioVat === MY_VAT) {
    return 'costo';
  }
  
  if (cedenteVat === MY_VAT) {
    return 'ricavo';
  }
  
  return 'costo';
}

function suggestCategory(lineItems: InvoiceLineItem[], transactionType: TransactionType): string {
  if (transactionType === 'ricavo') {
    const hasPlants = lineItems.some(item => item.itemType === 'piante');
    return hasPlants ? 'vendita-piante' : 'vendita-altro';
  }
  
  const itemTypes = lineItems.map(item => item.itemType);
  
  if (itemTypes.includes('fitofarmaco')) return 'fitofarmaci';
  if (itemTypes.includes('fertilizzante')) return 'fertilizzanti';
  if (itemTypes.includes('terriccio') || itemTypes.includes('vasi')) return 'materiali';
  if (itemTypes.includes('piante')) return 'materiali';
  
  return 'altro';
}

export function parseInvoiceXml(xmlString: string): ParsedInvoice {
  const xml = xmlString.replace(/[\r\n\t]+/g, ' ').replace(/>\s+</g, '><');
  
  const fatturaBody = getTextContent(xml, 'FatturaElettronicaBody') || xml;
  const datiGenerali = getTextContent(fatturaBody, 'DatiGenerali') || '';
  const datiGeneraliDocumento = getTextContent(datiGenerali, 'DatiGeneraliDocumento') || '';
  const datiBeniServizi = getTextContent(fatturaBody, 'DatiBeniServizi') || '';
  
  const tipoDocumento = getTextContent(datiGeneraliDocumento, 'TipoDocumento') || 'TD01';
  const numero = getTextContent(datiGeneraliDocumento, 'Numero') || '';
  const data = getTextContent(datiGeneraliDocumento, 'Data') || new Date().toISOString().split('T')[0];
  const causale = getTextContent(datiGeneraliDocumento, 'Causale') || undefined;
  const importoTotaleDocumento = parseNumber(getTextContent(datiGeneraliDocumento, 'ImportoTotaleDocumento'));
  
  const cedenteXml = getTextContent(xml, 'CedentePrestatore') || '';
  const cessionarioXml = getTextContent(xml, 'CessionarioCommittente') || '';
  
  const supplier = cedenteXml ? parseParty(cedenteXml) : undefined;
  const customer = cessionarioXml ? parseParty(cessionarioXml) : undefined;
  
  const dettaglioLineeElements = getAllElements(datiBeniServizi, 'DettaglioLinee');
  const lineItems: InvoiceLineItem[] = dettaglioLineeElements.map(lineXml => {
    const description = getTextContent(lineXml, 'Descrizione') || '';
    const quantity = parseNumber(getTextContent(lineXml, 'Quantita'));
    const unitPrice = parseNumber(getTextContent(lineXml, 'PrezzoUnitario'));
    const totalPrice = parseNumber(getTextContent(lineXml, 'PrezzoTotale'));
    const unitOfMeasure = getTextContent(lineXml, 'UnitaMisura') || undefined;
    const vatRate = parseNumber(getTextContent(lineXml, 'AliquotaIVA'));
    const lineNumber = parseInt(getTextContent(lineXml, 'NumeroLinea') || '0', 10);
    
    return {
      lineNumber,
      description,
      quantity: quantity || 1,
      unitPrice,
      unitOfMeasure,
      vatRate,
      totalPrice: totalPrice || (quantity * unitPrice),
      itemType: detectItemType(description),
    };
  });
  
  const datiRiepilogoElements = getAllElements(datiBeniServizi, 'DatiRiepilogo');
  const vatSummaries: VatSummary[] = datiRiepilogoElements.map(riepilogoXml => ({
    vatRate: parseNumber(getTextContent(riepilogoXml, 'AliquotaIVA')),
    taxableAmount: parseNumber(getTextContent(riepilogoXml, 'ImponibileImporto')),
    vatAmount: parseNumber(getTextContent(riepilogoXml, 'Imposta')),
    collectability: getTextContent(riepilogoXml, 'EsigibilitaIVA') || undefined,
  }));
  
  const totalTaxable = vatSummaries.reduce((sum, v) => sum + v.taxableAmount, 0);
  const totalVat = vatSummaries.reduce((sum, v) => sum + v.vatAmount, 0);
  const totalAmount = importoTotaleDocumento || (totalTaxable + totalVat);
  
  const mainVatRate = vatSummaries.length > 0 
    ? vatSummaries.reduce((max, v) => v.taxableAmount > max.taxableAmount ? v : max, vatSummaries[0]).vatRate
    : 22;
  
  const transactionType = determineTransactionType(tipoDocumento, xml);
  
  const datiPagamento = getTextContent(fatturaBody, 'DatiPagamento') || '';
  const paymentTerms = getTextContent(datiPagamento, 'ModalitaPagamento') || undefined;
  
  const transaction: Omit<Transaction, 'categoryId'> & { categoryId?: string } = {
    id: generateId(),
    type: transactionType,
    categoryId: suggestCategory(lineItems, transactionType),
    amount: totalAmount,
    date: data,
    counterparty: transactionType === 'costo' 
      ? (supplier?.denomination || 'Fornitore') 
      : (customer?.denomination || 'Cliente'),
    description: `Fattura ${numero}${causale ? ` - ${causale.substring(0, 50)}` : ''}`,
    docRef: numero,
    docType: tipoDocumento,
    vatRate: mainVatRate,
    notes: '',
    source: 'import',
    createdAt: new Date().toISOString(),
  };
  
  return {
    transaction,
    lineItems,
    vatSummaries,
    supplier,
    customer,
    documentType: tipoDocumento,
    documentNumber: numero,
    documentDate: data,
    totalAmount,
    totalTaxable,
    totalVat,
    paymentTerms,
    causale,
  };
}

export function extractInventoryItems(
  parsedInvoice: ParsedInvoice
): InventoryImportItem[] {
  const sourceDocument = `FT ${parsedInvoice.documentNumber} del ${parsedInvoice.documentDate}`;
  
  return parsedInvoice.lineItems
    .filter(item => item.quantity > 0)
    .map(item => {
      const detectedType = item.itemType || 'altro';
      const isPlant = detectedType === 'piante';
      
      const inventoryItem: InventoryImportItem = {
        type: isPlant ? 'plant' : 'material',
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        description: item.description,
        unitPrice: item.unitPrice,
        sourceDocument,
        selected: true,
        itemType: detectedType,
        lineNumber: item.lineNumber,
      };
      
      if (isPlant) {
        inventoryItem.plantRecord = {
          id: generateId(),
          variety: extractVarietyFromDescription(item.description),
          quantity: item.quantity,
          arrivalDate: parsedInvoice.documentDate,
          sourceDocument,
          notes: `Prezzo: ${item.unitPrice.toFixed(2)} EUR/pz`,
        };
      } else {
        inventoryItem.materialType = detectedType;
      }
      
      return inventoryItem;
    });
}

function extractVarietyFromDescription(description: string): string {
  const proteaceaeVarieties = [
    'Leucospermum cordifolium',
    'Leucospermum reflexum',
    'Protea cynaroides',
    'Protea magnifica',
    'Protea repens',
    'Protea neriifolia',
    'Leucadendron salignum',
    'Leucadendron laureolum',
    'Banksia coccinea',
    'Banksia prionotes',
  ];
  
  const descLower = description.toLowerCase();
  
  for (const variety of proteaceaeVarieties) {
    if (descLower.includes(variety.toLowerCase())) {
      return variety;
    }
    const parts = variety.split(' ');
    if (parts.length >= 2 && descLower.includes(parts[1].toLowerCase())) {
      return variety;
    }
  }
  
  if (descLower.includes('leucospermum')) return 'Leucospermum cordifolium';
  if (descLower.includes('protea')) return 'Protea cynaroides';
  if (descLower.includes('leucadendron')) return 'Leucadendron salignum';
  if (descLower.includes('banksia')) return 'Banksia coccinea';
  
  return description.substring(0, 50);
}

export function getDocumentTypeDescription(tipoDocumento: string): string {
  const types: Record<string, string> = {
    'TD01': 'Fattura',
    'TD02': 'Acconto/Anticipo su fattura',
    'TD03': 'Acconto/Anticipo su parcella',
    'TD04': 'Nota di credito',
    'TD05': 'Nota di debito',
    'TD06': 'Parcella',
    'TD16': 'Integrazione fattura reverse charge interno',
    'TD17': 'Integrazione/autofattura per acquisto servizi estero',
    'TD18': 'Integrazione per acquisto beni intracomunitari',
    'TD19': 'Integrazione/autofattura per acquisto beni art.17 c.2 DPR 633/72',
    'TD20': 'Autofattura per regolarizzazione e integrazione',
    'TD21': 'Autofattura per splafonamento',
    'TD22': 'Estrazione beni da Deposito IVA',
    'TD23': 'Estrazione beni da Deposito IVA con versamento IVA',
    'TD24': 'Fattura differita (art.21 c.4 lett.a)',
    'TD25': 'Fattura differita (art.21 c.4 terzo periodo lett.b)',
    'TD26': 'Cessione beni ammortizzabili',
    'TD27': 'Fattura per autoconsumo o cessioni gratuite',
  };
  
  return types[tipoDocumento] || tipoDocumento;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
