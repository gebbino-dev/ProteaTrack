import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { GreenhouseConfig, Bench } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type GreenhouseListScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "GreenhouseList">;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GreenhouseCardProps {
  greenhouse: number;
  name?: string;
  plantCount: number;
  sectorCount: number;
  onPress: () => void;
}

function GreenhouseCard({ greenhouse, name, plantCount, sectorCount, onPress }: GreenhouseCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const getGreenhouseColor = (num: number) => {
    const colors = [theme.primary, theme.activityWatering, theme.activityTreatment];
    return colors[num - 1] || theme.primary;
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.cardHeader, { borderBottomColor: theme.backgroundSecondary }]}>
        <View style={[styles.cardIcon, { backgroundColor: getGreenhouseColor(greenhouse) }]}>
          <Feather name="home" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardTitleContainer}>
          <ThemedText type="h4">{name || `Serra ${greenhouse}`}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {sectorCount} settori
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color={theme.tabIconDefault} />
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <ThemedText type="h3" style={{ color: theme.primary }}>
            {plantCount}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
            Piante
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.backgroundSecondary }]} />
        <View style={styles.statItem}>
          <ThemedText type="h3" style={{ color: theme.activityWatering }}>
            {sectorCount}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
            Settori
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function GreenhouseListScreen({ navigation }: GreenhouseListScreenProps) {
  const { theme } = useTheme();
  const [benchData, setBenchData] = useState<Bench[]>([]);
  const [config, setConfig] = useState<GreenhouseConfig | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const [benches, ghConfig] = await Promise.all([
          storage.getBenches(),
          storage.getGreenhouseConfig(),
        ]);
        setBenchData(benches);
        setConfig(ghConfig);
      };
      loadData();
    }, [])
  );

  const getGreenhouseStats = (ghId: number) => {
    const greenhouseBenches = benchData.filter(b => b.greenhouse === ghId);
    const plantCount = greenhouseBenches.reduce((sum, b) => sum + b.plantCount, 0);
    const gh = config?.greenhouses.find(g => g.id === ghId);
    return { plantCount, sectorCount: gh?.sectors.length || 0 };
  };

  if (!config) return null;

  return (
    <ScreenScrollView>
      <Pressable
        style={[styles.availablePlantsCard, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate("AvailablePlants")}
      >
        <View style={styles.availablePlantsIcon}>
          <Feather name="package" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.availablePlantsInfo}>
          <ThemedText type="h4" style={{ color: "#FFFFFF" }}>
            Piante Disponibili
          </ThemedText>
          <ThemedText style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
            Gestisci magazzino e distribuisci ai settori
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color="#FFFFFF" />
      </Pressable>

      <View style={{ height: Spacing.xl }} />

      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
        Seleziona una serra per visualizzare i settori e i bancali
      </ThemedText>

      {config.greenhouses.map((greenhouse) => {
        const stats = getGreenhouseStats(greenhouse.id);
        return (
          <View key={greenhouse.id} style={{ marginBottom: Spacing.lg }}>
            <GreenhouseCard
              greenhouse={greenhouse.id}
              name={greenhouse.customName}
              plantCount={stats.plantCount}
              sectorCount={stats.sectorCount}
              onPress={() => navigation.navigate("SectorList", { greenhouse: greenhouse.id })}
            />
          </View>
        );
      })}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  availablePlantsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  availablePlantsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  availablePlantsInfo: {
    flex: 1,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardStats: {
    flexDirection: "row",
    padding: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "100%",
  },
});
