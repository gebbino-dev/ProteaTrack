import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TreatmentListScreen from "@/screens/TreatmentListScreen";
import TreatmentEditScreen from "@/screens/TreatmentEditScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type NotebookStackParamList = {
  TreatmentList: undefined;
  TreatmentEdit: { 
    treatmentId?: string;
    greenhouse?: number;
    sector?: number;
    bench?: string;
  } | undefined;
};

const Stack = createNativeStackNavigator<NotebookStackParamList>();

export default function NotebookStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="TreatmentList"
        component={TreatmentListScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Quaderno" showIcon={false} />,
        }}
      />
      <Stack.Screen
        name="TreatmentEdit"
        component={TreatmentEditScreen}
        options={{
          headerTitle: "Nuovo Trattamento",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
