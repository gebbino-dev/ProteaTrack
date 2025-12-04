# SerraManager - Gestione Serre Proteaceae

## Panoramica
SerraManager è un'app mobile per la gestione di serre dedicate alla coltivazione di piante Proteaceae in vaso. L'app permette di tracciare le attività quotidiane (innaffiatura, concimazione, potatura, trattamenti) associandole a specifici bancali e settori delle serre.

## Funzionalità Principali

### Dashboard
- Statistiche rapide: totale piante, attività odierne, bancali attivi
- Lista delle attività recenti
- FAB (Floating Action Button) per registrazione rapida attività

### Gestione Serre
- Visualizzazione delle 3 serre con conteggio piante e settori
- Navigazione: Serra → Settori per Arcata → Dettaglio Bancale
- Ogni bancale mostra: numero piante, varietà, data impianto, note, storico attività

### Gestione Contabile (Gestionale)
- **Dashboard Finanziaria**: riepilogo entrate/uscite con grafico mensile
- **Registrazione Movimenti**: entrate e uscite con categoria, importo, data, note
- **Categorie Predefinite**: 
  - Costi: Acquisto Piante, Materiali, Manodopera, Fitofarmaci, Energia
  - Ricavi: Vendita Piante, Servizi
- **Esportazione CSV**: export dei movimenti per mese o anno completo
- **Filtri**: per tipo (entrate/uscite) e per mese

### Quaderno di Campagna
- **Registro Trattamenti**: data, prodotto, dose, coltura, settore/bancale
- **Storico Completo**: lista ordinata per data con filtri
- **Esportazione CSV**: export per compliance normativa
- **Integrazione**: collegamento con attività serra esistenti

### Inventario Piante
- **Scansione DDT**: OCR per acquisizione automatica da documenti (solo web)
- **Inserimento Manuale**: varietà, quantità, data arrivo
- **Esportazione**: export inventario in CSV

### Profilo/Impostazioni
- Informazioni azienda (nome responsabile, nome azienda, località)
- Statistiche generali
- Gestione dati (cancellazione dati)

## Struttura delle Serre
L'app gestisce 3 serre da 2000 m² ciascuna, organizzate come segue:
- **Serra 1**: Settori 1-12 (3 Arcate x 4 Settori)
- **Serra 2**: Settori 13-24 (3 Arcate x 4 Settori)
- **Serra 3**: Settori 25-36 (3 Arcate x 4 Settori)

Ogni settore contiene 5 bancali numerati: B1, B2, B3, B4, B5

## Architettura Tecnica

### Stack
- **Framework**: React Native con Expo SDK 54
- **Navigazione**: React Navigation 7 (Bottom Tabs + Stack Navigators)
- **Persistenza**: AsyncStorage per dati locali
- **OCR**: Tesseract.js (solo web)
- **UI**: Design iOS Liquid Glass con tema botanico professionale

### Struttura File
```
/screens
  - DashboardScreen.tsx           # Schermata principale
  - GreenhouseListScreen.tsx      # Lista serre
  - SectorListScreen.tsx          # Settori per arcata
  - BenchDetailScreen.tsx         # Dettaglio bancale
  - RecordActivityScreen.tsx      # Form registrazione attività
  - EditBenchScreen.tsx           # Modifica dati bancale
  - ProfileScreen.tsx             # Impostazioni
  - ActivityDetailScreen.tsx      # Dettaglio attività
  - PlantInventoryScreen.tsx      # Inventario piante
  - DocumentScanScreen.tsx        # Scansione DDT con OCR
  - FinancialDashboardScreen.tsx  # Dashboard contabile
  - TransactionListScreen.tsx     # Lista movimenti
  - TransactionEditScreen.tsx     # Aggiungi/modifica movimento
  - TreatmentListScreen.tsx       # Lista trattamenti
  - TreatmentEditScreen.tsx       # Aggiungi/modifica trattamento

/navigation
  - MainTabNavigator.tsx          # Tab bar principale (5 tab)
  - DashboardStackNavigator.tsx   # Stack dashboard
  - GreenhouseStackNavigator.tsx  # Stack serre
  - AccountingStackNavigator.tsx  # Stack gestionale contabile
  - NotebookStackNavigator.tsx    # Stack quaderno campagna
  - ProfileStackNavigator.tsx     # Stack profilo

/components
  - StatCard.tsx      # Card statistiche
  - ActivityCard.tsx  # Card attività
  - Button.tsx        # Pulsante animato
  - Card.tsx          # Card con elevazione (supporta children)
  - HeaderTitle.tsx   # Titolo header con logo

/utils
  - storage.ts        # Funzioni AsyncStorage (CRUD per tutti i tipi)

/types
  - index.ts          # Tipi TypeScript
```

### Tipi Dati Principali
```typescript
Activity {
  id, type, greenhouse, sector, bench, date, notes, createdAt
}

Bench {
  id, greenhouse, sector, benchNumber, plantCount, variety, plantingDate, notes
}

Transaction {
  id, type ('income'|'expense'), categoryId, amount, date, description, notes, 
  source, docRef, createdAt
}

Category {
  id, name, type ('income'|'expense'), isDefault
}

Treatment {
  id, date, productName, dose, unit, crop, greenhouse, sector, bench,
  notes, weatherConditions, operator, externalId, createdAt
}

PlantRecord {
  id, variety, species, quantity, arrivalDate, notes, createdAt
}

UserSettings {
  name, companyName, location
}
```

### Colori Attività
- Innaffiatura: Blu (#2196F3)
- Concimazione: Marrone (#8B4513)
- Potatura: Arancione (#FF9800)
- Trattamento: Viola (#9C27B0)
- Altro: Grigio (#607D8B)

### Colori Contabilità
- Entrate: Verde (#4CAF50)
- Uscite: Rosso (#F44336)

## Varietà Proteaceae Supportate
- Leucospermum cordifolium
- Protea cynaroides
- Leucadendron salignum
- Banksia coccinea
- Protea magnifica
- Leucospermum reflexum
- Protea repens
- Leucadendron laureolum
- Banksia prionotes
- Protea neriifolia

## Comandi Sviluppo
```bash
npm run dev    # Avvia server Expo
```

## Note Tecniche
- App ottimizzata per uso mobile con touch targets grandi (48x48pt min)
- Supporto offline completo con dati locali
- UI ad alto contrasto per uso in condizioni di luce intensa (serra)
- Lingua interfaccia: Italiano
- OCR (Tesseract.js) funziona solo su piattaforma web
- Expo FileSystem usa nuova API: `Paths`, `File as ExpoFile` per export CSV
- Card component supporta prop `children` per contenuto flessibile
