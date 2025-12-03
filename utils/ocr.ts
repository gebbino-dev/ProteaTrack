export interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae dati da immagine caricata (semplificato senza Tesseract)
 * L'utente revisualizzerà i dati nella schermata OCR Review
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    // Versione semplificata: ritorna dati vuoti
    // L'utente completerà manualmente o tramite la schermata di revisione
    return {
      variety: undefined,
      species: undefined,
      quantity: undefined,
      confidence: 0,
    };
  } catch (error) {
    console.error('Image processing error:', error);
    return {
      variety: undefined,
      species: undefined,
      quantity: undefined,
      confidence: 0,
    };
  }
}

/**
 * Parsa il testo estratto per trovare varietà, specie, quantità
 */
export function parseExtractedText(text: string): ExtractedPlantData {
  const data: ExtractedPlantData = { confidence: 0 };

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

  const lowerText = text.toLowerCase();
  
  for (const variety of knownVarieties) {
    if (lowerText.includes(variety.toLowerCase())) {
      data.variety = variety;
      data.confidence += 0.4;
      break;
    }
  }

  if (lowerText.includes('proteaceae')) {
    data.species = 'Proteaceae';
    data.confidence += 0.3;
  }

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
