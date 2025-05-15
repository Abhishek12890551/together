import "../global.css";
import React from "react";
import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";

export default function _layout() {
  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Ubuntu-Regular": require("../assets/fonts/Ubuntu-Regular.ttf"),
    "Ubuntu-Medium": require("../assets/fonts/Ubuntu-Medium.ttf"),
    "Ubuntu-Light": require("../assets/fonts/Ubuntu-Light.ttf"),
    "Ubuntu-Italic": require("../assets/fonts/Ubuntu-Italic.ttf"),
    "Ubuntu-Bold": require("../assets/fonts/Ubuntu-Bold.ttf"),
    "Urbanist-Regular": require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-Light": require("../assets/fonts/Urbanist-Light.ttf"),
    "Urbanist-Italic": require("../assets/fonts/Urbanist-Italic.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
    "MoonDance-Regular": require("../assets/fonts/MoonDance-Regular.ttf"),
  });
  useEffect(() => {
    if (fontError) {
      console.error("Font loading error:", fontError);
    }
    if (fontsLoaded) {
      console.log("Fonts loaded successfully.");
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <OnlineStatusProvider>
          <Slot />
        </OnlineStatusProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
