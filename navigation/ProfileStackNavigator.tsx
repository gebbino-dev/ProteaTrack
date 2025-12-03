import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import ConfigureGreenhouseScreen from "@/screens/ConfigureGreenhouseScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  ConfigureGreenhouse: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profilo",
        }}
      />
      <Stack.Screen
        name="ConfigureGreenhouse"
        component={ConfigureGreenhouseScreen}
        options={{
          title: "Configura Serre",
        }}
      />
    </Stack.Navigator>
  );
}
