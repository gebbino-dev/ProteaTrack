# SerraManager - Gestione Serre Proteaceae

## Panoramica
SerraManager è un'app mobile per la gestione di serre dedicate alla coltivazione di piante Proteaceae in vaso. L'app permette di tracciare le attività quotidiane (innaffiatura, concimazione, potatura, trattamenti) associandole a specifici bancali e settori delle serre.

## Struttura delle Serre
L'app gestisce 3 serre da 2000 m² ciascuna, organizzate come segue:
- **Serra 1**: Settori 1-12 (3 Arcate x 4 Settori)
- **Serra 2**: Settori 13-24 (3 Arcate x 4 Settori)
- **Serra 3**: Settori 25-36 (3 Arcate x 4 Settori)

Ogni settore contiene 5 bancali numerati: B1, B2, B3, B4, B5

## Funzionalità Principali

### Dashboard
- Statistiche rapide: totale piante, attività odierne, bancali attivi
- Lista delle attività recenti
- FAB (Floating Action Button) per registrazione rapida attività

### Gestione Serre
- Visualizzazione delle 3 serre con conteggio piante e settori
- Navigazione: Serra → Settori per Arcata → Dettaglio Bancale
- Ogni bancale mostra: numero piante, varietà, data impianto, note, storico attività

### Calendario Attività
- Visualizzazione calendario mensile
- Filtri per tipo attività (Innaffiatura, Concimazione, Potatura, Trattamento)
- Lista attività per data selezionata

### Registrazione Attività
- 5 tipi: Innaffiatura, Concimazione, Potatura, Trattamento, Altro
- Selezione posizione: Serra → Settore → Bancale
- Campo note opzionale
- Salvataggio con data/ora automatica

### Profilo/Impostazioni
- Informazioni azienda (nome responsabile, nome azienda, località)
- Statistiche generali
- Gestione dati (cancellazione dati)

## Architettura Tecnica

### Stack
- **Framework**: React Native con Expo SDK 54
- **Navigazione**: React Navigation 7 (Bottom Tabs + Stack Navigators)
- **Persistenza**: AsyncStorage per dati locali
- **UI**: Design iOS Liquid Glass con tema botanico professionale

### Struttura File
```
/screens
  - DashboardScreen.tsx      # Schermata principale
  - GreenhouseListScreen.tsx # Lista serre
  - SectorListScreen.tsx     # Settori per arcata
  - BenchDetailScreen.tsx    # Dettaglio bancale
  - CalendarScreen.tsx       # Calendario attività
  - RecordActivityScreen.tsx # Form registrazione attività
  - EditBenchScreen.tsx      # Modifica dati bancale
  - ProfileScreen.tsx        # Impostazioni
  - ActivityDetailScreen.tsx # Dettaglio attività

/navigation
  - MainTabNavigator.tsx          # Tab bar principale
  - DashboardStackNavigator.tsx   # Stack dashboard
  - GreenhouseStackNavigator.tsx  # Stack serre
  - CalendarStackNavigator.tsx    # Stack calendario
  - ProfileStackNavigator.tsx     # Stack profilo

/components
  - StatCard.tsx      # Card statistiche
  - ActivityCard.tsx  # Card attività
  - Button.tsx        # Pulsante animato
  - Card.tsx          # Card con elevazione
  - HeaderTitle.tsx   # Titolo header con logo

/utils
  - storage.ts        # Funzioni AsyncStorage

/types
  - index.ts          # Tipi TypeScript

/constants
  - theme.ts          # Colori, spacing, typography
```

### Tipi Dati Principali
```typescript
Activity {
  id, type, greenhouse, sector, bench, date, notes, createdAt
}

Bench {
  id, greenhouse, sector, benchNumber, plantCount, variety, plantingDate, notes
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
