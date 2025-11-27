import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GreenhouseListScreen from "@/screens/GreenhouseListScreen";
import SectorListScreen from "@/screens/SectorListScreen";
import BenchDetailScreen from "@/screens/BenchDetailScreen";
import RecordActivityScreen from "@/screens/RecordActivityScreen";
import EditBenchScreen from "@/screens/EditBenchScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type GreenhouseStackParamList = {
  GreenhouseList: undefined;
  SectorList: { greenhouse: number };
  BenchDetail: { greenhouse: number; sector: number; bench: string };
  RecordActivity: {
    greenhouse?: number;
    sector?: number;
    bench?: string;
  };
  EditBench: { greenhouse: number; sector: number; bench: string };
};

const Stack = createNativeStackNavigator<GreenhouseStackParamList>();

export default function GreenhouseStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="GreenhouseList"
        component={GreenhouseListScreen}
        options={{
          headerTitle: "Serre",
        }}
      />
      <Stack.Screen
        name="SectorList"
        component={SectorListScreen}
        options={({ route }) => ({
          headerTitle: `Serra ${route.params.greenhouse}`,
        })}
      />
      <Stack.Screen
        name="BenchDetail"
        component={BenchDetailScreen}
        options={({ route }) => ({
          headerTitle: `Settore ${route.params.sector} - ${route.params.bench}`,
        })}
      />
      <Stack.Screen
        name="RecordActivity"
        component={RecordActivityScreen}
        options={{
          headerTitle: "Registra Attivita",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="EditBench"
        component={EditBenchScreen}
        options={{
          headerTitle: "Modifica Bancale",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
