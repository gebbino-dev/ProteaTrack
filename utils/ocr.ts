import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae dati da immagine caricata
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    console.log('OCR: Inizio estrazione da', imageUri);
    
    // Su web, l'immagine è un blob URL che non può essere letto come file
    // Ritorna vuoto così l'utente compila il form manualmente
    if (Platform.OS === 'web' && imageUri.startsWith('blob:')) {
      console.log('OCR: Blob URL su web, skip OCR');
      return {
        variety: undefined,
        species: undefined,
        quantity: undefined,
        confidence: 0,
      };
    }
    
    // Su Android/iOS, leggi il file
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('OCR: Immagine letta, inizio parsing...');
    
    // Pattern semplice per generi comuni di Proteaceae
    const varieties = ['Serruria', 'Protea', 'Telopea', 'Leucospermum', 'Leucadendron', 'Banksia'];
    
    let result: ExtractedPlantData = {
      variety: undefined,
      species: 'Proteaceae',
      quantity: undefined,
      confidence: 0,
    };
    
    // Tenta di trovare i dati dal testo decodificato
    const textBytes = Buffer.from(base64, 'base64').toString('utf8', 0, Math.min(1000, Buffer.from(base64, 'base64').length));
    
    // Cerca varietà
    for (const variety of varieties) {
      if (textBytes.toLowerCase().includes(variety.toLowerCase())) {
        result.variety = variety;
        result.confidence += 0.3;
        break;
      }
    }
    
    // Cerca numeri grandi che potrebbero essere quantità
    const numberMatches = textBytes.match(/\b([1-9]\d{0,4})\b/g);
    if (numberMatches && numberMatches.length > 0) {
      const numbers = numberMatches.map(n => parseInt(n, 10));
      const maxNumber = Math.max(...numbers);
      if (maxNumber > 5 && maxNumber < 100000) {
        result.quantity = maxNumber;
        result.confidence += 0.3;
      }
    }
    
    console.log('OCR: Risultato estrazione:', result);
    result.confidence = Math.min(result.confidence, 1);
    return result;
    
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      variety: undefined,
      species: 'Proteaceae',
      quantity: undefined,
      confidence: 0,
    };
  }
}

/**
 * Parsa il testo estratto per trovare varietà, specie, quantità
 */
export function parseExtractedText(text: string): ExtractedPlantData {
  const data: ExtractedPlantData = { confidence: 0, species: 'Proteaceae' };

  const knownVarieties = [
    'Serruria',
    'Protea',
    'Telopea',
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

  // Estrai numeri che potrebbero essere quantità
  const numberMatches = text.match(/\b([1-9]\d{0,4})\b/g);
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
