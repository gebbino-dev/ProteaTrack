import { Platform } from "react-native";

const primaryGreen = "#2D7A3E";
const primaryGreenDark = "#3D9A4E";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#666666",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: primaryGreen,
    link: primaryGreen,
    primary: primaryGreen,
    backgroundRoot: "#F5F5F0",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#E8E8E3",
    backgroundTertiary: "#D9D9D4",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#E53935",
    activityWatering: "#2196F3",
    activityFertilizing: "#8B4513",
    activityPruning: "#FF9800",
    activityTreatment: "#9C27B0",
    activityOther: "#607D8B",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryGreenDark,
    link: primaryGreenDark,
    primary: primaryGreenDark,
    backgroundRoot: "#1A1D1A",
    backgroundDefault: "#252825",
    backgroundSecondary: "#303530",
    backgroundTertiary: "#3B403B",
    success: "#66BB6A",
    warning: "#FFB74D",
    error: "#EF5350",
    activityWatering: "#42A5F5",
    activityFertilizing: "#A0522D",
    activityPruning: "#FFB74D",
    activityTreatment: "#AB47BC",
    activityOther: "#78909C",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const ActivityColors = {
  innaffiatura: Colors.light.activityWatering,
  concimazione: Colors.light.activityFertilizing,
  potatura: Colors.light.activityPruning,
  trattamento: Colors.light.activityTreatment,
  altro: Colors.light.activityOther,
};
