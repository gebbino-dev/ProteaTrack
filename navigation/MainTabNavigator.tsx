import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import GreenhouseStackNavigator from "@/navigation/GreenhouseStackNavigator";
import LavoroStackNavigator from "@/navigation/LavoroStackNavigator";
import NotebookStackNavigator from "@/navigation/NotebookStackNavigator";
import AccountingStackNavigator from "@/navigation/AccountingStackNavigator";
import ReportStackNavigator from "@/navigation/ReportStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  DashboardTab: undefined;
  ColtureTab: undefined;
  LavoroTab: undefined;
  QuadernoTab: undefined;
  ContabilitaTab: undefined;
  ReportTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ColtureTab"
        component={GreenhouseStackNavigator}
        options={{
          title: "Colture",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LavoroTab"
        component={LavoroStackNavigator}
        options={{
          title: "Lavoro",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QuadernoTab"
        component={NotebookStackNavigator}
        options={{
          title: "Quaderno",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ContabilitaTab"
        component={AccountingStackNavigator}
        options={{
          title: "Contabilita",
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportTab"
        component={ReportStackNavigator}
        options={{
          title: "Report",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
