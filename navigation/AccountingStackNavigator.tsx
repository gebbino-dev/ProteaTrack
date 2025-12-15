import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FinancialDashboardScreen from "@/screens/FinancialDashboardScreen";
import TransactionListScreen from "@/screens/TransactionListScreen";
import TransactionEditScreen from "@/screens/TransactionEditScreen";
import InvoiceImportScreen from "@/screens/InvoiceImportScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type AccountingStackParamList = {
  FinancialDashboard: undefined;
  TransactionList: { filterType?: 'ricavo' | 'costo' } | undefined;
  TransactionEdit: { transactionId?: string; type?: 'ricavo' | 'costo' } | undefined;
  InvoiceImport: undefined;
};

const Stack = createNativeStackNavigator<AccountingStackParamList>();

export default function AccountingStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="FinancialDashboard"
        component={FinancialDashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Gestione e Report" showIcon={false} />,
        }}
      />
      <Stack.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{
          headerTitle: "Movimenti",
        }}
      />
      <Stack.Screen
        name="TransactionEdit"
        component={TransactionEditScreen}
        options={{
          headerTitle: "Nuovo Movimento",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="InvoiceImport"
        component={InvoiceImportScreen}
        options={{
          headerTitle: "Importa Fattura",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
