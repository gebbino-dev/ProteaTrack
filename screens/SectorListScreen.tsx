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
import { Bench, GreenhouseConfig } from "@/types";
import { GreenhouseStackParamList } from "@/navigation/GreenhouseStackNavigator";

type SectorListScreenProps = {
  navigation: NativeStackNavigationProp<GreenhouseStackParamList, "SectorList">;
  route: RouteProp<GreenhouseStackParamList, "SectorList">;
};

export default function SectorListScreen({ navigation, route }: SectorListScreenProps) {
  const { greenhouse: greenhouseId } = route.params;
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
        setBenchData(benches.filter((b) => b.greenhouse === greenhouseId));
        setConfig(ghConfig);
      };
      loadData();
    }, [greenhouseId])
  );

  if (!config) return null;

  const greenhouse = config.greenhouses.find((g) => g.id === greenhouseId);
  if (!greenhouse) return null;

  const sectorGroups = [];
  for (let i = 0; i < greenhouse.sectors.length; i += 3) {
    sectorGroups.push(greenhouse.sectors.slice(i, i + 3));
  }

  const benchNames = greenhouse.benchNames || Array.from(
    { length: greenhouse.benchCount },
    (_, i) => `B${i + 1}`
  );

  const getSectorStats = (sectorId: number) => {
    const sectorBenches = benchData.filter((b) => b.sector === sectorId);
    const plantCount = sectorBenches.reduce((sum, b) => sum + b.plantCount, 0);
    const activeBenches = sectorBenches.filter((b) => b.plantCount > 0).length;
    return { plantCount, activeBenches };
  };

  return (
    <ScreenScrollView>
      {sectorGroups.map((group, groupIndex) => (
        <View key={`group-${groupIndex}`} style={styles.groupSection}>
          <View style={styles.sectorsGrid}>
            {group.map((sector) => {
              const stats = getSectorStats(sector.id);
              return (
                <View key={sector.id} style={styles.sectorWrapper}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sectorCard,
                      { backgroundColor: theme.backgroundDefault },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => {}}
                  >
                    <ThemedText type="h4" style={styles.sectorTitle}>
                      {sector.customName || `Settore ${sector.id}`}
                    </ThemedText>
                    <ThemedText
                      style={{ color: theme.textSecondary, fontSize: 12, marginBottom: Spacing.sm }}
                    >
                      {stats.plantCount} piante - {stats.activeBenches}/{benchNames.length} bancali
                    </ThemedText>

                    <View style={styles.benchesRow}>
                      {benchNames.map((benchName) => {
                        const benchInfo = benchData.find(
                          (b) => b.sector === sector.id && b.benchNumber === benchName
                        );
                        const hasPlants = benchInfo && benchInfo.plantCount > 0;

                        return (
                          <Pressable
                            key={benchName}
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
                                greenhouse: greenhouseId,
                                sector: sector.id,
                                bench: benchName,
                              })
                            }
                          >
                            <ThemedText
                              style={[
                                styles.benchText,
                                { color: hasPlants ? "#FFFFFF" : theme.text },
                              ]}
                            >
                              {benchName}
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
  sectorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.xs,
  },
  groupSection: {
    marginBottom: Spacing["2xl"],
  },
  sectorWrapper: {
    width: "33.33%",
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
