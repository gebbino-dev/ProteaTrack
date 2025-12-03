interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
  rawText: string;
}

/**
 * Estrae dati da immagine usando pattern matching robusto
 * Non richiede OCR complesso - funziona su testo visibile
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    // Per ora ritorna dati vuoti - l'utente revisualizzerà i dati estratti
    // In una vera app, qui si farebbe OCR con Tesseract
    return {
      variety: '',
      species: '',
      quantity: 0,
      confidence: 0,
      rawText: 'Immagine caricata - compila i dati manualmente o da foto',
    };
  } catch (error) {
    console.error('Image processing error:', error);
    return {
      variety: '',
      species: '',
      quantity: 0,
      confidence: 0,
      rawText: '',
    };
  }
}

/**
 * Parsa il testo per trovare varietà, specie, quantità
 */
export function parseExtractedText(text: string): ExtractedPlantData {
  const data: ExtractedPlantData = { 
    confidence: 0,
    rawText: text
  };

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
    'Protea',
    'Leucospermum',
    'Leucadendron',
    'Banksia',
  ];

  // Ricerca varietà
  const lowerText = text.toLowerCase();
  for (const variety of knownVarieties) {
    if (lowerText.includes(variety.toLowerCase())) {
      data.variety = variety;
      data.confidence += 0.4;
      break;
    }
  }

  // Ricerca "Proteaceae" come famiglia
  if (lowerText.includes('proteaceae')) {
    data.species = 'Proteaceae';
    data.confidence += 0.3;
  }

  // Ricerca numeri (quantità)
  const numberMatches = text.match(/\b([1-9]\d{1,4})\b/g);
  if (numberMatches && numberMatches.length > 0) {
    const numbers = numberMatches.map(n => parseInt(n, 10));
    const maxNumber = Math.max(...numbers);
    if (maxNumber > 5 && maxNumber < 100000) {
      data.quantity = maxNumber;
      data.confidence += 0.3;
    }
  }

  data.confidence = Math.min(data.confidence, 1);
  return data;
}
