# Design Guidelines: Greenhouse Management App

## Application Overview
A professional greenhouse management application for tracking Proteaceae plant cultivation across 3 greenhouses (2000 m² each). The app enables real-time recording of daily activities (watering, fertilizing, pruning, treatments) directly from the greenhouse, with visual navigation through the facility's physical structure (greenhouses → sectors → arcades → benches).

## Architecture Decisions

### Authentication
**No authentication required** - Single-user professional tool with local data storage.
- Include a **Profile/Settings screen** with:
  - User-customizable name field (e.g., "Luca Rossi")
  - App preferences (language: Italian/English, notifications, data export)
  - Business information (company name, greenhouse location)
- All data stored locally using AsyncStorage for offline access in the greenhouse

### Navigation Structure
**Tab Navigation** (4 tabs) with Floating Action Button for core action:

1. **Dashboard** (Home icon)
   - Overview statistics and recent activities
   
2. **Serre** (Grid/Layers icon)
   - Visual navigation through greenhouse structure
   
3. **Calendario** (Calendar icon)
   - Activity timeline and scheduling
   
4. **Profilo** (User icon)
   - Settings and data management

**Core Action**: Floating Action Button (FAB) for "Registra Attività" (Record Activity) - positioned bottom-right, always visible across all tabs

### Screen Specifications

#### 1. Dashboard Screen
- **Purpose**: Quick overview of greenhouse operations
- **Header**: Transparent, title "Dashboard", no buttons
- **Layout**: 
  - ScrollView root
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**:
  - Summary cards: Total plants per greenhouse, today's activities count, pending tasks
  - Recent activities list (last 5-7 entries)
  - Quick stats: Most common variety, busiest sector
  - Weather widget (optional, for greenhouse conditions)

#### 2. Serre (Greenhouses) Screen
- **Purpose**: Navigate through physical greenhouse structure
- **Header**: Transparent, title "Serre", search icon (right)
- **Layout**:
  - ScrollView root with nested navigation
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**:
  - 3 greenhouse cards (Serra 1, 2, 3) with summary data
  - Tapping greenhouse → Sector grid view
  - Tapping sector → Visual bench layout (B1-B5 matching the provided schema)
  - Visual representation uses the arcade/bench structure from attached image

#### 3. Sector/Bench Detail Screen
- **Purpose**: View and manage plants on specific benches
- **Header**: Default navigation with back button, bench name (e.g., "Settore A - B3"), edit icon (right)
- **Layout**:
  - ScrollView root
  - Top inset: Spacing.xl (non-transparent header)
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**:
  - Bench info card: Number of plants, variety name, planting date
  - Activity history list (chronological)
  - Plant health status indicators
  - Notes section

#### 4. Calendario (Calendar) Screen
- **Purpose**: View and filter activity timeline
- **Header**: Transparent, title "Calendario", filter icon (right)
- **Layout**:
  - Month calendar at top (sticky)
  - ScrollView for activity list below
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**:
  - Calendar component with activity markers
  - Filterable activity list (by greenhouse, sector, activity type)
  - Date range selector
  - Activity type badges (color-coded)

#### 5. Registra Attività (Record Activity) Modal
- **Purpose**: Record new activity for specific benches/plants
- **Layout**: Native modal, full-screen
- **Header**: Default navigation, "Annulla" (left), "Salva" (right)
- **Components**:
  - Form with fields:
    - Activity type picker (Innaffiatura, Concimazione, Potatura, Trattamento, Altro)
    - Greenhouse/Sector/Bench selector (cascading dropdowns or visual picker)
    - Date/time picker (default: now)
    - Notes text area
    - Photo attachment option
  - Submit and cancel buttons in header
  - Top inset: Spacing.xl, Bottom inset: insets.bottom + Spacing.xl

#### 6. Profilo (Profile) Screen
- **Purpose**: App settings and data management
- **Header**: Transparent, title "Profilo"
- **Layout**:
  - ScrollView root
  - Top inset: headerHeight + Spacing.xl
  - Bottom inset: tabBarHeight + Spacing.xl
- **Components**:
  - User info section (name, business)
  - Settings: Language, notifications, theme
  - Data management: Export CSV, backup data
  - App info: Version, help documentation

## Design System

### Color Palette
**Professional Botanical Theme** - optimized for outdoor/bright conditions:
- **Primary**: #2D7A3E (Forest Green) - CTAs, active states
- **Secondary**: #8B4513 (Saddle Brown) - Greenhouse structure, accents
- **Background**: #F5F5F0 (Off-white) - Reduces glare in bright greenhouse
- **Surface**: #FFFFFF (White) - Cards, modals
- **Text Primary**: #1A1A1A (Near Black) - High contrast
- **Text Secondary**: #666666 (Gray)
- **Success**: #4CAF50 (Healthy plant green)
- **Warning**: #FF9800 (Attention needed)
- **Error**: #E53935 (Critical issues)
- **Activity Type Colors**:
  - Innaffiatura: #2196F3 (Blue)
  - Concimazione: #8B4513 (Brown)
  - Potatura: #FF9800 (Orange)
  - Trattamento: #9C27B0 (Purple)

### Typography
- **Headers**: System Bold, 24-28pt
- **Subheaders**: System Semibold, 18-20pt
- **Body**: System Regular, 16pt (larger for outdoor readability)
- **Captions**: System Regular, 14pt
- **Button Text**: System Semibold, 16pt

### Visual Design Principles
- **High Contrast**: Text must be readable in bright sunlight
- **Large Touch Targets**: Minimum 48x48pt for use with gloves
- **Visual Feedback**: All touchable elements have clear pressed state
- **No emojis**: Use Feather icons for professional aesthetic
- **Minimal shadows**: Clean, flat design except for FAB
- **FAB Shadow** (exact specifications):
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2

### Critical Assets
1. **Greenhouse Layout Diagram**: Visual representation of the sector/arcade/bench structure from the provided schema (interactive SVG or custom component)
2. **Activity Type Icons**: Custom icons for each activity type (watering can, fertilizer bag, pruning shears, spray bottle)
3. **Plant Variety Placeholder Images**: 3-5 representative Proteaceae variety photos for visual reference

### Accessibility Requirements
- Minimum touch target: 48x48pt
- Color contrast ratio: 4.5:1 for body text, 3:1 for large text
- All icons paired with text labels
- Form inputs with clear labels and error states
- Keyboard navigation support for text inputs