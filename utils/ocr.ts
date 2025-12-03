interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae testo da immagine usando pattern matching locale
 * Ricerca varietà conosciute e numeri nel documento
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    // Simula estrazione dati da immagine
    // In futuro, implementare OCR vero con Tesseract.js
    
    // Per ora usa pattern matching semplice
    // che l'utente può completare manualmente
    return extractFromSimplePatterns(imageUri);
  } catch (error) {
    console.error('OCR extraction error:', error);
    return { confidence: 0 };
  }
}

/**
 * Usa pattern matching semplice
 */
function extractFromSimplePatterns(imageUri: string): ExtractedPlantData {
  const data: ExtractedPlantData = { confidence: 0 };

  // Carica liste di varietà conosciute per pattern matching
  const knownVarieties = [
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

  // Simula estrazione semplice
  // L'utente dovrà principalmente compilare il form manualmente
  data.confidence = 0;

  return data;
}

