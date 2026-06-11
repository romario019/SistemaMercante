import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Importações das Telas
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import ManageEquipmentScreen from './src/screens/ManageEquipmentScreen';
import LoginScreen from "./src/screens/LoginScreen";
import MenuScreen from "./src/screens/MenuScreen";
import ChecklistScreen from "./src/screens/ChecklistScreen";
import CollectorChecklistScreen from "./src/screens/CollectorChecklistScreen";
import ReportsListScreen from "./src/screens/ReportsListScreen";
import ReportDetailScreen from "./src/screens/ReportDetailScreen";
import FiveSMenuScreen from "./src/screens/FiveSMenuScreen";
import Checklist5SScreen from "./src/screens/Checklist5SScreen";
import UserManagementScreen from "./src/screens/UserManagementScreen";
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import { ThemeProvider } from './src/context/ThemeContext';

// 👇 AQUI PASSO 1: O aplicativo "baixa" o arquivo da nova tela 👇
import ManageQuestionsScreen from "./src/screens/ManageQuestionsScreen";

const Stack = createStackNavigator();

// Configuração de links para o navegador
const linking = {
  config: {
    screens: {
      Login: '', 
      Menu: 'menu', 
      Checklist: 'checklist',
      CollectorChecklist: 'coletor',
      ReportsList: 'relatorios',
      ReportDetail: 'relatorio-detalhe',
      FiveSMenu: '5s-menu',
      Checklist5S: '5s-checklist',
      UserManagement: 'gerenciar-usuarios', 
      // 👇 AQUI PASSO 2: Diz como vai ficar o link no navegador 👇
      ManageQuestions: 'gerenciar-perguntas',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <NavigationContainer linking={linking}>
        {/* INÍCIO DA LISTA VIP (Stack.Navigator) */}
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Menu" component={MenuScreen} />
          <Stack.Screen name="Checklist" component={ChecklistScreen} />
          <Stack.Screen name="CollectorChecklist" component={CollectorChecklistScreen} />
          <Stack.Screen name="ReportsList" component={ReportsListScreen} />
          <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
          <Stack.Screen name="FiveSMenu" component={FiveSMenuScreen} />
          <Stack.Screen name="Checklist5S" component={Checklist5SScreen} />
          <Stack.Screen name="UserManagement" component={UserManagementScreen} />
          <Stack.Screen name="ManageEquipment" component={ManageEquipmentScreen} />
          <Stack.Screen name="ManageQuestions" component={ManageQuestionsScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />

        </Stack.Navigator>
        {/* FIM DA LISTA VIP */}
      </NavigationContainer>
      </ThemeProvider>

      <StatusBar style="light" backgroundColor="#005A9C" translucent={false} />
    </SafeAreaProvider>
  );
}