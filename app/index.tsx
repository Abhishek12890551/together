import React, { useEffect } from "react";
import { ActivityIndicator, View, StatusBar } from "react-native"; // Keep StyleSheet for now if needed elsewhere, or remove if fully replaced
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const fallbackWhite = "#ffffff";
const fallbackPrimary = "#007bff";

export default function AppEntry() {
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        console.log("Stored token:", token);

        if (token) {
          console.log("Token found, navigating to home...");
          router.replace("/home");
        } else {
          console.log("No token found, navigating to signin...");
          router.replace("/welcome");
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
        router.replace("/welcome");
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <StatusBar backgroundColor={fallbackWhite} barStyle="dark-content" />
      <ActivityIndicator size="large" color={fallbackPrimary} />
    </View>
  );
}
