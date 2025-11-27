import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { storage } from "@/utils/storage";
import { SECTORS_PER_GREENHOUSE, BENCHES, Bench } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type SectorListScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "SectorList">;
  route: RouteProp<GreenhouseStackParamList, "SectorList">;
};

export default function SectorListScreen({ navigation, route }: SectorListScreenProps) {
  const { greenhouse } = route.params;
  const { theme } = useTheme();
  const [benchData, setBenchData] = useState<Bench[]>([]);

  const sectors = SECTORS_PER_GREENHOUSE[greenhouse];
  const arcades = [
    { name: "Arcata 1", sectors: sectors.slice(0, 4) },
    { name: "Arcata 2", sectors: sectors.slice(4, 8) },
    { name: "Arcata 3", sectors: sectors.slice(8, 12) },
  ];

  useFocusEffect(
    useCallback(() => {
      const loadBenches = async () => {
        const benches = await storage.getBenches();
        setBenchData(benches.filter((b) => b.greenhouse === greenhouse));
      };
      loadBenches();
    }, [greenhouse])
  );

  const getSectorStats = (sector: number) => {
    const sectorBenches = benchData.filter((b) => b.sector === sector);
    const plantCount = sectorBenches.reduce((sum, b) => sum + b.plantCount, 0);
    const activeBenches = sectorBenches.filter((b) => b.plantCount > 0).length;
    return { plantCount, activeBenches };
  };

  return (
    <ScreenScrollView>
      {arcades.map((arcade, arcadeIndex) => (
        <View key={arcade.name} style={styles.arcadeSection}>
          <View style={[styles.arcadeHeader, { backgroundColor: theme.primary }]}>
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              {arcade.name}
            </ThemedText>
          </View>

          <View style={styles.sectorsGrid}>
            {arcade.sectors.map((sector) => {
              const stats = getSectorStats(sector);
              return (
                <View key={sector} style={styles.sectorWrapper}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sectorCard,
                      { backgroundColor: theme.backgroundDefault },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => {}}
                  >
                    <ThemedText type="h4" style={styles.sectorTitle}>
                      Settore {sector}
                    </ThemedText>
                    <ThemedText
                      style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm }}
                    >
                      {stats.plantCount} piante - {stats.activeBenches}/5 bancali
                    </ThemedText>

                    <View style={styles.benchesRow}>
                      {BENCHES.map((bench) => {
                        const benchInfo = benchData.find(
                          (b) => b.sector === sector && b.benchNumber === bench
                        );
                        const hasPlants = benchInfo && benchInfo.plantCount > 0;

                        return (
                          <Pressable
                            key={bench}
                            style={({ pressed }) => [
                              styles.benchButton,
                              {
                                backgroundColor: hasPlants
                                  ? theme.primary
                                  : theme.backgroundSecondary,
                              },
                              pressed && { opacity: 0.7 },
                            ]}
                            onPress={() =>
                              navigation.navigate("BenchDetail", {
                                greenhouse,
                                sector,
                                bench,
                              })
                            }
                          >
                            <ThemedText
                              style={[
                                styles.benchText,
                                { color: hasPlants ? "#FFFFFF" : theme.text },
                              ]}
                            >
                              {bench}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  arcadeSection: {
    marginBottom: Spacing["2xl"],
  },
  arcadeHeader: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  sectorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  sectorWrapper: {
    width: "50%",
    padding: Spacing.xs,
  },
  sectorCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectorTitle: {
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  benchesRow: {
    flexDirection: "row",
    gap: 4,
  },
  benchButton: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  benchText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
