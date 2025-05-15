import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import axiosInstance from "../../utils/axiosInstance";
import { useSocket } from "../contexts/SocketContext";
import { LinearGradient } from "expo-linear-gradient";

interface ContactData {
  _id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  joinDate?: string;
  isOnline?: boolean;
  lastOnline?: string;
}

export default function ContactProfile() {
  const router = useRouter();
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, onlineUsers } = useSocket();
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animated values for interactive elements
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
    const fetchContactData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!contactId) {
          setError("No contact ID provided");
          setIsLoading(false);
          return;
        }

        const response = await axiosInstance.get(`/users/contact/${contactId}`);

        if (response.data.success) {
          setContactData(response.data.data);

          if (socket?.connected) {
            socket.emit("getParticipantStatus", {
              targetUserId: contactId,
              conversationId: "profile-view",
            });
          }
        } else {
          setError(
            response.data.message || "Failed to load contact information"
          );
        }
      } catch (err) {
        console.error("Error fetching contact data:", err);
        setError("An error occurred while loading contact information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactData();
  }, [contactId, socket]);

  useEffect(() => {
    if (!socket || !contactId) return;

    const handleParticipantStatus = (data: any) => {
      if (data.userId === contactId) {
        setContactData((prev) =>
          prev
            ? {
                ...prev,
                isOnline: data.isOnline,
              }
            : null
        );
      }
    };

    socket.on("participantStatus", handleParticipantStatus);
    socket.on("userOnline", (data) => {
      if (data.userId === contactId) {
        setContactData((prev) =>
          prev
            ? {
                ...prev,
                isOnline: true,
              }
            : null
        );
      }
    });

    socket.on("userOffline", (data) => {
      if (data.userId === contactId) {
        setContactData((prev) =>
          prev
            ? {
                ...prev,
                isOnline: false,
                lastOnline: new Date().toISOString(),
              }
            : null
        );
      }
    });

    return () => {
      socket.off("participantStatus", handleParticipantStatus);
      socket.off("userOnline");
      socket.off("userOffline");
    };
  }, [socket, contactId]);

  useEffect(() => {
    if (contactId && contactData) {
      const isUserOnline = onlineUsers.has(contactId);
      if (contactData.isOnline !== isUserOnline) {
        setContactData((prev) =>
          prev
            ? {
                ...prev,
                isOnline: isUserOnline,
              }
            : null
        );
      }
    }
  }, [onlineUsers, contactId]);

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

  const refreshContactStatus = () => {
    if (socket?.connected && contactId) {
      socket.emit("getParticipantStatus", {
        targetUserId: contactId,
        conversationId: "profile-view",
      });
      Alert.alert("Refreshing", "Contact status refreshed");
    }
  };

  const formatLastOnline = (lastOnlineDate: string) => {
    const now = new Date();
    const lastOnline = new Date(lastOnlineDate);
    const diffInSeconds = Math.floor(
      (now.getTime() - lastOnline.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${
        minutes === 1 ? "minute" : "minutes"
      } ago`.toLowerCase();
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`.toLowerCase();
    } else if (diffInSeconds < 172800) {
      return "Yesterday";
    } else {
      return lastOnline.toLocaleDateString();
    }
  };

  const startConversation = () => {
    if (!contactId) return;

    router.push(`/new?recipientId=${contactId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-cyan-50"
        style={{ paddingTop: StatusBar.currentHeight }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={primaryLightColor} />
          <Text className="font-urbanist text-cyan-700 mt-4">
            Loading contact information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !contactData) {
    return (
      <SafeAreaView
        className="flex-1 bg-cyan-50"
        style={{ paddingTop: StatusBar.currentHeight }}>
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
          <Text className="text-xl font-urbanistBold text-cyan-700">Error</Text>
        </LinearGradient>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-red-600 text-lg font-urbanistMedium mb-4">
            {error || "Contact not found"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-cyan-600 px-6 py-2 rounded-lg">
            <Text className="text-white font-urbanistMedium">Go Back</Text>
          </TouchableOpacity>
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
          Contact Profile
        </Text>
        <TouchableOpacity
          onPress={refreshContactStatus}
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
        {/* Contact Profile Hero Section */}
        <LinearGradient
          colors={["#0891b2", "#06b6d4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="items-center pt-8 pb-12 px-6">
          <Animated.View
            style={{ transform: [{ scale: avatarScale }] }}
            className="mb-4">
            <View className="h-28 w-28 rounded-full overflow-hidden shadow-lg">
              {contactData.profileImageUrl ? (
                <Image
                  source={{ uri: contactData.profileImageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                  defaultSource={require("../../assets/images/logo-placeholder.png")}
                />
              ) : (
                <View className="h-28 w-28 rounded-full bg-white/20 backdrop-blur-md items-center justify-center">
                  <Ionicons name="person" size={56} color="white" />
                </View>
              )}
            </View>
          </Animated.View>

          <Text className="text-3xl font-urbanistBold text-white mb-1 text-center shadow-text">
            {contactData.name}
          </Text>

          <View className="flex-row items-center mt-2 bg-white/20 rounded-full px-4 py-1.5 backdrop-blur-md">
            <View
              className={`h-3 w-3 rounded-full mr-2 ${
                contactData.isOnline ? "bg-green-400" : "bg-gray-300"
              }`}
            />
            <Text className="text-sm font-urbanistMedium text-white">
              {contactData.isOnline
                ? "Online now"
                : contactData.lastOnline
                ? `Last seen ${formatLastOnline(contactData.lastOnline)}`
                : "Offline"}
            </Text>
          </View>

          {contactData.joinDate && (
            <View className="flex-row items-center mt-3 bg-white/20 rounded-full px-3 py-1 backdrop-blur-md">
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text className="text-xs font-urbanist text-white ml-1">
                Joined 
                {new Date(contactData.joinDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Action Buttons */}
        <View className="flex-row justify-around items-center px-4 py-6 bg-white mb-4 rounded-t-3xl -mt-6 border-b border-gray-100">
            <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() => {
              if (!contactId) return;
              router.push(`/(conversation)/${contactId}`);
            }}>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
              transform: [{ scale: buttonScale }],
              }}>
              <Ionicons name="chatbubble-outline" size={28} color="white" />
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Message
            </Text>
            </TouchableOpacity>

          <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Video call feature will be available soon"
              )
            }>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
                transform: [{ scale: buttonScale }],
              }}>
              <Ionicons name="videocam-outline" size={28} color="white" />
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Video Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center flex-1 mx-2"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Voice call feature will be available soon"
              )
            }>
            <Animated.View
              className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
              style={{
                transform: [{ scale: buttonScale }],
              }}>
              <Ionicons name="call-outline" size={28} color="white" />
            </Animated.View>
            <Text className="text-sm font-urbanistBold text-cyan-700">
              Voice Call
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <Text className="text-xl font-urbanistBold text-cyan-800 mb-4">
              Contact Information
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-urbanistBold text-gray-500 mb-1">
                Email
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={primaryColor}
                  className="mr-2"
                />
                <Text className="text-lg font-urbanist text-gray-800">
                  {contactData.email}
                </Text>
              </View>
            </View>

            {contactData.joinDate && (
              <View>
                <Text className="text-sm font-urbanistBold text-gray-500 mb-1">
                  Member Since
                </Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={primaryColor}
                    className="mr-2"
                  />
                  <Text className="text-lg font-urbanist text-gray-800">
                    {new Date(contactData.joinDate).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Additional sections could go here in the future */}
          <View className="bg-white rounded-2xl shadow-sm p-6">
            <Text className="text-xl font-urbanistBold text-cyan-800 mb-4">
              Shared Content
            </Text>
            <View className="items-center justify-center py-6">
              <Ionicons name="images-outline" size={48} color="#CBD5E1" />
              <Text className="text-gray-400 font-urbanistMedium mt-2">
                No shared content yet
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
