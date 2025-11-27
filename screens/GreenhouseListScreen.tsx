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
import { GREENHOUSES, SECTORS_PER_GREENHOUSE, Bench } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type GreenhouseListScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "GreenhouseList">;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GreenhouseCardProps {
  greenhouse: number;
  plantCount: number;
  sectorCount: number;
  onPress: () => void;
}

function GreenhouseCard({ greenhouse, plantCount, sectorCount, onPress }: GreenhouseCardProps) {
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
          <ThemedText type="h4">Serra {greenhouse}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            2000 m² - 3 Arcate
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

  useFocusEffect(
    useCallback(() => {
      const loadBenches = async () => {
        const benches = await storage.getBenches();
        setBenchData(benches);
      };
      loadBenches();
    }, [])
  );

  const getGreenhouseStats = (greenhouse: number) => {
    const sectors = SECTORS_PER_GREENHOUSE[greenhouse];
    const greenhouseBenches = benchData.filter(b => b.greenhouse === greenhouse);
    const plantCount = greenhouseBenches.reduce((sum, b) => sum + b.plantCount, 0);
    return { plantCount, sectorCount: sectors.length };
  };

  return (
    <ScreenScrollView>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
        Seleziona una serra per visualizzare i settori e i bancali
      </ThemedText>

      {GREENHOUSES.map((greenhouse) => {
        const stats = getGreenhouseStats(greenhouse);
        return (
          <View key={greenhouse} style={{ marginBottom: Spacing.lg }}>
            <GreenhouseCard
              greenhouse={greenhouse}
              plantCount={stats.plantCount}
              sectorCount={stats.sectorCount}
              onPress={() => navigation.navigate("SectorList", { greenhouse })}
            />
          </View>
        );
      })}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
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
