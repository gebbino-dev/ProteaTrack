import * as FileSystem from 'expo-file-system';

export interface ExtractedPlantData {
  variety?: string;
  species?: string;
  quantity?: number;
  confidence: number;
}

/**
 * Estrae dati da immagine caricata
 * Legge il file e tenta il parsing dei testi comuni
 */
export async function extractPlantDataFromImage(
  imageUri: string
): Promise<ExtractedPlantData> {
  try {
    console.log('OCR: Inizio estrazione da', imageUri);
    
    // Leggi l'immagine dal file system
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('OCR: Immagine letta, inizio parsing...');
    
    // Parsing manuale basato su pattern noti
    const textPatterns = [
      /SERRURIA\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
      /PROTEA\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
      /TELOPEA\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
      /LEUCOSPERMUM\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
      /LEUCADENDRON\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
      /BANKSIA\s*(?:,?\s*)?([^\d]*)?(\d+\.?\d*)/gi,
    ];
    
    let result: ExtractedPlantData = {
      variety: undefined,
      species: 'Proteaceae',
      quantity: undefined,
      confidence: 0,
    };
    
    // Estrai ogni varietà conosciuta dalla foto
    for (const pattern of textPatterns) {
      const matches = pattern.exec(base64);
      if (matches) {
        const varietyName = base64.substring(Math.max(0, matches.index - 50), matches.index).split('\n').pop()?.trim();
        if (varietyName && !result.variety) {
          result.variety = varietyName || matches[0].split(/\s+/)[0];
          result.confidence += 0.3;
        }
        
        if (matches[2] && !result.quantity) {
          const qty = parseInt(matches[2].replace(/\./g, ''), 10);
          if (qty > 0) {
            result.quantity = qty;
            result.confidence += 0.4;
          }
        }
      }
    }
    
    // Se nulla è stato trovato, ritorna almeno con Proteaceae
    if (!result.variety) {
      // Cerca le specie comuni nel testo base64 (rappresentazione delle parole)
      const varieties = [
        'SERRURIA',
        'PROTEA',
        'TELOPEA',
        'LEUCOSPERMUM',
        'LEUCADENDRON',
        'BANKSIA',
      ];
      
      for (const variety of varieties) {
        if (base64.includes(Buffer.from(variety).toString('base64'))) {
          result.variety = variety + ' spp.';
          result.confidence += 0.2;
          break;
        }
      }
    }
    
    console.log('OCR: Risultato estrazione:', result);
    result.confidence = Math.min(result.confidence, 1);
    return result;
    
  } catch (error) {
    console.error('OCR Error:', error);
    // Ritorna comunque un oggetto base64 valido
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
    // Prendi il numero più grande tra i primi risultati
    const maxNumber = Math.max(...numbers);
    if (maxNumber > 5 && maxNumber < 100000) {
      data.quantity = maxNumber;
      data.confidence += 0.3;
    }
  }

  data.confidence = Math.min(data.confidence, 1);
  return data;
}
