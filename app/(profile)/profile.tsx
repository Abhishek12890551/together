import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserData {
  name?: string;
  email?: string;
  profileImage?: string;
  joinDate?: string;
}

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const backgroundColor = "#ecfeff";
  const primaryDarkColor = "#0891b2";
  const primaryColor = "#06b6d4";
  const mutedTextColor = "#9ca3af";
  const accentColor = "#ef4444";

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const userDataString = await AsyncStorage.getItem("user");
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          setUserData(parsedUserData);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");

            router.replace("/(auth)/signin");
          } catch (error) {
            console.error("Error signing out:", error);
            try {
              router.navigate("/(auth)/signin");
            } catch (navError) {
              console.error("Navigation error:", navError);
              Alert.alert(
                "Navigation Error",
                "Couldn't navigate to sign in screen. Please restart the app."
              );
            }
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-cyan-50">
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />
      <ScrollView className="flex-1">
        <View className="p-6 pt-10">
          {/* Header with back button */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity
              onPress={() => router.back()}
              className=" pl-2 pt-6 items-center justify-center">
              <Ionicons name="arrow-back" size={24} color={primaryDarkColor} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : (
            <>
              {/* Profile Photo */}
              <View className="items-center mb-8">
                <View className="w-36 h-36 rounded-full bg-cyan-100 border-4 border-white shadow items-center justify-center overflow-hidden">
                  {userData?.profileImage ? (
                    <Image
                      source={{ uri: userData.profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={80}
                      color={primaryDarkColor}
                    />
                  )}
                </View>
                <Text className="font-urbanistBold text-2xl text-cyan-800 mt-4">
                  {userData?.name || "User"}
                </Text>
                <Text className="font-urbanist text-gray-500">
                  {userData?.email || "No email provided"}
                </Text>
                {userData?.joinDate && (
                  <Text className="font-urbanist text-sm text-gray-500 mt-1">
                    Joined {new Date(userData.joinDate).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Profile Info Sections */}
              <View className="mb-8">
                <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
                  <View className="flex-row items-center mb-6">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="person-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <View className="ml-4">
                      <Text className="font-urbanistBold text-gray-800 ">
                        {userData?.name || "Not set"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="mail-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <View className="ml-4">
                      <Text className="font-urbanistBold text-gray-800">
                        {userData?.email || "Not set"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* App Settings */}
                <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
                  <Text className="font-urbanistBold text-lg text-cyan-800 mb-4">
                    App Settings
                  </Text>

                  <TouchableOpacity className="flex-row items-center py-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="notifications-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-gray-800 ml-4">
                      Notifications
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={mutedTextColor}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity className="flex-row items-center py-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="color-palette-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-gray-800 ml-4">
                      Appearance
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={mutedTextColor}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity className="flex-row items-center py-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="lock-closed-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-gray-800 ml-4">
                      Privacy & Security
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={mutedTextColor}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>
                </View>

                <View className="bg-white rounded-xl p-5 shadow-sm">
                  <Text className="font-urbanistBold text-lg text-cyan-800 mb-4">
                    Account
                  </Text>

                  <TouchableOpacity className="flex-row items-center py-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="create-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-gray-800 ml-4">
                      Edit Profile
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={mutedTextColor}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity className="flex-row items-center py-3">
                    <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                      <Ionicons
                        name="help-circle-outline"
                        size={22}
                        color={primaryDarkColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-gray-800 ml-4">
                      Help & Support
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={mutedTextColor}
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center py-3"
                    onPress={handleSignOut}>
                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                      <Ionicons
                        name="log-out-outline"
                        size={22}
                        color={accentColor}
                      />
                    </View>
                    <Text className="font-urbanistMedium text-red-500 ml-4">
                      Sign Out
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="items-center mb-10">
                <Text className="font-urbanist text-gray-500 text-sm">
                  App Version 1.0.0
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
