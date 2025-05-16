import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "./contexts/AuthContext";
import CreateGroupModal from "../components/CreateGroupModal";
import { LinearGradient } from "expo-linear-gradient";

interface User {
  _id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

interface ConnectionRequest {
  _id: string;
  from: User;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export default function NewConversation() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<User[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<
    ConnectionRequest[]
  >([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingRequestStates, setLoadingRequestStates] = useState<
    Record<string, boolean>
  >({});
  const [respondingToRequest, setRespondingToRequest] = useState<
    Record<string, boolean>
  >({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const { width } = Dimensions.get("window");

  // Colors
  const primaryColor = "#06b6d4"; // Cyan-500
  const primaryDarkColor = "#0891b2"; // Cyan-600
  const mutedTextColor = "#9ca3af"; // Gray-400
  const backgroundColor = "#ecfeff"; // Cyan-50
  const accentColor = "#ef4444"; // Red-500
  const lightBgClass = "bg-white/80";

  useEffect(() => {
    fetchContacts();
    fetchConnectionRequests();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const response = await axiosInstance.get("/connections/contacts");
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchConnectionRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await axiosInstance.get("/connections/requests");
      if (response.data.success) {
        setConnectionRequests(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching connection requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) {
      Alert.alert(
        "Search Error",
        "Please enter at least 3 characters to search"
      );
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.get(
        `/connections/search?query=${encodeURIComponent(searchQuery)}`
      );
      if (response.data.success) {
        const contactIds = contacts.map((contact) => contact._id);
        const filteredResults = response.data.data.filter(
          (user: User) => !contactIds.includes(user._id)
        );
        setSearchResults(filteredResults);
      } else {
        Alert.alert("Search Error", response.data.message);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendConnectionRequest = async (userId: string) => {
    try {
      setLoadingRequestStates((prev) => ({ ...prev, [userId]: true }));
      const response = await axiosInstance.post("/connections/request", {
        recipientId: userId,
      });

      if (response.data.success) {
        Alert.alert("Success", "Connection request sent successfully");
        setSearchResults((prev) => prev.filter((user) => user._id !== userId));
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error: any) {
      console.error("Error sending connection request:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to send connection request"
      );
    } finally {
      setLoadingRequestStates((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const respondToConnectionRequest = async (
    senderId: string,
    action: "accept" | "reject"
  ) => {
    try {
      setRespondingToRequest((prev) => ({ ...prev, [senderId]: true }));
      const response = await axiosInstance.post("/connections/respond", {
        senderId,
        action,
      });

      if (response.data.success) {
        setConnectionRequests((prev) =>
          prev.filter((request) => request.from._id !== senderId)
        );

        if (action === "accept" && response.data.contact) {
          setContacts((prev) => [...prev, response.data.contact]);
        }

        Alert.alert(
          "Success",
          action === "accept"
            ? "Connection request accepted"
            : "Connection request rejected"
        );
      }
    } catch (error: any) {
      console.error("Error responding to connection request:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to respond to connection request"
      );
    } finally {
      setRespondingToRequest((prev) => ({ ...prev, [senderId]: false }));
    }
  };

  const startConversation = async (contactId: string) => {
    try {
      // Check if a conversation already exists
      const response = await axiosInstance.get(
        `/conversations/find/${contactId}`
      );
      if (response.data.success && response.data.conversationId) {
        // Conversation exists, navigate to it
        router.push({
          pathname: `/(conversation)/[conversationId]`,
          params: {
            conversationId: response.data.conversationId,
            recipientId: contactId,
          }, // Pass conversationId as a param
        });
      } else {
        // Conversation does not exist or error, navigate to create new
        router.push({
          pathname: "/(conversation)/new",
          params: { recipientId: contactId },
        });
      }
    } catch (error) {
      console.error("Error finding or starting conversation:", error);
      // Fallback to creating a new conversation if the check fails
      router.push({
        pathname: "/(conversation)/new",
        params: { recipientId: contactId },
      });
    }
  };

  const handleGroupCreated = () => {
    fetchContacts();
  };

  const renderContactItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      onPress={() => startConversation(item._id)}
      className="flex-row items-center p-4 border-b border-gray-100">
      <View className="h-12 w-12 rounded-full overflow-hidden bg-cyan-100 items-center justify-center">
        {item.profileImageUrl ? (
          <Image
            source={{ uri: item.profileImageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={24} color={primaryDarkColor} />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-urbanistBold text-gray-800">
          {item.name.split(" ")[0]}
        </Text>
        <Text className="font-urbanist text-gray-600">{item.email}</Text>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={primaryDarkColor} />
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: { item: ConnectionRequest }) => (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      <View className="h-12 w-12 rounded-full overflow-hidden bg-cyan-100 items-center justify-center">
        {item.from.profileImageUrl ? (
          <Image
            source={{ uri: item.from.profileImageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={24} color={primaryDarkColor} />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-urbanistBold text-gray-800">
          {item.from.name}
        </Text>
        <Text className="font-urbanist text-gray-600">{item.from.email}</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => respondToConnectionRequest(item.from._id, "accept")}
          disabled={respondingToRequest[item.from._id]}
          className="bg-cyan-500 py-2 px-3 rounded-lg mr-2">
          {respondingToRequest[item.from._id] ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark-outline" size={20} color="white" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => respondToConnectionRequest(item.from._id, "reject")}
          disabled={respondingToRequest[item.from._id]}
          className="bg-gray-400 py-2 px-3 rounded-lg">
          {respondingToRequest[item.from._id] ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="close-outline" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResultItem = ({ item }: { item: User }) => (
    <View className="flex-row items-center p-4 border-b border-gray-100">
      <View className="h-12 w-12 rounded-full overflow-hidden bg-cyan-100 items-center justify-center">
        {item.profileImageUrl ? (
          <Image
            source={{ uri: item.profileImageUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={24} color={primaryDarkColor} />
        )}
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-urbanistBold text-gray-800">
          {item.name.split(" ")[0]}
        </Text>
        <Text className="font-urbanist text-gray-600">{item.email}</Text>
      </View>
      <TouchableOpacity
        onPress={() => sendConnectionRequest(item._id)}
        disabled={loadingRequestStates[item._id]}
        className="bg-cyan-500 py-2 px-3 rounded-lg">
        {loadingRequestStates[item._id] ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text className="font-urbanistBold text-white">Connect</Text>
        )}
      </TouchableOpacity>
    </View>
  );
  // Animation for page load
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchContacts(), fetchConnectionRequests()]).finally(() => {
      setRefreshing(false);
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
        {/* Custom header with gradient */}
        <LinearGradient
          colors={["#ecfeff", "#cffafe"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="px-4 py-3 shadow-sm">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2.5 rounded-full bg-white/80 shadow-sm"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={22} color={primaryDarkColor} />
            </TouchableOpacity>
            <Text className="flex-1 text-xl font-urbanistBold text-center text-cyan-700 mx-2">
              New Conversation
            </Text>
          </View>
        </LinearGradient>
        {/* Search Bar */}
        <Animated.View
          className="p-4 pb-2"
          style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm border border-cyan-100">
            <Ionicons name="search" size={20} color={primaryColor} />
            <TextInput
              className="flex-1 ml-2 font-urbanist text-gray-800"
              placeholder="Search by email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={mutedTextColor}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="p-1">
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={mutedTextColor}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            className="bg-cyan-500 py-3 rounded-full mt-3 items-center shadow-sm">
            <Text className="font-urbanistBold text-white">Search</Text>
          </TouchableOpacity>
        </Animated.View>
        {/* Main Content Area */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={primaryColor}
            />
          }>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}>
            {/* Connection Requests Section */}
            {connectionRequests.length > 0 && (
              <View className="mb-4">
                <View className="px-4 py-3 flex-row justify-between items-center">
                  <Text className="font-urbanistBold text-base text-cyan-700">
                    PENDING REQUESTS
                  </Text>
                  <View className="bg-cyan-500 px-2 py-0.5 rounded-full">
                    <Text className="font-urbanistBold text-white text-xs">
                      {connectionRequests.length}
                    </Text>
                  </View>
                </View>
                {loadingRequests ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color={primaryColor} />
                  </View>
                ) : (
                  <View className="px-4 space-y-3">
                    {connectionRequests.map((request) => (
                      <View
                        key={request._id}
                        className="flex-row items-center p-4 bg-white rounded-xl shadow-sm border border-cyan-100">
                        <View className="h-14 w-14 rounded-full overflow-hidden bg-cyan-100 items-center justify-center border-2 border-cyan-200">
                          {request.from.profileImageUrl ? (
                            <Image
                              source={{ uri: request.from.profileImageUrl }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={28}
                              color={primaryDarkColor}
                            />
                          )}
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="font-urbanistBold text-lg text-cyan-800">
                            {request.from.name.split(" ")[0]}
                          </Text>
                          <Text className="font-urbanist text-gray-500">
                            {request.from.email}
                          </Text>
                        </View>
                        <View className="flex-row">
                          <TouchableOpacity
                            onPress={() =>
                              respondToConnectionRequest(
                                request.from._id,
                                "accept"
                              )
                            }
                            disabled={respondingToRequest[request.from._id]}
                            className="bg-cyan-500 p-2.5 rounded-full mr-2 shadow-sm">
                            {respondingToRequest[request.from._id] ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons
                                name="checkmark-sharp"
                                size={18}
                                color="white"
                              />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              respondToConnectionRequest(
                                request.from._id,
                                "reject"
                              )
                            }
                            disabled={respondingToRequest[request.from._id]}
                            className="bg-gray-400 p-2.5 rounded-full shadow-sm">
                            {respondingToRequest[request.from._id] ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="close" size={18} color="white" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Search Results */}
            {isLoading ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="large" color={primaryColor} />
                <Text className="font-urbanist text-cyan-600 mt-4">
                  Searching...
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View className="mb-4">
                <View className="px-4 py-3 flex-row justify-between items-center">
                  <Text className="font-urbanistBold text-base text-cyan-700">
                    SEARCH RESULTS
                  </Text>
                  <View className="bg-cyan-500 px-2 py-0.5 rounded-full">
                    <Text className="font-urbanistBold text-white text-xs">
                      {searchResults.length}
                    </Text>
                  </View>
                </View>
                <View className="px-4 space-y-3">
                  {searchResults.map((user) => (
                    <View
                      key={user._id}
                      className="flex-row items-center p-4 bg-white rounded-xl shadow-sm border border-cyan-100">
                      <View className="h-14 w-14 rounded-full overflow-hidden bg-cyan-100 items-center justify-center border-2 border-cyan-200">
                        {user.profileImageUrl ? (
                          <Image
                            source={{ uri: user.profileImageUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={28}
                            color={primaryDarkColor}
                          />
                        )}
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="font-urbanistBold text-lg text-cyan-800">
                          {user.name.split(" ")[0]}
                        </Text>
                        <Text className="font-urbanist text-gray-500">
                          {user.email}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => sendConnectionRequest(user._id)}
                        disabled={loadingRequestStates[user._id]}
                        className="bg-cyan-500 py-2 px-4 rounded-full shadow-sm">
                        {loadingRequestStates[user._id] ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="font-urbanistBold text-white">
                            Connect
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ) : searchQuery.length > 0 ? (
              <View className="py-10 items-center justify-center mx-6">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Ionicons name="search" size={40} color="#d1d5db" />
                </View>
                <Text className="font-urbanistBold text-gray-500 text-lg mt-2">
                  No users found
                </Text>
                <Text className="font-urbanist text-gray-500 text-center mt-1">
                  Try searching with a different email
                </Text>
              </View>
            ) : null}

            {/* Your Contacts Section */}
            <View className="mb-20">
              {/* Added bottom margin to ensure space at the end */}
              <View className="px-4 py-3 flex-row justify-between items-center">
                <Text className="font-urbanistBold text-base text-cyan-700">
                  YOUR CONTACTS
                </Text>
                {contacts.length > 0 && (
                  <View className="bg-cyan-500 px-2 py-0.5 rounded-full">
                    <Text className="font-urbanistBold text-white text-xs">
                      {contacts.length}
                    </Text>
                  </View>
                )}
              </View>
              {loadingContacts ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="large" color={primaryColor} />
                </View>
              ) : contacts.length > 0 ? (
                <View className="px-4 space-y-3">
                  {contacts.map((contact) => (
                    <TouchableOpacity
                      key={contact._id}
                      onPress={() => startConversation(contact._id)}
                      className="flex-row items-center p-4 bg-white rounded-xl shadow-sm border border-cyan-100">
                      <View className="h-14 w-14 rounded-full overflow-hidden bg-cyan-100 items-center justify-center border-2 border-cyan-200">
                        {contact.profileImageUrl ? (
                          <Image
                            source={{ uri: contact.profileImageUrl }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={28}
                            color={primaryDarkColor}
                          />
                        )}
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="font-urbanistBold text-lg text-cyan-800">
                          {contact.name.split(" ")[0]}
                        </Text>
                        <Text className="font-urbanist text-gray-500">
                          {contact.email}
                        </Text>
                      </View>
                      <View className="bg-cyan-100 p-2.5 rounded-full">
                        <Ionicons
                          name="chatbubble"
                          size={20}
                          color={primaryDarkColor}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="py-10 items-center justify-center mx-6">
                  <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                    <Ionicons name="people" size={40} color="#d1d5db" />
                  </View>
                  <Text className="font-urbanistBold text-gray-500 text-lg mt-2">
                    No contacts yet
                  </Text>
                  <Text className="font-urbanist text-gray-500 text-center mt-1">
                    Search for users by email to connect
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
        {/* Create Group Modal */}
        <CreateGroupModal
          isVisible={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={handleGroupCreated}
        />
        {/* Floating Action Button */}
        {contacts.length > 0 && (
          <View className="absolute right-6 bottom-6">
            <TouchableOpacity
              onPress={() => setShowCreateGroup(true)}
              className="w-14 h-14 bg-cyan-500 rounded-full items-center justify-center shadow-lg"
              style={{
                shadowColor: primaryDarkColor,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 5,
              }}>
              <Ionicons name="people-outline" size={26} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
