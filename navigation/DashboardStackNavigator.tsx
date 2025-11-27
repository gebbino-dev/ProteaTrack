import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "@/screens/DashboardScreen";
import RecordActivityScreen from "@/screens/RecordActivityScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type DashboardStackParamList = {
  Dashboard: undefined;
  RecordActivity: {
    greenhouse?: number;
    sector?: number;
    bench?: string;
  } | undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="SerraManager" />,
        }}
      />
      <Stack.Screen
        name="RecordActivity"
        component={RecordActivityScreen}
        options={{
          headerTitle: "Registra Attivita",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
