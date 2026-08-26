import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="expense/[id]" options={{ presentation: "modal", title: "Expense" }} />
          <Stack.Screen
            name="expense/new"
            options={{ presentation: "modal", title: "Add Expense" }}
          />
          <Stack.Screen name="income/[id]" options={{ presentation: "modal", title: "Income" }} />
          <Stack.Screen
            name="income/new"
            options={{ presentation: "modal", title: "Add Income" }}
          />
          <Stack.Screen name="budget/[id]" options={{ presentation: "modal", title: "Budget" }} />
          <Stack.Screen
            name="budget/new"
            options={{ presentation: "modal", title: "Add Budget" }}
          />
          <Stack.Screen
            name="category/[id]"
            options={{ presentation: "modal", title: "Category" }}
          />
          <Stack.Screen
            name="category/new"
            options={{ presentation: "modal", title: "Add Category" }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        {/* Declared last so it is never the fallback initial route when the
            (tabs) initialRouteName is guarded out (logged-out state).
            Otherwise this screen mounts on launch / right after login and its
            no-recovery-token effect signs the user straight back out. */}
        <Stack.Screen name="reset-password" options={{ title: "Reset Password" }} />
      </Stack>
    </ThemeProvider>
  );
}
