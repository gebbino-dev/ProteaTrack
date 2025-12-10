# ProteaTrack - Gestione Serre Proteaceae

## Panoramica
ProteaTrack è un'app mobile per la gestione di serre dedicate alla coltivazione di piante Proteaceae in vaso. L'app permette di tracciare le attività quotidiane, i trattamenti fitosanitari, la contabilità e di generare report analitici.

## Architettura a 6 Moduli

L'app è organizzata in 6 moduli principali accessibili tramite bottom tab navigation:

### 1. Dashboard (Home)
- Statistiche rapide: totale piante, attività odierne, bancali attivi
- Lista delle attività recenti
- FAB per registrazione rapida attività

### 2. Colture (Gestione Serre e Piante)
- Visualizzazione delle 3 serre con conteggio piante e settori
- Navigazione: Serra → Settori per Arcata → Dettaglio Bancale
- Ogni bancale mostra: numero piante, varietà, data impianto, note
- Inventario piante con scansione DDT (OCR solo web)
- Usa tipi: `Greenhouse`, `Sector`, `Bench`, `PlantRecord`, `GreenhouseConfig`

### 3. Lavoro (Attività Giornaliere)
- Registrazione attività: innaffiatura, concimazione, potatura, trattamento, altro
- Lista attività con filtri per tipo
- Storico completo con dettagli
- Usa tipo: `Activity`

### 4. Quaderno (Quaderno di Campagna)
- Registro trattamenti fitosanitari per compliance normativa
- Data, prodotto, dose (g/hl), acqua (L), ubicazione, avversità
- Selezione multipla settori con "Seleziona Tutti"
- Esportazione CSV per documentazione
- Usa tipi: `PhytosanitaryProduct`, `Treatment`

### 5. Contabilità (Gestionale Contabile)
- Dashboard finanziaria: riepilogo entrate/uscite
- Registrazione movimenti con categorie predefinite
- Categorie costi: Materiali, Manodopera, Fitofarmaci, Fertilizzanti, etc.
- Categorie ricavi: Vendita Piante, Vendita Fiori, Servizi, Contributi
- Esportazione CSV per periodo
- Usa tipi: `TransactionCategory`, `Transaction`, `FinancialSummary`

### 6. Report (Analisi e Statistiche)
- Selezione periodo (anno/mese)
- Riepilogo finanziario con margine
- Statistiche serre (piante, settori attivi)
- Breakdown attività per tipo
- Breakdown trattamenti per prodotto
- Usa tipi: `FinancialSummary`, `GreenhouseStats`

## Struttura delle Serre
L'app gestisce 3 serre da 2000 m² ciascuna:
- **Serra 1 nord**: Settori 1-12 (3 Arcate x 4 Settori)
- **Serra 2 nord**: Settori 13-24 (3 Arcate x 4 Settori) - include vivaio
- **Serra 3 nord**: Settori 25-36 (3 Arcate x 4 Settori)

Ogni settore contiene 5 bancali: B1, B2, B3, B4, B5

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
  # Dashboard
  - DashboardScreen.tsx           # Schermata principale con statistiche

  # Colture
  - GreenhouseListScreen.tsx      # Lista serre
  - SectorListScreen.tsx          # Settori per arcata
  - BenchDetailScreen.tsx         # Dettaglio bancale
  - EditBenchScreen.tsx           # Modifica dati bancale
  - PlantInventoryScreen.tsx      # Inventario piante
  - DocumentScanScreen.tsx        # Scansione DDT con OCR
  - ConfigureGreenhouseScreen.tsx # Configurazione serre

  # Lavoro
  - LavoroScreen.tsx              # Lista attività con filtri
  - RecordActivityScreen.tsx      # Form registrazione attività
  - ActivityDetailScreen.tsx      # Dettaglio attività
  - EditActivityScreen.tsx        # Modifica attività

  # Quaderno
  - TreatmentListScreen.tsx       # Lista trattamenti
  - TreatmentEditScreen.tsx       # Form registrazione trattamento

  # Contabilità
  - FinancialDashboardScreen.tsx  # Dashboard finanziaria
  - TransactionListScreen.tsx     # Lista movimenti
  - TransactionEditScreen.tsx     # Form registrazione movimento

  # Report
  - ReportScreen.tsx              # Analisi per periodo

  # Altro
  - ProfileScreen.tsx             # Impostazioni azienda
  - CalendarScreen.tsx            # Vista calendario

/navigation
  - MainTabNavigator.tsx          # Tab bar principale (6 tab)
  - DashboardStackNavigator.tsx   # Stack dashboard
  - GreenhouseStackNavigator.tsx  # Stack colture
  - LavoroStackNavigator.tsx      # Stack lavoro
  - NotebookStackNavigator.tsx    # Stack quaderno
  - AccountingStackNavigator.tsx  # Stack contabilità
  - ReportStackNavigator.tsx      # Stack report
  - ProfileStackNavigator.tsx     # Stack profilo

/components
  - StatCard.tsx      # Card statistiche
  - ActivityCard.tsx  # Card attività
  - Button.tsx        # Pulsante animato
  - Card.tsx          # Card con elevazione
  - HeaderTitle.tsx   # Titolo header con logo

/utils
  - storage.ts        # Funzioni AsyncStorage (CRUD per tutti i tipi)

/types
  - index.ts          # FONTE UNICA per tipi e costanti (NON MODIFICARE)
```

### Tipi Dati (da types/index.ts - NON MODIFICARE)
```typescript
// Attività
Activity { id, type, greenhouse, sector, bench, locationType, customLocation, date, notes, createdAt }
ActivityType = 'innaffiatura' | 'concimazione' | 'potatura' | 'trattamento' | 'altro'

// Colture
Bench { id, greenhouse, sector, benchNumber, plantCount, variety, plantingDate, notes, placche }
Greenhouse { id, customName, sectors, benchCount, benchNames }
Sector { id, customName }
GreenhouseConfig { greenhouses, hasOpenField }
PlantRecord { id, variety, species, quantity, arrivalDate, sourceDocument, notes }

// Contabilità
Transaction { id, type, categoryId, amount, date, counterparty, description, docRef, docType, vatRate, notes, source, createdAt }
TransactionCategory { id, name, type, icon, color }
TransactionType = 'ricavo' | 'costo'
FinancialSummary { period, income, expenses, margin, byCategory }

// Quaderno di Campagna
Treatment { id, greenhouse, sector, bench, locationType, customLocation, productId, productName, dosePerHl, waterLiters, areaM2, targetPest, date, weatherConditions, notes, linkedActivityId, externalId, createdAt }
PhytosanitaryProduct { id, name, activeIngredient, formulation, registrationNumber, phiDays, fracCode, notes }
LocationType = 'serra' | 'campo_aperto'

// Report
GreenhouseStats { totalPlants, activeSectors, todayActivities }

// Costanti disponibili in index.ts
ACTIVITY_TYPES, PROTEACEAE_VARIETIES, DEFAULT_GREENHOUSE_CONFIG
DEFAULT_EXPENSE_CATEGORIES, DEFAULT_REVENUE_CATEGORIES, DEFAULT_CATEGORIES
```

### Colori Attività
- Innaffiatura: Blu (#2196F3)
- Concimazione: Marrone (#8B4513)
- Potatura: Arancione (#FF9800)
- Trattamento: Viola (#9C27B0)
- Altro: Grigio (#607D8B)

### Colori Contabilità
- Ricavi: Verde (#4CAF50)
- Costi: Rosso (#F44336)

## Varietà Proteaceae Supportate
Leucospermum cordifolium, Protea cynaroides, Leucadendron salignum, Banksia coccinea, Protea magnifica, Leucospermum reflexum, Protea repens, Leucadendron laureolum, Banksia prionotes, Protea neriifolia

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
- Trattamenti: creazione atomica (1 record per settore) per compliance
- Selezione multipla settori con pulsante "Seleziona Tutti"
- **IMPORTANTE**: types/index.ts è la fonte unica per tipi e costanti - mai modificare o ridefinire altrove
