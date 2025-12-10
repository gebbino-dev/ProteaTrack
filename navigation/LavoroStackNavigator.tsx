import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LavoroScreen from "@/screens/LavoroScreen";
import RecordActivityScreen from "@/screens/RecordActivityScreen";
import ActivityDetailScreen from "@/screens/ActivityDetailScreen";
import EditActivityScreen from "@/screens/EditActivityScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type LavoroStackParamList = {
  Lavoro: undefined;
  RecordActivity: {
    greenhouse?: number;
    sector?: number;
    bench?: string;
  } | undefined;
  ActivityDetail: { activityId: string };
  EditActivity: { activityId: string };
};

const Stack = createNativeStackNavigator<LavoroStackParamList>();

export default function LavoroStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Lavoro"
        component={LavoroScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Lavoro" showIcon={false} />,
        }}
      />
      <Stack.Screen
        name="RecordActivity"
        component={RecordActivityScreen}
        options={{
          headerTitle: "Registra Attività",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{
          headerTitle: "Dettaglio Attività",
        }}
      />
      <Stack.Screen
        name="EditActivity"
        component={EditActivityScreen}
        options={{
          headerTitle: "Modifica Attività",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
