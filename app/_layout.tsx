// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { StatsProvider, useStats } from "@/contexts/StatsContext";
import { PlayersProvider, usePlayers } from "@/contexts/PlayersContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";

void SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn("[RootLayout] Unable to prevent auto hide", error);
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isInitialized: statsInitialized } = useStats();
  const { isInitialized: playersInitialized } = usePlayers();
  const { isInitialized: subscriptionInitialized } = useSubscription();

  const isReady = statsInitialized && playersInitialized && subscriptionInitialized;

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.palette.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

type RootErrorBoundaryState = { error: Error | null };

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    console.error("[RootErrorBoundary]", error);
    return { error };
  }

  handleRetry = () => {
    console.log("[RootErrorBoundary] retry tapped");
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer} testID="error-boundary-fallback">
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage} numberOfLines={3}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={styles.retryButton}
            testID="error-boundary-retry"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
      .then(() => {
        console.log("[RootLayout] Splash screen hidden");
      })
      .catch((error) => {
        console.warn("[RootLayout] Failed to hide splash screen", error);
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SubscriptionProvider>
          <PlayersProvider>
            <StatsProvider>
              <GestureHandlerRootView
                style={styles.gestureRoot}
                testID="app-root"
              >
                <RootErrorBoundary>
                  <RootLayoutNav />
                </RootErrorBoundary>
              </GestureHandlerRootView>
            </StatsProvider>
          </PlayersProvider>
        </SubscriptionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: colors.palette.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.palette.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.palette.background,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.palette.text,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.palette.mutedText,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.palette.primary,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.palette.text,
    textAlign: "center",
  },
});
