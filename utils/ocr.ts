import * as FileSystem from 'expo-file-system';

interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae testo da immagine usando OCR tramite API esterna
 * (Fallback: ritorna dati vuoti se OCR non disponibile)
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    // Converti l'immagine a base64 per inviarla all'API
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // In una versione production, qui useresti un'API OCR come:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    // Per ora ritorniamo una struttura vuota che l'utente può completare

    // Pattern matching locale semplice per estrazione dati
    const extractedText = await performLocalOCR(base64Image);
    return parseExtractedText(extractedText);
  } catch (error) {
    console.error('OCR extraction error:', error);
    return { confidence: 0 };
  }
}

/**
 * OCR locale semplice (pattern matching)
 * In futuro, sostituire con tesseract.js o API esterna
 */
async function performLocalOCR(base64Image: string): Promise<string> {
  // Placeholder per OCR effettivo
  // Qui andrebbe tesseract.js o una chiamata a API esterna
  return '';
}

/**
 * Parsa il testo estratto per trovare varietà, specie, quantità
 */
function parseExtractedText(text: string): ExtractedPlantData {
  const data: ExtractedPlantData = { confidence: 0 };

  if (!text || text.length === 0) {
    return data;
  }

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

  // Ricerca varietà
  for (const variety of knownVarieties) {
    if (text.toLowerCase().includes(variety.toLowerCase())) {
      data.variety = variety;
      data.confidence += 0.3;
      break;
    }
  }

  // Ricerca "Proteaceae" come specie generica
  if (text.toLowerCase().includes('proteaceae')) {
    data.species = 'Proteaceae';
    data.confidence += 0.2;
  }

  // Ricerca numeri (quantità)
  const numberMatches = text.match(/\d+/g);
  if (numberMatches) {
    const numbers = numberMatches.map(n => parseInt(n, 10));
    // Prendi il numero più grande (solitamente è la quantità)
    const maxNumber = Math.max(...numbers);
    if (maxNumber > 0 && maxNumber < 100000) {
      data.quantity = maxNumber;
      data.confidence += 0.2;
    }
  }

  // Normalizza confidence tra 0 e 1
  data.confidence = Math.min(data.confidence, 1);

  return data;
}
