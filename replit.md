# ProteaTrack - Gestione Serre Proteaceae

## Panoramica
ProteaTrack è un'app mobile per la gestione di serre dedicate alla coltivazione di piante Proteaceae in vaso. L'app permette di tracciare le attività quotidiane, i trattamenti fitosanitari, la contabilità e di generare report analitici.

## Architettura a 5 Moduli

L'app è organizzata in 5 moduli principali accessibili tramite bottom tab navigation:

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

### 3. Magazzino (Inventario Confermato)
- **2 Tab principali**:
  - **Piante/Semi**: Raggruppate per genere (Protea, Leucospermum, Leucadendron, Banksia, etc.)
    - Collegato con "Piante Disponibili" in Colture (stessa fonte dati: PlantInventory)
    - Mostra: quantità totale, distribuite, disponibili per varietà
    - Solo articoli da categoria "Acquisto Piante" o "Semi"
    - **CRUD completo**: Pulsante "+ Aggiungi" per nuove piante, modifica/elimina per varietà esistenti
  - **Materiali**: Vasi, terriccio, materiale vario, altro
    - Filtri per tipo (Tutti, Vasi, Terriccio, Materiali, Altro)
    - **Tendina per cambiare categoria**: premendo su un materiale si apre modale per riassegnare tipo
    - Solo articoli da categoria "Materiali" in contabilità
- Banner righe in attesa (espandibile) per confermare nuove importazioni
- Usa tipi: `PendingInvoiceLine`, `ItemCategory`, `MaterialRecord`, `PlantLot`, `GenusGroup`

### 4. Quaderno (Quaderno di Campagna)
- Registro trattamenti fitosanitari per compliance normativa
- Data, prodotto, dose (g/hl), acqua (L), ubicazione, avversità
- Selezione multipla settori con "Seleziona Tutti"
- Esportazione CSV per documentazione
- Usa tipi: `PhytosanitaryProduct`, `Treatment`

### 5. Gestione (Contabilità + Report Unificati)
- **Selezione Periodo Flessibile**: seleziona un intervallo di mesi consecutivi (fino a 18+ mesi)
  - Pulsanti rapidi: Mese corrente, Trimestre, Da inizio anno, Anno intero
  - Selezione manuale: tocca mese iniziale, poi mese finale
- **Dashboard Finanziaria**: riepilogo entrate/uscite per il periodo selezionato
- **Margine Periodo**: calcolo automatico ricavi - costi
- **Top Categorie**: le 5 categorie con più movimenti
- **Statistiche Serre**: piante totali, settori attivi
- **Attività nel Periodo**: breakdown per tipo (innaffiatura, concimazione, etc.)
- **Trattamenti nel Periodo**: breakdown per prodotto fitosanitario
- **Ultimi Movimenti**: gli ultimi 5 movimenti nel periodo
- **Registrazione movimenti** con categorie predefinite
- **Importa Fattura XML**: import da FatturaPA
- Usa tipi: `TransactionCategory`, `Transaction`, `FinancialSummary`, `GreenhouseStats`

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
- **Backup/Ripristino**: expo-file-system + expo-sharing per export/import dati
- **UI**: Design iOS Liquid Glass con tema botanico professionale

### Sistema Backup/Ripristino
- **Esporta Backup**: Salva tutti i dati dell'app in un file JSON condivisibile
- **Importa Backup**: Ripristina i dati da un file JSON di backup ProteaTrack
- **Posizione**: Profilo → Backup e Ripristino
- **Uso principale**: Trasferire dati tra app Replit (web) e Expo Go (iOS native)
- **IMPORTANTE**: I dati in AsyncStorage sono isolati tra ambienti web e native
  - App Replit usa localStorage/IndexedDB del browser
  - Expo Go usa AsyncStorage nativo iOS
  - Usare backup/ripristino per sincronizzare i dati tra ambienti
- **File correlati**: `utils/backupService.ts`, `screens/ProfileScreen.tsx`

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

  # Magazzino
  - MagazzinoScreen.tsx           # Gestione righe fattura importate
  - LavoroScreen.tsx              # (obsoleto) Lista attività con filtri
  - RecordActivityScreen.tsx      # Form registrazione attività
  - ActivityDetailScreen.tsx      # Dettaglio attività
  - EditActivityScreen.tsx        # Modifica attività

  # Quaderno
  - TreatmentListScreen.tsx       # Lista trattamenti
  - TreatmentEditScreen.tsx       # Form registrazione trattamento

  # Gestione (Contabilità + Report)
  - FinancialDashboardScreen.tsx  # Dashboard unificata con selezione periodo flessibile
  - TransactionListScreen.tsx     # Lista movimenti
  - TransactionEditScreen.tsx     # Form registrazione movimento

  # Altro
  - ProfileScreen.tsx             # Impostazioni azienda
  - CalendarScreen.tsx            # Vista calendario unificata (tutti gli eventi)

/navigation
  - MainTabNavigator.tsx          # Tab bar principale (5 tab)
  - DashboardStackNavigator.tsx   # Stack dashboard
  - GreenhouseStackNavigator.tsx  # Stack colture
  - LavoroStackNavigator.tsx      # Stack magazzino
  - NotebookStackNavigator.tsx    # Stack quaderno
  - AccountingStackNavigator.tsx  # Stack gestione (contabilità + report)
  - ProfileStackNavigator.tsx     # Stack profilo

/components
  - StatCard.tsx      # Card statistiche
  - ActivityCard.tsx  # Card attività
  - Button.tsx        # Pulsante animato
  - Card.tsx          # Card con elevazione
  - HeaderTitle.tsx   # Titolo header con logo

/utils
  - storage.ts              # Funzioni AsyncStorage (CRUD per tutti i tipi)
  - pendingInvoiceStore.ts  # Storage righe fattura in attesa di assegnazione
  - plantWarehouse.ts       # Gestione magazzino piante e distribuzioni
  - xmlImportService.ts     # Parser fatture XML FatturaPA
  - inventoryStore.ts       # Gestione inventario materiali
  - eventAggregator.ts      # Aggregazione eventi calendario da tutti i moduli

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
- Righe fattura importate vanno in Magazzino per revisione manuale prima di essere processate
- Gestione inventario piante consolidata in Magazzino/Piante con CRUD completo

### Sistema Calendario Unificato (EventAggregator)
Il calendario mostra eventi unificati da tutti i moduli:
- **Attività** (activity): Innaffiatura, concimazione, potatura, trattamenti, altro
- **Trattamenti** (treatment): Trattamenti fitosanitari dal Quaderno di Campagna
- **Transazioni** (transaction): Movimenti contabili (ricavi/costi)
- **Arrivi piante** (plant_arrival): Arrivi piante da inventario e fatture importate

Ogni tipo evento ha colore e icona distintivi per rapido riconoscimento.
File correlati: `utils/eventAggregator.ts`, `screens/CalendarScreen.tsx`
- Categorie materiali: piante, vasi, terriccio, fitofarmaco, fertilizzante, materiale, semi, utenza, altro

## Sistema Classificazione Automatica Righe Fattura

### Categorie Disponibili (CategoriaRiga)
- `utenze` - con sottocategorie: spese_floratoscana, luce, gas, spese_cia
- `piante` - protea, leucospermum, serruria, telopea, etc.
- `semi` - seme, semi, seeds
- `terriccio` - terriccio, substrato, torba, perlite
- `vasi` - vaso, vasi, contenitore, plateau, alveolare
- `fitofarmaci` - fitofarmaco, fungicida, insetticida, nomi commerciali
- `fertilizzanti` - concime, fertilizzante, npk, stallatico
- `combustibile` - gasolio, gpl, pellet, legna
- `materiale_generico` - fallback per righe non classificate

### Funzionalità
1. **Classificazione automatica all'import**: ogni riga fattura viene classificata automaticamente
2. **Batch update**: pulsante "Classifica Tutto" per reclassificare tutte le righe esistenti
3. **Filtri UI**: schermata dedicata con filtri per categoria e sottocategoria utenza
4. **Dettaglio utenze**: filtro rapido per sottocategorie (spese floratoscana, luce, gas, CIA)

### File Correlati
- `utils/autoCategorizationService.ts` - funzione `classificaRiga()` e batch update
- `screens/CategoriaFilterScreen.tsx` - UI filtri per categoria
- `utils/pendingInvoiceStore.ts` - campi `categoria` e `sottoCategoriaUtenza`

### Selezione Periodo Flessibile (Gestione)
- Permette selezione di intervalli di mesi consecutivi (1-18+ mesi)
- Pulsanti rapidi: Mese, Trimestre, Da inizio anno, Anno intero
- Modal con griglia mesi per selezione manuale
- Filtra tutti i dati: transazioni, attività, trattamenti
