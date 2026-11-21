import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { InductionQuizScreen } from "./src/screens/InductionQuizScreen";
import { MedicalUploadScreen } from "./src/screens/MedicalUploadScreen";
import { DigitalBadgeScreen } from "./src/screens/DigitalBadgeScreen";
import { GateScannerScreen } from "./src/screens/GateScannerScreen";
import { colors } from "./src/theme/tokens";
import { RootStackParamList } from "./src/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const SafeMineTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.canvas,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={SafeMineTheme}>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.textPrimary,
              headerTitleStyle: {
                fontWeight: "700",
                fontSize: 16,
                color: colors.textPrimary,
              },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.canvas },
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
              options={{ title: "Inducción IPERC" }}
            />
            <Stack.Screen
              name="MedicalUpload"
              component={MedicalUploadScreen}
              options={{ title: "Certificado EMO" }}
            />
            <Stack.Screen
              name="DigitalBadge"
              component={DigitalBadgeScreen}
              options={{ title: "Fotocheck QR" }}
            />
            <Stack.Screen
              name="GateScanner"
              component={GateScannerScreen}
              options={{ title: "Modo Garita" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
