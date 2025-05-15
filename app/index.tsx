import React, { useEffect } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native";
import { router, SplashScreen } from "expo-router";
import { useAuth } from "./contexts/AuthContext";

const fallbackWhite = "#ffffff";
const fallbackPrimary = "#06b6d4";

export default function AppEntry() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      if (isAuthenticated) {
        console.log("AppEntry: Authenticated, navigating to home...");
        router.replace("/home");
      } else {
        console.log("AppEntry: Not authenticated, navigating to welcome...");
        router.replace("/welcome");
      }
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-cyan-50">
        <StatusBar backgroundColor={fallbackWhite} barStyle="dark-content" />
        <ActivityIndicator size="large" color={fallbackPrimary} />
      </View>
    );
  }
  return (
    <View className="flex-1 justify-center items-center bg-cyan-50">
      <StatusBar backgroundColor={fallbackWhite} barStyle="dark-content" />
      <ActivityIndicator size="large" color={fallbackPrimary} />
    </View>
  );
}
