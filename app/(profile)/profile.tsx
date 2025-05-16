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
  Animated,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import axiosInstance from "../../utils/axiosInstance";
import { LinearGradient } from "expo-linear-gradient";

interface UserData {
  name?: string;
  email?: string;
  profileImageUrl?: string;
  joinDate?: string;
}

interface ConnectionStats {
  totalContacts: number;
  pendingRequests: number;
  totalGroups: number;
}

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    totalContacts: 0,
    pendingRequests: 0,
    totalGroups: 0,
  });

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const avatarScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Screen dimensions
  const { width } = Dimensions.get("window");

  // Colors
  const primaryColor = "#0891b2"; // cyan-600
  const primaryDarkColor = "#0e7490"; // cyan-700
  const primaryLightColor = "#06b6d4"; // cyan-500
  const mutedTextColor = "#9ca3af"; // gray-400
  const backgroundColor = "#ecfeff"; // cyan-50
  const accentColor = "#ef4444"; // red-500
  const cardColor = "#ffffff"; // white

  // Animation for page load
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const userDataString = await AsyncStorage.getItem("user");
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);

          // Ensure we have a consistent profileImage property by mapping from profileImageUrl if needed
          if (parsedUserData.profileImageUrl && !parsedUserData.profileImage) {
            parsedUserData.profileImage = parsedUserData.profileImageUrl;
          }

          setUserData(parsedUserData);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
    fetchConnectionStats();
  }, []);

  const fetchConnectionStats = async () => {
    try {
      // Fetch contacts count
      const contactsResponse = await axiosInstance.get("/connections/contacts");
      const contactsCount = contactsResponse.data.success
        ? contactsResponse.data.data.length
        : 0;

      // Fetch pending requests count
      const requestsResponse = await axiosInstance.get("/connections/requests");
      const requestsCount = requestsResponse.data.success
        ? requestsResponse.data.data.length
        : 0;

      // Fetch group conversations count
      const groupsResponse = await axiosInstance.get(
        "/conversations?groupOnly=true"
      );
      const groupsCount =
        groupsResponse.data && Array.isArray(groupsResponse.data)
          ? groupsResponse.data.filter((group) => group.isGroupChat).length
          : 0;

      setConnectionStats({
        totalContacts: contactsCount,
        pendingRequests: requestsCount,
        totalGroups: groupsCount,
      });
    } catch (error) {
      console.error("Error fetching connection stats:", error);
    }
  };

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

  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permissions to upload your profile picture"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "You must be logged in to upload a profile image");
        return;
      }

      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : "image";

      // @ts-ignore
      formData.append("profileImage", {
        uri,
        name: filename,
        type,
      });
      console.log("Uploading image:", formData);
      const response = await axiosInstance.post(
        "/users/upload-profile-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Image upload response:");

      if (response.data && response.data.profileImageUrl) {
        // Update local user data
        const updatedUserData = {
          ...userData,
          profileImageUrl: response.data.profileImageUrl,
        };

        setUserData(updatedUserData);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUserData));

        Alert.alert("Success", "Profile image updated successfully");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error.message);
      Alert.alert("Error", "Failed to upload profile image");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-cyan-50"
        style={{ paddingTop: StatusBar.currentHeight }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={primaryLightColor} />
          <Text className="font-urbanist text-cyan-700 mt-4">
            Loading profile information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          My Profile
        </Text>
        <TouchableOpacity
          onPress={() => {
            fetchConnectionStats();
            Alert.alert("Refreshed", "Profile information refreshed");
          }}
          className="ml-auto bg-[#ecfeff] p-2 rounded-full shadow-sm"
          onPressIn={() => handlePressIn(buttonScale)}
          onPressOut={() => handlePressOut(buttonScale)}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Ionicons name="refresh" size={22} color={primaryColor} />
          </Animated.View>
        </TouchableOpacity>
      </LinearGradient>

      <Animated.ScrollView
        className="flex-1"
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}>
        {/* Profile Hero Section */}
        <LinearGradient
          colors={["#0891b2", "#06b6d4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="items-center pt-8 pb-12 px-6">
          <Animated.View
            style={{ transform: [{ scale: avatarScale }] }}
            className="mb-4">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={pickImage}
              onPressIn={() => handlePressIn(avatarScale)}
              onPressOut={() => handlePressOut(avatarScale)}>
              <View className="h-28 w-28 rounded-full overflow-hidden shadow-lg">
                {isUploading ? (
                  <View className="h-full w-full items-center justify-center bg-white/20 backdrop-blur-md">
                    <ActivityIndicator size="large" color="white" />
                  </View>
                ) : userData?.profileImageUrl ? (
                  <Image
                    source={{ uri: userData.profileImageUrl }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-28 w-28 rounded-full bg-white/20 backdrop-blur-md items-center justify-center">
                    <Ionicons name="person" size={56} color="white" />
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md">
                <Ionicons name="camera" size={18} color={primaryColor} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Text className="text-3xl font-urbanistBold text-white mb-1 text-center shadow-text">
            {userData?.name || "Your Name"}
          </Text>

          <View className="flex-row items-center mt-2 bg-white/20 rounded-full px-4 py-1.5 backdrop-blur-md">
            <View className="h-3 w-3 rounded-full mr-2 bg-green-400" />
            <Text className="text-sm font-urbanistMedium text-white">
              Online now
            </Text>
          </View>

          {userData?.joinDate && (
            <View className="flex-row items-center mt-3 bg-white/20 rounded-full px-3 py-1 backdrop-blur-md">
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text className="text-xs font-urbanist text-white ml-1">
                Joined
                {new Date(userData.joinDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Connection Stats */}
        <View className="flex-row justify-around items-center px-4 py-6 bg-white mb-4 rounded-t-3xl -mt-6 border-b border-gray-100">
          {/* Contacts */}
          <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() => router.push("/newconversation")}>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
                transform: [{ scale: buttonScale }],
              }}>
              <Text className="text-xl font-urbanistBold text-white">
                {connectionStats.totalContacts}
              </Text>
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Contacts
            </Text>
          </TouchableOpacity>

          {/* Groups */}
          <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() => router.push("/(home)/home")}>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
                transform: [{ scale: buttonScale }],
              }}>
              <Text className="text-xl font-urbanistBold text-white">
                {connectionStats.totalGroups}
              </Text>
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Groups
            </Text>
          </TouchableOpacity>

          {/* Requests */}
          <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() => router.push("/newconversation")}>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
                transform: [{ scale: buttonScale }],
              }}>
              <Text className="text-xl font-urbanistBold text-white">
                {connectionStats.pendingRequests}
              </Text>
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Requests
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Sections */}
        <View className="px-6 pb-8">
          {/* Personal Information Card */}
          <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <Text className="text-xl font-urbanistBold text-cyan-800 mb-4">
              Personal Information
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-urbanistBold text-gray-500 mb-1">
                Full Name
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={primaryColor}
                  className="mr-2"
                />
                <Text className="text-lg font-urbanist text-gray-800">
                  {userData?.name || "Not set"}
                </Text>
                <TouchableOpacity className="ml-auto">
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={primaryColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-urbanistBold text-gray-500 mb-1">
                Email Address
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={primaryColor}
                  className="mr-2"
                />
                <Text className="text-lg font-urbanist text-gray-800">
                  {userData?.email || "Not set"}
                </Text>
              </View>
            </View>
          </View> 
          {/* App Settings */}
          <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <Text className="text-xl font-urbanistBold text-cyan-800 mb-4">
              App Settings
            </Text>

            {/* Settings list items */}
            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                Notifications
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                Appearance
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => router.push("/(profile)/app-info")}>
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                App Info
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                Privacy & Security
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>
          </View>
          {/* Account */}
          <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <Text className="text-xl font-urbanistBold text-cyan-800 mb-4">
              Account
            </Text>

            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                Edit Profile
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-cyan-100 items-center justify-center">
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={primaryColor}
                />
              </View>
              <Text className="font-urbanistMedium text-gray-800 ml-4 flex-1">
                Help & Support
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={mutedTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={handleSignOut}>
              <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={accentColor}
                />
              </View>
              <Text className="font-urbanistMedium text-red-500 ml-4 flex-1">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View> 
          {/* App Version */}
          <TouchableOpacity
            className="items-center py-4"
            onPress={() => router.push("/(profile)/app-info")}>
            <Text className="font-urbanist text-cyan-600 text-sm">
              Together App Version 1.0.0
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
