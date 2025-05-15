import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  SafeAreaView,
  StatusBar,
  TextInput,
  Animated,
  Platform,
  TextInputProps,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";

import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

// --- Interfaces ---
interface Participant {
  _id: string;
  name: string;
  profileImageUrl?: string;
}

interface LastMessage {
  content: string;
  senderId:
    | {
        _id: string;
        name: string;
        profileImageUrl?: string;
      }
    | string;
  timestamp: string;
}

interface Conversation {
  _id: string;
  participants: Participant[];
  lastMessage: LastMessage | null;
  isGroupChat: boolean;
  groupName?: string;
  groupAdmin?: { _id: string; name: string };
  groupImageUrl?: string;
  updatedAt: string;
  unreadCount?: number;
}

interface ApiConversationResponse {
  success: boolean;
  data: Conversation[];
}

const FocusAwareTextInput = forwardRef<TextInput, TextInputProps>(
  (props, ref) => {
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(inputRef.current);
        } else {
          ref.current = inputRef.current;
        }
      }
    }, [ref]);

    return (
      <TextInput
        ref={inputRef}
        {...props}
        autoCapitalize="none"
        blurOnSubmit={false}
        spellCheck={false}
        caretHidden={false}
        autoComplete="off"
        selectionColor="#0891b2"
      />
    );
  }
);

const ConversationListScreen = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<
    Conversation[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const searchInputRef = useRef<TextInput>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 10);
  }, []);

  const sortConversations = useCallback((convos: Conversation[]) => {
    return [...convos].sort((a, b) => {
      if ((a.unreadCount ?? 0) > 0 && (b.unreadCount ?? 0) === 0) return -1;
      if ((a.unreadCount ?? 0) === 0 && (b.unreadCount ?? 0) > 0) return 1;

      const dateA = a.lastMessage
        ? new Date(a.lastMessage.timestamp).getTime()
        : new Date(a.updatedAt).getTime();
      const dateB = b.lastMessage
        ? new Date(b.lastMessage.timestamp).getTime()
        : new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    setError(null);
    console.log("ConversationList: Fetching conversations...");
    try {
      const response = await axiosInstance.get<Conversation[]>(
        "/conversations"
      );
      const sortedConversations = sortConversations(response.data || []);
      setConversations(sortedConversations);
      setFilteredConversations(sortedConversations);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      console.error(
        "ConversationList: Error fetching conversations:",
        error.message
      );
      setError("Failed to load conversations. Please try again.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, fadeAnim, sortConversations]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);
  const filterConversations = useCallback(
    (query: string) => {
      if (query.trim() === "") {
        return sortConversations(conversations);
      } else {
        const lowerQuery = query.toLowerCase().trim();
        const filtered = conversations.filter((convo) => {
          if (convo.isGroupChat && convo.groupName) {
            if (convo.groupName.toLowerCase().includes(lowerQuery)) {
              return true;
            }
          }

          if (user) {
            const otherParticipant = convo.participants.find(
              (p) => p._id !== user.id
            );
            if (
              otherParticipant?.name &&
              otherParticipant.name.toLowerCase().includes(lowerQuery)
            ) {
              return true;
            }
          }

          if (
            convo.lastMessage?.content &&
            convo.lastMessage.content.toLowerCase().includes(lowerQuery)
          ) {
            return true;
          }

          return false;
        });

        // Sort filtered results
        return sortConversations(filtered);
      }
    },
    [conversations, user, sortConversations]
  );
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filtered = filterConversations(searchQuery);
      setFilteredConversations(filtered);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterConversations, conversations]);
  // Socket connection effect
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleNewMessage = (newMessage: any) => {
      console.log(
        "ConversationList: Received newMessage socket event",
        newMessage
      );
      setConversations((prevConvos) => {
        const convoIndex = prevConvos.findIndex(
          (c) => c._id === newMessage.conversationId
        );
        if (convoIndex > -1) {
          const prevConvo = prevConvos[convoIndex];
          // Increment unread count if the message is not from the current user
          const isFromCurrentUser =
            typeof newMessage.sender === "object"
              ? newMessage.sender._id === user.id
              : newMessage.sender === user.id;

          const unreadCount = !isFromCurrentUser
            ? (prevConvo.unreadCount || 0) + 1
            : prevConvo.unreadCount || 0;

          const updatedConvo = {
            ...prevConvo,
            lastMessage: {
              content: newMessage.content,
              senderId: newMessage.sender, // Assuming sender is populated like { _id, name, profileImageUrl }
              timestamp: newMessage.timestamp,
            },
            updatedAt: newMessage.timestamp, // Update conversation's updatedAt
            unreadCount: unreadCount, // Update unread count
          };

          // Remove the existing conversation
          const filteredConvos = prevConvos.filter(
            (c) => c._id !== newMessage.conversationId
          );

          // Add the updated conversation and re-sort
          const newConvos = sortConversations([
            updatedConvo,
            ...filteredConvos,
          ]);
          return newConvos;
        }
        return prevConvos; // Or fetch all convos again if a message for an unknown convo arrives
      });
    };

    const handleNewConversationCreated = (newConvo: Conversation) => {
      console.log(
        "ConversationList: Received newConversationCreated socket event",
        newConvo
      );
      setConversations((prevConvos) => {
        // Add to top and prevent duplicates
        if (!prevConvos.find((c) => c._id === newConvo._id)) {
          // Join the conversation room via socket
          socket.emit("joinConversation", newConvo._id);
          return [newConvo, ...prevConvos];
        }
        return prevConvos;
      });
    };

    const handleNewGroupConversation = (newGroupConvo: Conversation) => {
      console.log(
        "ConversationList: Received newGroupConversation socket event",
        newGroupConvo
      );
      setConversations((prevConvos) => {
        if (!prevConvos.find((c) => c._id === newGroupConvo._id)) {
          // Join the new group conversation room via socket
          socket.emit("joinConversation", newGroupConvo._id);

          // Insert the new group conversation at the top
          return [newGroupConvo, ...prevConvos];
        }
        return prevConvos;
      });
    };

    const handleJoinedConversation = (data: any) => {
      console.log(`Joined conversation: ${data.conversationId}`);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("newConversationCreated", handleNewConversationCreated);
    socket.on("newGroupConversation", handleNewGroupConversation);
    socket.on("joinedConversation", handleJoinedConversation);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("newConversationCreated", handleNewConversationCreated);
      socket.off("newGroupConversation", handleNewGroupConversation);
      socket.off("joinedConversation", handleJoinedConversation);
    };
  }, [socket, isConnected, user]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const getConversationDisplayDetails = (conversation: Conversation) => {
    if (!user) return { name: "Chat", imageUrl: undefined };

    if (conversation.isGroupChat) {
      // For group chats, also use only the first word of the group name
      const fullGroupName = conversation.groupName || "Group Chat";
      const firstWord = fullGroupName.split(" ")[0];

      return {
        name: firstWord,
        imageUrl: conversation.groupImageUrl,
      };
    }

    // For 1-on-1 chat
    const otherParticipant = conversation.participants.find(
      (p) => p._id !== user.id
    );

    // Extract first name only
    const fullName = otherParticipant?.name || "Chat Partner";
    const firstName = fullName.split(" ")[0];

    return {
      name: firstName,
      imageUrl: otherParticipant?.profileImageUrl,
    };
  };
  const renderItem = ({ item }: { item: Conversation }) => {
    const { name, imageUrl } = getConversationDisplayDetails(item);
    // Check if conversation has unread messages
    const hasUnread = (item.unreadCount ?? 0) > 0;

    const lastMessageText = item.lastMessage?.content
      ? item.lastMessage.content.substring(0, 40) +
        (item.lastMessage.content.length > 40 ? "..." : "")
      : "No messages yet";

    let lastMessageSender = "";
    if (item.lastMessage && typeof item.lastMessage.senderId === "object") {
      // Get first name only for last message sender
      const senderFullName = item.lastMessage.senderId.name || "";
      const senderFirstName = senderFullName.split(" ")[0];

      lastMessageSender =
        item.lastMessage.senderId._id === user?.id
          ? "You: "
          : `${senderFirstName}: `;
    } else if (item.lastMessage) {
      lastMessageSender = item.lastMessage.senderId === user?.id ? "You: " : "";
    }

    const timeAgo = item.lastMessage
      ? formatDistanceToNowStrict(new Date(item.lastMessage.timestamp), {
          addSuffix: false,
        })
      : formatDistanceToNowStrict(new Date(item.updatedAt), {
          addSuffix: false,
        });

    // Function to handle conversation opening and reset unread count
    const handleOpenConversation = () => {
      // Reset unread count in state when opening conversation
      if (hasUnread) {
        setConversations((prevConvos) =>
          prevConvos.map((convo) =>
            convo._id === item._id ? { ...convo, unreadCount: 0 } : convo
          )
        );
      }

      // Navigate to conversation
      router.push({
        pathname: `../(conversation)/[conversationId]`,
        params: { conversationId: item._id },
      });
    };

    return (
      <TouchableOpacity
        className={`flex-row items-center p-4 mx-3 my-1 rounded-xl ${
          hasUnread
            ? "border-2 border-cyan-500 bg-cyan-50/80"
            : "border border-cyan-100 bg-white"
        } shadow-sm`}
        onPress={handleOpenConversation}
        onLongPress={() => {
          if (item.isGroupChat) {
            router.push(`../(conversation)/groupProfile?groupId=${item._id}`);
          }
        }}>
        <View className="mr-4 relative">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className="w-14 h-14 rounded-full bg-gray-300"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-cyan-100 items-center justify-center">
              <Ionicons
                name={item.isGroupChat ? "people" : "person"}
                size={28}
                color="#0891b2"
              />
            </View>
          )}
          {hasUnread && (
            <View className="absolute top-0 right-0 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center shadow-sm">
              <Text className="text-xs font-urbanistBold text-white">
                {(item.unreadCount ?? 0) > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text
              className={`text-lg ${
                hasUnread
                  ? "font-urbanistBold text-cyan-800"
                  : "font-urbanistBold text-gray-800"
              }`}
              numberOfLines={1}>
              {name}
              {hasUnread && (
                <View className="ml-1 w-2 h-2 rounded-full bg-cyan-500" />
              )}
            </Text>
            <Text
              className={`text-xs font-urbanistMedium ${
                hasUnread
                  ? "text-white bg-cyan-500"
                  : "text-cyan-600 bg-cyan-50"
              } px-2 py-1 rounded-full`}>
              {timeAgo}
            </Text>
          </View>
          <View className="flex-row items-center">
            {hasUnread && (
              <View className="w-2 h-2 rounded-full bg-cyan-500 mr-2" />
            )}
            <Text
              className={`text-sm flex-1 ${
                hasUnread
                  ? "text-cyan-700 font-urbanistBold"
                  : "text-gray-600 font-urbanistMedium"
              } mt-1`}
              numberOfLines={1}>
              {lastMessageSender}
              {lastMessageText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (isLoading) return null;

    if (searchQuery && filteredConversations.length === 0) {
      return (
        <View className="flex-1 justify-center items-center mt-20 p-5">
          <View className="items-center p-6 rounded-2xl border border-cyan-100 bg-white shadow-sm">
            <Ionicons name="search-outline" size={60} color="#0891b2" />
            <Text className="text-lg font-urbanistMedium text-cyan-700 mt-4">
              No Results Found
            </Text>
            <Text className="text-sm text-cyan-600 text-center mt-1">
              We couldn't find any conversations matching "{searchQuery}"
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View className="flex-1 justify-center items-center mt-20 p-5">
        <View className="items-center bg-white p-6 rounded-2xl shadow-sm border border-cyan-100">
          <Ionicons name="chatbubbles" size={70} color="#0891b2" />
          <Text className="text-xl font-urbanistBold text-cyan-700 mt-4">
            No Conversations Yet
          </Text>
          <Text className="text-sm font-urbanistMedium text-cyan-600 text-center mt-1 mb-4">
            Start chatting with friends or create a group
          </Text>
          <TouchableOpacity
            className="bg-cyan-600 px-6 py-3 rounded-full flex-row items-center"
            onPress={() => router.push("/newconversation")}>
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <Text className="text-white font-urbanistBold ml-2">
              Start a New Chat
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  // const renderHeader = useCallback(() => {
  //   console.log("Rendering search header");
  //   return (
  //     <View className="px-4 pt-2 pb-4">
  //       <View className="flex-row items-center bg-white rounded-full px-4 py-2 shadow-sm border border-cyan-100">
  //         <Ionicons name="search-outline" size={20} color="#0891b2" />
  //         <FocusAwareTextInput
  //           ref={searchInputRef}
  //           className="flex-1 ml-2 text-base font-urbanistMedium text-gray-800"
  //           placeholder="Search conversations..."
  //           value={searchQuery}
  //           onChangeText={handleSearchChange}
  //           placeholderTextColor="#0891b2"
  //           autoCorrect={false}
  //           keyboardType="default"
  //           returnKeyType="search"
  //         />
  //         {searchQuery.length > 0 && (
  //           <TouchableOpacity
  //             onPress={() => {
  //               setSearchQuery("");
  //               setTimeout(() => {
  //                 if (searchInputRef.current) {
  //                   searchInputRef.current.focus();
  //                 }
  //               }, 50);
  //             }}
  //             hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
  //             <Ionicons name="close-circle" size={20} color="#6b7280" />
  //           </TouchableOpacity>
  //         )}
  //       </View>
  //     </View>
  //   );
  // }, [searchQuery, handleSearchChange]);
  // Calculate total unread messages across all conversations
  const totalUnreadMessages = conversations.reduce(
    (total, convo) => total + (convo.unreadCount ?? 0),
    0
  );

  if (isLoading && conversations.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-cyan-50">
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text className="font-urbanistMedium text-cyan-700 mt-4">
          Loading conversations...
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-cyan-50 p-5">
        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
        <Text className="text-lg font-urbanistBold text-red-500 mt-4 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-cyan-600 px-6 py-3 rounded-full"
          onPress={fetchConversations}>
          <Text className="text-white font-urbanistBold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <SafeAreaView
      className="flex-1 bg-cyan-50"
      style={{
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}>
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />
      {/* Header */}
      <View className="p-4 flex-row justify-between items-center border-b border-cyan-100 bg-cyan-100/50">
        <View className="flex-row items-center">
          <Text className="text-2xl font-urbanistBold text-cyan-800">
            Messages
          </Text>
          {totalUnreadMessages > 0 && (
            <View className="ml-2 bg-cyan-600 rounded-full px-2 py-0.5">
              <Text className="text-xs font-urbanistBold text-white">
                {totalUnreadMessages > 99 ? "99+" : totalUnreadMessages} unread
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-cyan-100 w-10 h-10 rounded-full items-center justify-center border border-cyan-200"
            onPress={() => router.push("/newconversation")}
            accessibilityLabel="Create new chat"
            importantForAccessibility={searchQuery.length > 0 ? "no" : "auto"}
            accessible={searchQuery.length === 0}>
            <Ionicons name="create-outline" size={22} color="#0891b2" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Conversation list */}
      <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          // ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onScrollBeginDrag={() => {
            if (searchQuery.length > 0 && searchInputRef.current) {
              searchInputRef.current.focus();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06b6d4"
              colors={["#06b6d4"]}
            />
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
};

export default ConversationListScreen;
