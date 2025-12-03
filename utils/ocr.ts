import * as FileSystem from 'expo-file-system';
import { Tesseract } from 'tesseract.js';

interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae testo da immagine usando Tesseract.js OCR
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    // Leggi immagine come base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Crea data URL per Tesseract
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Esegui OCR con Tesseract.js
    const result = await Tesseract.recognize(dataUrl, 'ita');
    const extractedText = result.data.text;

    if (!extractedText || extractedText.length < 5) {
      return { confidence: 0 };
    }

    return parseExtractedText(extractedText);
  } catch (error) {
    console.error('OCR extraction error:', error);
    return { confidence: 0 };
  }
}

/**
 * Parsa il testo estratto per trovare varietà, specie, quantità
 */
function parseExtractedText(text: string): ExtractedPlantData {
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
  // Cerca il primo numero significativo (almeno 10)
  const numberMatches = text.match(/\b([1-9]\d{1,4})\b/g);
  if (numberMatches && numberMatches.length > 0) {
    const numbers = numberMatches.map(n => parseInt(n, 10));
    const maxNumber = Math.max(...numbers);
    if (maxNumber > 5 && maxNumber < 100000) {
      data.quantity = maxNumber;
      data.confidence += 0.3;
    }
  }

  // Normalizza confidence tra 0 e 1
  data.confidence = Math.min(data.confidence, 1);

  return data;
}
