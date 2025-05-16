import "../global.css";
import React, { useEffect } from "react";
import { Slot, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleAuthAndNavigation = async () => {
      if (!isLoading) {
        if (!token) {
          router.replace("/welcome");
        }
        await SplashScreen.hideAsync();
      }
    };

    handleAuthAndNavigation();
  }, [isLoading, token, router]);

  if (isLoading) {
    return null;
  }

  return <Slot />;
}

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
      // Optionally hide splash screen here if fonts fail critically,
      // though usually you'd want to show an error UI instead.
      // SplashScreen.hideAsync();
    }
    if (fontsLoaded) {
      console.log("Fonts loaded successfully.");
      // Don't hide splash screen here yet, wait for auth in RootLayoutNav
    }
    // If fonts are still loading, SplashScreen.preventAutoHideAsync() keeps it visible.
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    // While fonts are loading, _layout returns null,
    // and SplashScreen (kept visible by preventAutoHideAsync) remains.
    return null;
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <OnlineStatusProvider>
          <RootLayoutNav />
        </OnlineStatusProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
