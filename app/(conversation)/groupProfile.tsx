import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
// Add FontAwesome5 for crown icon
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import axiosInstance from "../../utils/axiosInstance";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

interface Participant {
  _id: string;
  name: string;
  profileImageUrl?: string;
  isOnline?: boolean;
  lastOnline?: string;
  email?: string;
}

interface GroupData {
  _id: string;
  groupName: string;
  participants: Participant[];
  groupAdmin: Participant | string; // Can be either a Participant object or just the admin's ID as string
  createdAt: string;
  isGroupChat: boolean;
  groupImageUrl?: string;
  messages?: any[];
}

export default function GroupProfile() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user: authUser } = useAuth();
  const { socket, isConnected } = useSocket();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineParticipants, setOnlineParticipants] = useState<string[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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
    const fetchGroupData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get(`/conversations/${groupId}`);

        // The server returns the conversation object directly, not wrapped in a success/data structure
        if (response.data) {
          const groupInfo = response.data; // Check if the current user is the group admin
          // Handle both cases: when groupAdmin is an object and when it's just an ID string
          if (groupInfo.groupAdmin) {
            const adminId =
              typeof groupInfo.groupAdmin === "object"
                ? groupInfo.groupAdmin._id
                : groupInfo.groupAdmin;

            if (adminId === authUser?.id) {
              setIsUserAdmin(true);
            }
          }

          setGroupData(groupInfo);

          // Add current user to online participants immediately
          if (authUser?.id) {
            setOnlineParticipants((prev) => {
              if (prev.includes(authUser.id)) return prev;
              return [...prev, authUser.id];
            });
          }

          // After a short delay, refresh the online status of all participants
          setTimeout(() => {
            refreshOnlineStatus();
          }, 1000);
        } else {
          throw new Error("No data returned from server");
        }
      } catch (error) {
        console.error("Error fetching group data:", error);

        // Implement retry mechanism (max 3 attempts)
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 2000);
        } else {
          Alert.alert(
            "Error Loading Group",
            "We couldn't load the group information. Please try again later.",
            [
              {
                text: "Try Again",
                onPress: () => {
                  setRetryCount(0);
                },
              },
              {
                text: "Go Back",
                onPress: () => router.back(),
                style: "cancel",
              },
            ]
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupData();
  }, [groupId, authUser, retryCount]);
  useEffect(() => {
    if (socket && isConnected && groupId) {
      // Join the conversation room to get updates
      socket.emit("joinConversation", groupId);

      console.log(
        "[GroupProfile] Connected to socket, requesting online status for members"
      );

      // Handle online status updates
      const handleUserOnline = (data: {
        userId: string;
        userName?: string;
      }) => {
        console.log(
          `[GroupProfile] User online event received: ${data.userId} (${
            data.userName || "unknown"
          })`
        );

        // Add to online participants if not already there
        setOnlineParticipants((prev) => {
          if (prev.includes(data.userId)) return prev;
          console.log(
            `[GroupProfile] Adding ${data.userId} to online participants`
          );
          return [...prev, data.userId];
        });
      };

      const handleUserOffline = (data: {
        userId: string;
        userName?: string;
      }) => {
        console.log(
          `[GroupProfile] User offline event received: ${data.userId} (${
            data.userName || "unknown"
          })`
        );

        setOnlineParticipants((prev) => {
          if (!prev.includes(data.userId)) return prev;
          console.log(
            `[GroupProfile] Removing ${data.userId} from online participants`
          );
          return prev.filter((id) => id !== data.userId);
        });
      };

      // Get initial online participants
      const handleParticipantsStatus = (data: {
        conversationId: string;
        onlineParticipants: { userId: string }[];
      }) => {
        if (data.conversationId === groupId) {
          const onlineIds = data.onlineParticipants.map((p) => p.userId);
          console.log(
            `[GroupProfile] Received participants status for ${groupId}:`,
            onlineIds
          );
          setOnlineParticipants(onlineIds);

          // Also mark current user as online if not included
          if (authUser?.id && !onlineIds.includes(authUser.id)) {
            console.log(
              `[GroupProfile] Adding current user to online participants`
            );
            setOnlineParticipants((prev) => [...prev, authUser.id]);
          }
        }
      };

      // Added a handler for individual status updates that might be sent differently
      const handleParticipantStatus = (data: {
        userId: string;
        isOnline: boolean;
        userName?: string;
      }) => {
        console.log(
          `[GroupProfile] Received individual status update for ${
            data.userId
          }: ${data.isOnline ? "online" : "offline"}`
        );

        if (data.isOnline) {
          setOnlineParticipants((prev) => {
            if (prev.includes(data.userId)) return prev;
            return [...prev, data.userId];
          });
        } else {
          setOnlineParticipants((prev) =>
            prev.filter((id) => id !== data.userId)
          );
        }
      };

      socket.on("userOnline", handleUserOnline);
      socket.on("userOffline", handleUserOffline);
      socket.on("conversationParticipantsStatus", handleParticipantsStatus);
      socket.on("participantStatus", handleParticipantStatus);

      // Request participants status
      setTimeout(() => {
        console.log(
          `[GroupProfile] Requesting conversation participants status for ${groupId}`
        );
        socket.emit("getConversationParticipantsStatus", {
          conversationId: groupId,
        });
      }, 500); // Small delay to ensure everything is ready

      return () => {
        socket.emit("leaveConversation", groupId);
        socket.off("userOnline", handleUserOnline);
        socket.off("userOffline", handleUserOffline);
        socket.off("conversationParticipantsStatus", handleParticipantsStatus);
        socket.off("participantStatus", handleParticipantStatus);
      };
    }
  }, [socket, isConnected, groupId]);

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

  const handleLeaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            // Show loading animation while request is processing
            setIsLoading(true);

            const response = await axiosInstance.post(
              `/conversations/leave-group`,
              {
                conversationId: groupId,
              }
            );

            if (response.data && response.data.success) {
              Alert.alert("Success", "You have left the group");
              router.back();
            } else {
              Alert.alert(
                "Error",
                response.data?.message || "Failed to leave group"
              );
            }
          } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert(
              "Error",
              "An error occurred while trying to leave the group"
            );
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleRemoveParticipant = (participantId: string, name: string) => {
    if (!isUserAdmin) return;

    Alert.alert(
      "Remove Participant",
      `Are you sure you want to remove ${name} from the group?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axiosInstance.post(
                `/conversations/remove-participant`,
                {
                  conversationId: groupId,
                  participantId,
                }
              );

              if (response.data && response.data.success) {
                // Update local state to remove participant
                setGroupData((prevData) => {
                  if (!prevData) return null;
                  return {
                    ...prevData,
                    participants: prevData.participants.filter(
                      (p) => p._id !== participantId
                    ),
                  };
                });

                Alert.alert(
                  "Success",
                  `${name} has been removed from the group`
                );
              } else {
                Alert.alert(
                  "Error",
                  response.data?.message || "Failed to remove participant"
                );
              }
            } catch (error) {
              console.error("Error removing participant:", error);
              Alert.alert(
                "Error",
                "An error occurred while trying to remove the participant"
              );
            }
          },
        },
      ]
    );
  };

  // Function to handle group image pick and upload
  const pickAndUploadGroupImage = async () => {
    // Only admin can update the group image
    if (!isUserAdmin) {
      Alert.alert(
        "Permission Denied",
        "Only group admins can update the group image"
      );
      return;
    }

    try {
      // Request media library permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your media library to update the group image"
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
        uploadGroupImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadGroupImage = async (uri: string) => {
    try {
      setIsLoading(true);

      // Create form data for the image
      const formData = new FormData();
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : "image";

      // @ts-ignore
      formData.append("groupImage", {
        uri,
        name: filename,
        type,
      });

      formData.append("conversationId", groupId as string);

      // Upload to the server
      const response = await axiosInstance.post(
        "/conversations/update-group-image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.success) {
        // Update local group data with new image
        setGroupData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            groupImageUrl: response.data.groupImageUrl,
          };
        });

        Alert.alert("Success", "Group image updated successfully");
      } else {
        Alert.alert("Error", "Failed to update group image");
      }
    } catch (error: unknown) {
      console.error("Error uploading group image:", error);
      let errorMessage = "Failed to upload group image";

      if (error && typeof error === "object") {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  // Function to refresh online status
  const refreshOnlineStatus = () => {
    if (!socket || !isConnected || !groupId) return;

    console.log(
      `[GroupProfile] Manually refreshing online status for ${groupId}`
    );

    // Make current user as online (they must be since they're using the app)
    if (authUser?.id) {
      setOnlineParticipants((prev) => {
        if (prev.includes(authUser.id)) return prev;
        return [...prev, authUser.id];
      });
    }

    // Request updated status from the server
    socket.emit("getConversationParticipantsStatus", {
      conversationId: groupId,
    });

    // For each member, also try to get individual status
    if (groupData?.participants) {
      groupData.participants.forEach((participant) => {
        if (participant._id !== authUser?.id) {
          // Skip self
          socket.emit("getParticipantStatus", {
            targetUserId: participant._id,
            conversationId: groupId,
          });
        }
      });
    }
  };

  const renderParticipantItem = ({
    item,
    index,
  }: {
    item: Participant;
    index: number;
  }) => {
    // If it's the current user, always show as online
    const isOnline =
      item._id === authUser?.id ? true : onlineParticipants.includes(item._id);

    // Handle both cases: when groupAdmin is an object and when it's just an ID string
    const adminId =
      groupData?.groupAdmin && typeof groupData.groupAdmin === "object"
        ? groupData.groupAdmin._id
        : groupData?.groupAdmin;

    const isAdmin = adminId === item._id;
    const isSelf = item._id === authUser?.id;

    return (
      <View className="mb-2 mx-2">
        <View
          className={`flex-row justify-between items-center py-4 px-4 ${
            isAdmin
              ? "bg-gradient-to-r from-cyan-50 to-amber-50/50"
              : "bg-white"
          } rounded-2xl `}
          style={{
            borderLeftWidth: isAdmin ? 3 : 0,
            borderLeftColor: isAdmin ? "#f59e0b" : "transparent",
          }}>
          <View className="flex-row items-center flex-1">
            <View className="relative">
              {item.profileImageUrl ? (
                <Image
                  source={{ uri: item.profileImageUrl }}
                  className={`h-14 w-14 rounded-full ${
                    isAdmin
                      ? "border-2 border-cyan-500"
                      : "border-1 border-white"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                />
              ) : (
                <LinearGradient
                  colors={
                    isAdmin ? ["#0891b2", "#0284c7"] : ["#06b6d4", "#0891b2"]
                  }
                  className="h-14 w-14 rounded-full items-center justify-center">
                  <Text className="font-urbanistBold text-xl text-white">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {/* Add crown icon for admin at the top of avatar */}
              {isAdmin && (
                <View className="absolute -top-2 -right-1 bg-amber-400 rounded-full h-6 w-6 items-center justify-center border-2 border-white">
                  <FontAwesome5 name="crown" size={12} color="white" />
                </View>
              )}
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text
                  className={`font-urbanistBold text-base ${
                    isAdmin ? "text-cyan-700" : "text-gray-800"
                  }`}>
                  {item.name.split(" ")[0]} {isSelf ? "(You)" : ""}
                </Text>
                {isAdmin && (
                  <View className="ml-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full px-3 py-1 flex-row items-center">
                    <FontAwesome5 name="crown" size={10} color="white" />
                    <Text className="text-xs font-urbanistBold text-red-500 ml-1">
                      Admin
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm font-urbanist text-gray-500">
                {isOnline ? "Online now" : "Offline"}
              </Text>
            </View>
          </View>

          {isUserAdmin && !isSelf && (
            <TouchableOpacity
              onPress={() => handleRemoveParticipant(item._id, item.name)}
              className="p-2 bg-red-50 rounded-full">
              <Ionicons
                name="remove-circle-outline"
                size={22}
                color={accentColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
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
          Group Details
        </Text>
        <TouchableOpacity
          onPress={refreshOnlineStatus}
          className="ml-auto bg-[#ecfeff] p-2 rounded-full shadow-sm"
          onPressIn={() => handlePressIn(buttonScale)}
          onPressOut={() => handlePressOut(buttonScale)}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Ionicons name="refresh" size={22} color={primaryColor} />
          </Animated.View>
        </TouchableOpacity>
      </LinearGradient>
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={primaryLightColor} />
          <Text className="font-urbanist text-cyan-700 mt-4">
            Loading group information...
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          className="flex-1"
          style={{ opacity: fadeAnim }}
          showsVerticalScrollIndicator={false}>
          {/* Group Profile Hero Section */}
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
                onPressIn={() => handlePressIn(avatarScale)}
                onPressOut={() => handlePressOut(avatarScale)}
                onPress={isUserAdmin ? pickAndUploadGroupImage : undefined}>
                <View className="h-28 w-28 rounded-full overflow-hidden shadow-lg">
                  {groupData?.groupImageUrl ? (
                    <Image
                      source={{ uri: groupData.groupImageUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-28 w-28 rounded-full bg-white/20 backdrop-blur-md items-center justify-center">
                      <Ionicons name="people" size={56} color="white" />
                    </View>
                  )}
                </View>
                {isUserAdmin && (
                  <View className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md">
                    <Ionicons name="camera" size={18} color={primaryColor} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text className="text-3xl font-urbanistBold text-white mb-1 text-center shadow-text">
              {groupData?.groupName || "Group Chat"}
            </Text>

            <View className="flex-row items-center">
              <View className="flex-row -space-x-2 mr-2">
                {groupData?.participants
                  .slice(0, 3)
                  .map((participant, index) => (
                    <View
                      key={participant._id}
                      className="border-2 border-cyan-600 rounded-full overflow-hidden"
                      style={{ zIndex: 3 - index }}>
                      {participant.profileImageUrl ? (
                        <Image
                          source={{ uri: participant.profileImageUrl }}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <View className="h-6 w-6 rounded-full bg-cyan-200 items-center justify-center">
                          <Text className="text-xs font-urbanistBold text-cyan-700">
                            {participant.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
              </View>
              <Text className="text-sm font-urbanistMedium text-white">
                {groupData?.participants.length || 0} members
              </Text>
            </View>

            <View className="flex-row items-center mt-3 bg-white/20 rounded-full px-3 py-1 backdrop-blur-md">
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text className="text-xs font-urbanist text-white ml-1">
                Created
                {groupData?.createdAt
                  ? new Date(groupData.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </Text>
            </View>
          </LinearGradient>
          {/* Action Buttons with flat design and enhanced styling */}
          <View className="flex-row justify-around items-center px-4 py-6 bg-white mb-4 rounded-t-3xl -mt-6 border-b border-gray-100">
            {isUserAdmin && (
              <TouchableOpacity
                className="items-center flex-1 mx-2"
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
                onPress={() =>
                  Alert.alert(
                    "Coming Soon",
                    "Edit group feature will be available soon"
                  )
                }>
                <Animated.View
                  className="w-16 h-16 rounded-full bg-cyan-500 items-center justify-center mb-2 border-2 border-cyan-200"
                  style={{
                    transform: [{ scale: buttonScale }],
                  }}>
                  <Ionicons name="create" size={28} color="white" />
                </Animated.View>
                <Text className="text-sm font-urbanistBold text-cyan-700">
                  Edit Group
                </Text>
              </TouchableOpacity>
            )}
            {isUserAdmin && (
              <TouchableOpacity
                className="items-center flex-1 mx-2"
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
                onPress={() =>
                  Alert.alert(
                    "Coming Soon",
                    "Add people feature will be available soon"
                  )
                }>
                <Animated.View
                  className="w-16 h-16 rounded-full bg-green-500 items-center justify-center mb-2 border-2 border-green-200"
                  style={{
                    transform: [{ scale: buttonScale }],
                  }}>
                  <Ionicons name="person-add" size={28} color="white" />
                </Animated.View>
                <Text className="text-sm font-urbanistBold text-green-700">
                  Add People
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Leave Group Button as text button with icon */}
          <TouchableOpacity
            className="mx-4 mb-6 flex-row items-center justify-center bg-orange-100 py-4 rounded-xl border-2 border-orange-200"
            onPressIn={() => handlePressIn(buttonScale)}
            onPressOut={() => handlePressOut(buttonScale)}
            onPress={handleLeaveGroup}>
            <Animated.View
              style={{ transform: [{ scale: buttonScale }] }}
              className="flex-row items-center">
              <Ionicons name="exit" size={22} color="#f97316" />
              <Text className="text-base font-urbanistBold text-orange-600 ml-2">
                Leave This Group
              </Text>
            </Animated.View>
          </TouchableOpacity>
          {/* Participants Section */}
          <View className="bg-white rounded-3xl mx-4 border border-gray-100 mb-6">
            <View className="p-5 border-b border-gray-100 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Text className="text-lg font-urbanistBold text-cyan-700">
                  Group Members
                </Text>
                <View className="ml-2 bg-green-100 px-2 py-1 rounded-full flex-row items-center">
                  <View className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                  <Text className="text-xs font-urbanistMedium text-green-700">
                    {onlineParticipants.length} online
                  </Text>
                </View>
              </View>
              <View className="bg-cyan-100 px-3 py-1 rounded-full">
                <Text className="text-sm font-urbanistMedium text-cyan-700">
                  {groupData?.participants.length || 0} members
                </Text>
              </View>
            </View>

            {groupData?.participants && groupData.participants.length > 0 ? (
              <View className="py-2">
                <FlatList
                  data={groupData.participants}
                  renderItem={renderParticipantItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false} // Let the parent ScrollView handle scrolling
                  ItemSeparatorComponent={() => <View className="h-1" />}
                />
              </View>
            ) : (
              <View className="p-6 items-center">
                <Ionicons
                  name="alert-circle-outline"
                  size={36}
                  color={mutedTextColor}
                />
                <Text className="text-base font-urbanist text-gray-500 mt-2">
                  No participants found
                </Text>
              </View>
            )}
          </View>
          {/* Group privacy section */}
          <View className="bg-white rounded-3xl mx-4 shadow-md mb-6 p-5">
            <View className="flex-row items-center mb-4">
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={primaryColor}
              />
              <Text className="text-lg font-urbanistBold text-cyan-700 ml-2">
                Group Privacy
              </Text>
            </View>
            <View className="bg-cyan-50 rounded-xl p-4">
              <Text className="font-urbanist text-gray-700">
                Only group members can send and receive messages in this group.
                {isUserAdmin
                  ? " As admin, you can add or remove members."
                  : " Only the admin can add or remove members."}
              </Text>
            </View>
          </View>
          {/* Bottom spacing */}
          <View className="h-10" />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}
