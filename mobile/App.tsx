import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { InductionQuizScreen } from "./src/screens/InductionQuizScreen";
import { MedicalUploadScreen } from "./src/screens/MedicalUploadScreen";
import { DigitalBadgeScreen } from "./src/screens/DigitalBadgeScreen";
import { GateScannerScreen } from "./src/screens/GateScannerScreen";
import { RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const SafeMineTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#020617",
    card: "#0f172a",
    text: "#f8fafc",
    border: "#1e293b",
    primary: "#f59e0b",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={SafeMineTheme}>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: { backgroundColor: "#0f172a" },
              headerTintColor: "#f8fafc",
              headerTitleStyle: { fontWeight: "800", fontSize: 16 },
              contentStyle: { backgroundColor: "#020617" },
            }}
          >
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InductionQuiz"
              component={InductionQuizScreen}
              options={{ title: "Paso 1 · Inducción IPERC" }}
            />
            <Stack.Screen
              name="MedicalUpload"
              component={MedicalUploadScreen}
              options={{ title: "Paso 2 · Auditoría EMO IA" }}
            />
            <Stack.Screen
              name="DigitalBadge"
              component={DigitalBadgeScreen}
              options={{ title: "Fotocheck QR Minero" }}
            />
            <Stack.Screen
              name="GateScanner"
              component={GateScannerScreen}
              options={{ title: "Modo Garita · Escáner IA" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
