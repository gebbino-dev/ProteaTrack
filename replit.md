# ProteaTrack - Gestione Serre Proteaceae

## Overview
ProteaTrack is a mobile application designed for managing greenhouses cultivating potted Proteaceae plants. The app enables tracking daily activities, phytosanitary treatments, accounting, and generating analytical reports. Its primary purpose is to streamline greenhouse operations, ensure compliance, and provide financial oversight for Proteaceae cultivation businesses. The project aims to provide a comprehensive tool for growers, improving efficiency and data-driven decision-making in a niche agricultural market.

## User Preferences
- UI/UX: Design iOS Liquid Glass with a professional botanical theme.
- App optimized for mobile use with large touch targets (48x48pt min).
- UI with high contrast for use in bright light conditions (greenhouse).
- The application should have full offline support using local data.
- The interface language is Italian.
- `types/index.ts` is the single source for types and constants—never modify or redefine elsewhere.
- Imported invoice lines go to `Magazzino` for manual review before processing.
- When working with treatments, they should be created atomically (1 record per sector) for compliance.
- For sector selection, a "Select All" button should be available for multiple selections.
- The user prefers to be asked before making any major changes or decisions that could affect the core architecture or data structure.

## System Architecture

### Core Design
The application is organized into 5 main modules accessible via bottom tab navigation:
1.  **Dashboard (Home)**: Quick statistics, recent activities, quick activity logging.
2.  **Colture (Greenhouse and Plant Management)**: Visualizes 3 greenhouses, sectors, and benches. Includes plant inventory with DDT scanning (OCR web only).
3.  **Magazzino (Confirmed Inventory)**: Manages plant/seed and material inventory, with separate tabs. Includes a banner for pending import lines and full CRUD for plant varieties.
4.  **Quaderno (Field Notebook)**: Registers phytosanitary treatments for regulatory compliance, including multi-sector selection and CSV export.
5.  **Gestione (Accounting + Unified Reports)**: Financial dashboard with flexible period selection, income/expense tracking, top categories, greenhouse statistics, activity and treatment breakdowns, and XML invoice import (FatturaPA).

### Greenhouse Structure
The app manages 3 greenhouses, each 2000 m², divided into 3 arcs (4 sectors per arc, total 12 sectors per greenhouse). Each sector contains 5 benches (B1-B5).

### Technical Stack
-   **Framework**: React Native with Expo SDK 54.
-   **Navigation**: React Navigation 7 (Bottom Tabs + Stack Navigators).
-   **Persistence**: AsyncStorage for local data.
-   **OCR**: Tesseract.js (web-only).
-   **Backup/Restore**: `expo-file-system` + `expo-sharing` for data export/import (JSON format), crucial for syncing data between web (Replit) and native (Expo Go) environments due to AsyncStorage isolation.

### Data Types (from `types/index.ts`)
Centralized types for: `Activity`, `Bench`, `Greenhouse`, `GreenhouseConfig`, `PlantRecord`, `Transaction`, `TransactionCategory`, `Treatment`, `PhytosanitaryProduct`, `GreenhouseStats`.

### Unified Calendar System (EventAggregator)
Displays aggregated events from all modules: Activities, Treatments, Transactions, and Plant Arrivals, each with distinct colors and icons.

### Automatic Invoice Line Classification
-   **Categories**: `utenze` (utilities), `piante` (plants), `semi` (seeds), `terriccio` (soil), `vasi` (pots), `fitofarmaci` (pesticides), `fertilizzanti` (fertilizers), `combustibile` (fuel), `materiale_generico` (general material).
-   **Functionality**: Automatic classification on import, batch update, UI filters for categories and utility subcategories.

### Inventory Movements and Stock
-   Tracks inventory movements (entry/exit) for plants, seeds, and materials.
-   Calculates year-end stock (December 31st).
-   Monthly summary of entries/exits.

### Modular Architecture and Data Flows
-   **Logical Modules**: Invoice Import, Pending/Classification, Plant Inventory & Movements, Greenhouses and Benches, Accounting.
-   **Crop Cycle (`cycleKey`)**: A `cycleKey` (e.g., "Leucospermum_2025-26") is calculated for `PlantRecord`s based on variety and arrival date to group plants of the same cycle.
-   **Standardized Data Flows**:
    -   **Flow A (Invoice Import to Pending)**: XML parsing -> `PendingInvoiceLine` creation with auto-categorization -> accounting transaction.
    -   **Flow B (Pending to Plant Inventory)**: A single centralized function `applyPendingLinesToPlantInventory()` processes pending plant/seed lines, calculates `cycleKey`, creates `PlantRecord`s, and records movements.
    -   **Flow C (Inventory to Greenhouses/Benches)**: Future integration where `PlantRecord`s link to benches via `benchRef`.
-   **Centralized Service File**: `services/applyPendingLinesToInventory.ts` contains core logic for `calculateCycleKey`, `applyPendingLinesToPlantInventory`, and `processLineToInventory`.

## External Dependencies
-   **Expo SDK 54**: For React Native development.
-   **React Navigation 7**: For in-app navigation.
-   **AsyncStorage**: For local data persistence.
-   **Tesseract.js**: For OCR functionality (web platform only).
-   **expo-file-system**: For file system operations (backup/restore).
-   **expo-sharing**: For sharing backup files.
-   **FatturaPA XML Standard**: For importing electronic invoices.