import { Tabs } from "expo-router/tabs";
import React from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const primaryColor = "#0891b2"; // cyan-600
  const inactiveColor = "#6b7280"; // gray-500
  const backgroundColor = "#ecfeff"; // cyan-50
  // const headerTextColor = "#1f2937"; // gray-800

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        backgroundColor={backgroundColor}
        barStyle="dark-content"
        translucent={false}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: inactiveColor,
          headerShown: false,
          tabBarStyle: { backgroundColor: backgroundColor },
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={
                  focused
                    ? "chatbubble-ellipses"
                    : "chatbubble-ellipses-outline"
                }
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}
