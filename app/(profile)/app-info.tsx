import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Linking,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function AppInfo() {
  const router = useRouter();

  const [fadeAnim] = useState(new Animated.Value(0));
  const buttonScale = useRef(new Animated.Value(1)).current;

  const primaryColor = "#0891b2"; // cyan-600
  const mutedTextColor = "#9ca3af"; // gray-400
  const linkColor = "#0891b2"; // cyan-600

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePressIn = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (animatedValue: Animated.Value) => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Error opening URL:", err)
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-cyan-50"
      style={{ paddingTop: StatusBar.currentHeight }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      {/* Custom header with gradient */}
      <LinearGradient
        colors={["#ecfeff", "#cffafe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="p-4 flex-row items-center border-b border-cyan-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 bg-[#ecfeff] p-2 rounded-full shadow-sm"
          onPressIn={() => handlePressIn(buttonScale)}
          onPressOut={() => handlePressOut(buttonScale)}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Ionicons name="arrow-back" size={22} color={primaryColor} />
          </Animated.View>
        </TouchableOpacity>
        <Text className="text-xl font-urbanistBold text-cyan-700">
          App Information
        </Text>
      </LinearGradient>
      <Animated.ScrollView
        className="flex-1"
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}>
        {/* App Logo Section - Full-width text-based logo with improved design */}
        <LinearGradient
          colors={["#0891b2", "#0e7490"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-12 items-center justify-center shadow-lg">
          <Text className="text-white font-urbanistBold text-5xl tracking-wider">
            Together
          </Text>
          <Text className="text-cyan-100 font-urbanistMedium mt-2">
            Connect • Share • Collaborate
          </Text>
        </LinearGradient>
        {/* App Details Section */}
        <View className="px-6 pb-6 mt-8">
          <View className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-cyan-100">
            <View className="flex-row items-center mb-6 border-b border-cyan-100 pb-3">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center mr-3">
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={primaryColor}
                />
              </View>
              <Text className="text-2xl font-urbanistBold text-cyan-800">
                App Details
              </Text>
            </View>
            {/* App Name */}
            <View className="mb-5 bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-1">
                APP NAME
              </Text>
              <Text className="text-xl font-urbanistBold text-gray-800">
                Together
              </Text>
            </View>
            {/* Version Number */}
            <View className="mb-5 bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-1">
                VERSION
              </Text>
              <Text className="text-xl font-urbanistMedium text-gray-800">
                1.0.0 (Build 2025.05.16)
              </Text>
            </View>
            {/* Description */}
            <View className="mb-5 bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-2">
                DESCRIPTION
              </Text>
              <Text className="text-base font-urbanistMedium leading-6 text-gray-800">
                Together is a comprehensive communications platform designed to
                connect distant family members through messaging, event
                planning, and task management. It provides tools for keeping
                families connected regardless of physical distance, helping
                loved ones stay organized and maintain meaningful relationships.
              </Text>
            </View>
            {/* Key Features */}
            <View className="mb-5 bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-4">
                KEY FEATURES
              </Text>
              <View className="space-y-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                    <Ionicons
                      name="chatbubbles-outline"
                      size={18}
                      color={primaryColor}
                    />
                  </View>
                  <Text className="text-base font-urbanistMedium text-gray-800 flex-1">
                    Real-time messaging and group chats
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                    <Ionicons
                      name="people-outline"
                      size={18}
                      color={primaryColor}
                    />
                  </View>
                  <Text className="text-base font-urbanistMedium text-gray-800 flex-1">
                    Contact management system
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={primaryColor}
                    />
                  </View>
                  <Text className="text-base font-urbanistMedium text-gray-800 flex-1">
                    Event scheduling and coordination
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color={primaryColor}
                    />
                  </View>
                  <Text className="text-base font-urbanistMedium text-gray-800 flex-1">
                    To-do list and task management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={primaryColor}
                    />
                  </View>
                  <Text className="text-base font-urbanistMedium text-gray-800 flex-1">
                    Personal schedule management
                  </Text>
                </View>
              </View>
            </View>
            {/* Release Date */}
            <View className="bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-2">
                RELEASE DATE / LAST UPDATED
              </Text>
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                  <Ionicons
                    name="rocket-outline"
                    size={18}
                    color={primaryColor}
                  />
                </View>
                <Text className="text-base font-urbanistMedium text-gray-800">
                  Released: April 15, 2025
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={primaryColor}
                  />
                </View>
                <Text className="text-base font-urbanistMedium text-gray-800">
                  Last Updated: May 16, 2025
                </Text>
              </View>
            </View>
          </View>
          {/* Developer Info */}
          <View className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-cyan-100">
            <View className="flex-row items-center mb-6 border-b border-cyan-100 pb-3">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center mr-3">
                <Ionicons name="code-slash" size={22} color={primaryColor} />
              </View>
              <Text className="text-2xl font-urbanistBold text-cyan-800">
                Developer Information
              </Text>
            </View>
            {/* Developer Name */}
            <View className="mb-5 bg-cyan-50 p-4 rounded-lg">
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-1">
                DEVELOPER
              </Text>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={primaryColor}
                  />
                </View>
                <Text className="text-xl font-urbanistMedium text-gray-800">
                  Abhishek Kumar
                </Text>
              </View>
            </View>
            {/* Contact Email */}
            <TouchableOpacity
              className="mb-5 bg-cyan-50 p-4 rounded-lg"
              onPress={() => openLink("mailto:mintu12890551@gmail.com")}>
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-1">
                CONTACT EMAIL
              </Text>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={primaryColor}
                  />
                </View>
                <Text className="text-lg font-urbanistMedium text-cyan-600 underline">
                  mintu12890551@gmail.com
                </Text>
              </View>
            </TouchableOpacity>
            {/* Social Media Links */}
            <TouchableOpacity
              className="bg-cyan-50 p-4 rounded-lg"
              onPress={() =>
                openLink(
                  "https://www.linkedin.com/in/abhishek-kumar-810063260/"
                )
              }>
              <Text className="text-sm font-urbanistBold text-cyan-700 mb-1">
                LINKEDIN PROFILE
              </Text>
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-[#0077B5] items-center justify-center mr-3">
                  <Ionicons name="logo-linkedin" size={18} color="white" />
                </View>
                <Text className="font-urbanistMedium text-cyan-600 text-lg">
                  Abhishek Kumar
                </Text>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={primaryColor}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </TouchableOpacity>
          </View>
          {/* Legal Information */}
          <View className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-cyan-100">
            <View className="flex-row items-center mb-6 border-b border-cyan-100 pb-3">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center mr-3">
                <Ionicons name="document-text" size={22} color={primaryColor} />
              </View>
              <Text className="text-2xl font-urbanistBold text-cyan-800">
                Legal Information
              </Text>
            </View>

            <TouchableOpacity className="flex-row items-center px-4 py-4 bg-cyan-50 rounded-lg mb-3">
              <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                <Ionicons
                  name="reader-outline"
                  size={18}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 flex-1 text-base">
                Terms of Service
              </Text>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center px-4 py-4 bg-cyan-50 rounded-lg mb-3">
              <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                <Ionicons
                  name="shield-outline"
                  size={18}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 flex-1 text-base">
                Privacy Policy
              </Text>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center px-4 py-4 bg-cyan-50 rounded-lg">
              <View className="w-8 h-8 rounded-full bg-cyan-200 items-center justify-center mr-3">
                <Ionicons name="code-slash" size={18} color={primaryColor} />
              </View>
              <Text className="font-urbanistMedium text-gray-800 flex-1 text-base">
                Open Source Licenses
              </Text>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </TouchableOpacity>
          </View>
          {/* Copyright */}
          <View className="w-full py-6 items-center justify-center mt-8 mb-4">
            <Text className="font-urbanistBold text-cyan-700 text-center mb-1 text-lg">
              © 2025 Together
            </Text>
            <Text className="font-urbanist text-gray-500 text-sm text-center">
              All Rights Reserved.
            </Text>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
