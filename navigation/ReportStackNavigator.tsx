import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ReportScreen from "@/screens/ReportScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ReportStackParamList = {
  Report: undefined;
};

const Stack = createNativeStackNavigator<ReportStackParamList>();

export default function ReportStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Report" showIcon={false} />,
        }}
      />
    </Stack.Navigator>
  );
}
