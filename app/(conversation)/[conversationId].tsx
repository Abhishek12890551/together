import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO } from "date-fns";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

interface Participant {
  _id: string;
  name: string;
  profileImageUrl?: string;
  isOnline?: boolean;
  socketId?: string; // Also track socketId for more accurate status
}

interface ChatMessageUser {
  _id: string;
  name: string;
  profileImageUrl?: string;
}

interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: ChatMessageUser;
  conversationId: string;
  // Add other custom properties: sent, received, readBy, etc.
  isRead?: boolean; // message read status (for incoming)
  pending?: boolean; // optimistic send
  deliveredTo?: string[]; // delivery ACKs
  readBy?: string[]; // IDs of users who have read this message
}

interface MessageFromApiOrSocket {
  _id: string;
  content: string;
  timestamp: string;
  sender: {
    _id: string;
    name: string;
    profileImageUrl?: string;
  };
  readBy?: string[];
  deliveredTo?: string[];
  conversationId: string;
}

const TypingDot = ({
  delay = 0,
  color = "#0891b2",
}: {
  delay?: number;
  color?: string;
}) => {
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = () => {
      setOpacity(1);
      timeoutId = setTimeout(() => {
        if (mounted) {
          setOpacity(0.3);
          timeoutId = setTimeout(() => {
            if (mounted) {
              animate();
            }
          }, 300);
        }
      }, 500);
    };

    timeoutId = setTimeout(animate, delay);

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delay]);

  return (
    <View
      className="h-1.5 w-1.5 rounded-full mx-0.5"
      style={{ opacity, backgroundColor: color }}
    />
  );
};

const TypingIndicator = ({
  user,
  profileImg,
}: {
  user: string;
  profileImg?: string | null;
}) => {
  return (
    <View className="flex-row items-center p-2 ml-3 self-start my-1">
      <View className="flex-row items-center bg-cyan-100 rounded-2xl px-3 py-2 shadow-md border border-cyan-200">
        <View className="mr-2">
          {profileImg ? (
            <Image
              source={{ uri: profileImg }}
              className="h-6 w-6 rounded-full"
              defaultSource={require("../../assets/images/together-icon.png")}
            />
          ) : (
            <View className="h-6 w-6 rounded-full bg-cyan-200 items-center justify-center">
              <Ionicons name="person" size={12} color="#0891b2" />
            </View>
          )}
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm font-urbanistMedium text-cyan-700 mr-1.5">
            {user}
          </Text>
          <Text className="text-xs font-urbanist text-cyan-600 mr-1">
            is typing
          </Text>
          <View className="flex-row items-center mt-0.5">
            <TypingDot delay={0} color="#0891b2" />
            <TypingDot delay={200} color="#0891b2" />
            <TypingDot delay={400} color="#0891b2" />
          </View>
        </View>
      </View>
    </View>
  );
};

const ChatScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user: authUser, token } = useAuth();
  const { socket, isConnected, attemptReconnect, serverUrl } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Index of the first unread incoming message for highlight divider
  const [firstUnreadIndex, setFirstUnreadIndex] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Chat");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [participantOnlineStatus, setParticipantOnlineStatus] = useState(false);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(
    null
  );
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const scrollOffsetRef = useRef(0);

  // Animation state for status indicator
  const [statusAnimationScale, setStatusAnimationScale] = useState(1);

  const formatMessageForDisplay = (
    msg: MessageFromApiOrSocket
  ): ChatMessage => {
    return {
      _id: msg._id,
      text: msg.content,
      createdAt: parseISO(msg.timestamp),
      user: {
        _id: msg.sender._id,
        name: msg.sender.name,
        profileImageUrl: msg.sender.profileImageUrl,
      },
      conversationId: msg.conversationId,
      isRead: msg.readBy && authUser ? msg.readBy.includes(authUser.id) : false,
      deliveredTo: msg.deliveredTo || [],
      readBy: msg.readBy || [],
    };
  };

  const fetchInitialMessages = useCallback(async () => {
    if (!conversationId || !token) {
      setIsLoading(false);
      return;
    }
    console.log(
      `ChatScreen: Fetching messages for conversation ${conversationId}`
    );
    setIsLoading(true);
    try {
      const response = await axiosInstance.get<{
        messages: MessageFromApiOrSocket[];
      }>(`/conversations/${conversationId}/messages?limit=30`);
      const formatted = (response.data.messages || []).map(
        formatMessageForDisplay
      );
      setMessages(
        formatted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      );
    } catch (error: any) {
      console.error("ChatScreen: Error fetching messages:", error.message);
      Alert.alert("Error", "Could not load messages.");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, token, navigation]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);
  const [headerProfileImage, setHeaderProfileImage] = useState<string | null>(
    null
  );

  useEffect(() => {
    const getConversationDetails = async () => {
      if (conversationId && token) {
        try {
          const response = await axiosInstance.get(
            `/conversations/${conversationId}`
          );
          const conversation = response.data;

          if (conversation) {
            setIsGroupChat(conversation.isGroupChat);

            if (conversation.isGroupChat) {
              setHeaderTitle(conversation.groupName || "Group Chat");
              setHeaderProfileImage(conversation.groupImageUrl || null);
            } else {
              const otherParticipant = conversation.participants.find(
                (p: Participant) => p._id !== authUser?.id
              );
              if (otherParticipant) {
                // Set only the first name as the header title
                const firstName = otherParticipant.name.split(" ")[0];
                setHeaderTitle(firstName);
                setHeaderProfileImage(otherParticipant.profileImageUrl || null);
                setOtherParticipantId(otherParticipant._id);
                // Check if the other participant has an online status from API
                const initialOnlineStatus =
                  !!otherParticipant.isOnline || !!otherParticipant.socketId;
                console.log(
                  `Initial online status from API for ${otherParticipant.name}: ${initialOnlineStatus}`
                );
                console.log(`User data from API:`, {
                  id: otherParticipant._id,
                  name: otherParticipant.name,
                  isOnline: otherParticipant.isOnline,
                  socketId: otherParticipant.socketId,
                });
                setParticipantOnlineStatus(initialOnlineStatus);

                // After a small delay, request fresh status
                setTimeout(() => {
                  if (socket && isConnected) {
                    console.log(
                      `Requesting updated status after loading conversation details`
                    );
                    socket.emit("getParticipantStatus", {
                      targetUserId: otherParticipant._id,
                      conversationId: conversationId,
                    });
                  }
                }, 500);
              } else {
                setHeaderTitle("Chat");
                setHeaderProfileImage(null);
                setOtherParticipantId(null);
                setParticipantOnlineStatus(false);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching conversation details:", error);
          setHeaderTitle("Chat");
          setHeaderProfileImage(null);
        }
      }
    };
    getConversationDetails();
  }, [conversationId, token, navigation, authUser]);

  useEffect(() => {
    if (socket && isConnected && conversationId && authUser) {
      console.log(
        `ChatScreen: Joining conversation room: ${conversationId} (Main Effect)`
      );
      socket.emit("joinConversation", conversationId);

      const pendingMessages = messages.filter((msg) => msg.pending);
      if (pendingMessages.length > 0) {
        console.log(
          `ChatScreen: Sending ${pendingMessages.length} pending messages`
        );
        pendingMessages.forEach((msg) => {
          const messagePayload = {
            content: msg.text,
            conversationId: conversationId,
          };
          socket.emit("sendMessage", messagePayload);
        });

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.pending ? { ...msg, pending: false } : msg
          )
        );

        Alert.alert(
          "Connection Restored",
          `${pendingMessages.length} pending message${
            pendingMessages.length === 1 ? "" : "s"
          } sent.`
        );
      }
      const handleNewMessage = (socketMsg: MessageFromApiOrSocket) => {
        if (socketMsg.conversationId !== conversationId) {
          return;
        }

        setMessages((prevMessages) => {
          if (!authUser) {
            return prevMessages;
          }

          if (prevMessages.some((m) => m._id === socketMsg._id)) {
            console.log(
              `[ChatScreen] handleNewMessage: Duplicate _id ${socketMsg._id} found in prevMessages. Ignoring.`
            );
            return prevMessages;
          }

          const formattedMsg = formatMessageForDisplay(socketMsg);

          // Check 2: Attempt to find a matching optimistic (temporary) message to replace.
          const optimisticMatchIndex = prevMessages.findIndex(
            (msg) =>
              msg._id.startsWith("temp_") &&
              msg.user._id === authUser.id &&
              msg.text === formattedMsg.text && // Compare content
              // Optional: Check if the optimistic message is recent enough
              new Date().getTime() - msg.createdAt.getTime() < 10000 // 10 seconds window
          );

          let newMessagesArray;
          if (optimisticMatchIndex !== -1) {
            // Optimistic message found: replace it with the server-confirmed one.
            newMessagesArray = [...prevMessages];
            newMessagesArray[optimisticMatchIndex] = formattedMsg;
            console.log(
              `[ChatScreen] handleNewMessage: Replaced optimistic message with server confirmed _id ${formattedMsg._id}.`
            );
          } else {
            // No optimistic message matched (or it's a message from another user).
            // Since we've already checked that formattedMsg._id is not in prevMessages,
            // we can safely add it.
            newMessagesArray = [...prevMessages, formattedMsg];
            console.log(
              `[ChatScreen] handleNewMessage: Added new message with _id ${formattedMsg._id}.`
            );
          }

          // Always sort messages by creation time after any modification.
          return newMessagesArray.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );
        });

        // --- Handle side-effects (scrolling, emitting other events) ---
        // These should use `socketMsg` (the direct input) and `authUser` (from component scope).

        if (socketMsg.sender._id !== authUser?.id) {
          // Incoming message from another user
          if (scrollOffsetRef.current > 100) {
            setHasNewMessages(true);
            setShowScrollToBottom(true);
          }

          // Emit "delivered" and "read" acknowledgements
          if (socketMsg._id && typeof socketMsg._id === "string") {
            socket?.emit("messageDelivered", {
              conversationId,
              messageId: socketMsg._id,
            });
            // The messageRead emission will eventually trigger handleMessageReadUpdate,
            // which updates the `readBy` array and `isRead` status.
            setTimeout(() => {
              socket?.emit("messageRead", {
                conversationId,
                messageId: socketMsg._id,
              });
            }, 300); // Delay to allow delivery to process if needed
          }
        } else {
          // Message is from the current user (server confirmation)
          // Auto-scroll to bottom for messages sent by the current user
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        // Auto-scroll if user is already near the bottom when an incoming message arrives
        if (
          socketMsg.sender._id !== authUser?.id &&
          scrollOffsetRef.current < 100
        ) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };
      // Handle read acknowledgements: update isRead and readBy arrays
      // Handle read acknowledgements: update isRead and readBy arrays
      const handleMessageReadUpdate = (data: {
        conversationId: string;
        messageId: string;
        readBy: string;
      }) => {
        const { conversationId: cId, messageId, readBy: readerId } = data;
        if (cId !== conversationId || !messageId) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  isRead: true,
                  readBy: Array.isArray(msg.readBy)
                    ? Array.from(new Set([...msg.readBy, readerId]))
                    : [readerId],
                }
              : msg
          )
        );
      };
      // ... (handleMessageReadUpdate, handleUserTyping - similar to GiftedChat version) ...
      const handleUserTyping = (data: {
        userId: string;
        userName: string;
        conversationId: string;
        isTyping: boolean;
      }) => {
        if (
          data.conversationId === conversationId &&
          data.userId !== authUser.id
        ) {
          setIsTyping(data.isTyping);
          setTypingUserName(data.isTyping ? data.userName : null);
        }
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("userTyping", handleUserTyping);
      socket.on("messageRead", handleMessageReadUpdate);
      // Handle delivered updates
      const handleMessageDeliveredUpdate = (data: {
        conversationId: string;
        messageId: string;
        deliveredBy: string;
        timestamp?: string;
      }) => {
        if (data.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg._id === data.messageId) {
                const updatedDelivered = msg.deliveredTo
                  ? [...msg.deliveredTo]
                  : [];
                if (!updatedDelivered.includes(data.deliveredBy)) {
                  updatedDelivered.push(data.deliveredBy);
                }
                return { ...msg, deliveredTo: updatedDelivered };
              }
              return msg;
            })
          );
        }
      };
      socket.on("messageDelivered", handleMessageDeliveredUpdate);

      return () => {
        console.log(
          `ChatScreen: Leaving conversation room: ${conversationId} (Main Effect)`
        );
        socket.emit("leaveConversation", conversationId);
        socket.off("newMessage", handleNewMessage);
        socket.off("userTyping", handleUserTyping);
        socket.off("messageRead", handleMessageReadUpdate);
        socket.off("messageDelivered", handleMessageDeliveredUpdate);
      };
    }
  }, [socket, isConnected, conversationId, authUser]); // Socket listeners effect (messages removed to avoid re-registering)
  useEffect(() => {
    if (socket && isConnected && otherParticipantId && conversationId) {
      console.log(
        `[ONLINE STATUS] Setting up online/offline tracking for participant: ${otherParticipantId}`
      );

      // Force refresh participant status when this effect runs
      const refreshStatus = () => {
        console.log(
          `[ONLINE STATUS] Requesting status for participant: ${otherParticipantId}`
        );
        socket.emit("getParticipantStatus", {
          targetUserId: otherParticipantId,
          conversationId: conversationId,
        });

        // Also log the current connectivity state
        console.log(
          `[ONLINE STATUS] Debug - Socket connected: ${socket.connected}, socketId: ${socket.id}`
        );
      }; // Request current status immediately and then periodically
      refreshStatus();
      const statusInterval = setInterval(refreshStatus, 15000); // Check every 15 seconds

      const handleUserOnlineEvent = (data: {
        userId: string;
        userName: string;
        timestamp?: string;
      }) => {
        console.log(
          `[ONLINE STATUS] Received userOnline event for: ${data.userId}, our target: ${otherParticipantId}`
        );
        if (data.userId === otherParticipantId) {
          console.log(
            `[ONLINE STATUS] User ${data.userName} (${data.userId}) is online. Updating UI.`
          );
          setTimeout(() => {
            setParticipantOnlineStatus(true);
            setStatusAnimationScale(1.5);
            setTimeout(() => setStatusAnimationScale(1), 300);
          }, 100);
        }
      };

      const handleUserOfflineEvent = (data: {
        userId: string;
        userName: string;
        timestamp?: string;
      }) => {
        console.log(
          `[ONLINE STATUS] Received userOffline event for: ${data.userId}`
        );
        if (data.userId === otherParticipantId) {
          console.log(
            `[ONLINE STATUS] User ${data.userName} (${data.userId}) is offline. Updating UI.`
          );
          // Apply a slight delay to ensure UI updates properly
          setTimeout(() => {
            setParticipantOnlineStatus(false);
            // Animate the status indicator
            setStatusAnimationScale(1.5);
            setTimeout(() => setStatusAnimationScale(1), 300);
          }, 100);
        }
      };

      const handleParticipantStatusResponse = (data: {
        userId: string;
        userName: string;
        isOnline: boolean;
        conversationId: string;
      }) => {
        console.log(
          `[ONLINE STATUS] Received status response: ${JSON.stringify(data)}`
        );
        if (
          data.userId === otherParticipantId &&
          data.conversationId === conversationId
        ) {
          console.log(
            `[ONLINE STATUS] Setting status for ${data.userName} to: ${
              data.isOnline ? "ONLINE" : "OFFLINE"
            }`
          ); // If status is changing, animate the transition
          if (data.isOnline !== participantOnlineStatus) {
            console.log(
              `[ONLINE STATUS] Status changed from ${participantOnlineStatus} to ${data.isOnline}`
            );

            // Apply with animation
            setTimeout(() => {
              setParticipantOnlineStatus(data.isOnline);
              setStatusAnimationScale(1.5);
              setTimeout(() => setStatusAnimationScale(1), 300);
            }, 100);
          } else {
            // Just update the status without animation if it hasn't changed
            setParticipantOnlineStatus(data.isOnline);
          }
        }
      };

      // Add event listeners
      console.log(`[ONLINE STATUS] Adding socket event listeners`);
      socket.on("userOnline", handleUserOnlineEvent);
      socket.on("userOffline", handleUserOfflineEvent);
      socket.on("participantStatus", handleParticipantStatusResponse);

      // Check for reconnection events
      const handleReconnect = () => {
        console.log(`[ONLINE STATUS] Socket reconnected, refreshing status`);
        setTimeout(refreshStatus, 1000);
      };

      socket.on("reconnect", handleReconnect);
      socket.on("connect", handleReconnect);

      return () => {
        console.log(`[ONLINE STATUS] Cleaning up online/offline tracking`);
        clearInterval(statusInterval);
        socket.off("userOnline", handleUserOnlineEvent);
        socket.off("userOffline", handleUserOfflineEvent);
        socket.off("participantStatus", handleParticipantStatusResponse);
        socket.off("reconnect", handleReconnect);
        socket.off("connect", handleReconnect);
      };
    } else {
      console.log(
        "[ONLINE STATUS] Skipping subscription: missing socket/connection/participant",
        {
          socketReady: !!socket,
          connected: isConnected,
          participantId: otherParticipantId,
        }
      );
    }
  }, [socket, isConnected, otherParticipantId, conversationId]);

  // After fetching initial messages, mark them all as read
  useEffect(() => {
    if (
      socket &&
      isConnected &&
      conversationId &&
      messages.length > 0 &&
      authUser
    ) {
      // 1) Emit delivered ack for any incoming messages not yet delivered
      messages.forEach((msg) => {
        if (
          msg.user._id !== authUser.id &&
          !(msg.deliveredTo || []).includes(authUser.id)
        ) {
          console.log(`Emitting delivered for msg ${msg._id}`);
          socket.emit("messageDelivered", {
            conversationId,
            messageId: msg._id,
          });
        }
      });
      // 2) Emit read ack for any incoming messages not yet read
      const unread = messages.filter(
        (msg) => msg.user._id !== authUser.id && !msg.isRead
      );
      if (unread.length > 0) {
        console.log(`Marking ${unread.length} messages as read`);
        unread.forEach((msg) => {
          socket.emit("messageRead", {
            conversationId,
            messageId: msg._id,
          });
        });
      }
    }
  }, [socket, isConnected, conversationId, messages, authUser]);

  // Compute index of first unread incoming message to show highlight
  useEffect(() => {
    if (authUser && messages.length > 0) {
      const idx = messages.findIndex(
        (msg) =>
          msg.user._id !== authUser.id &&
          // incoming message not yet marked read
          !msg.isRead
      );
      setFirstUnreadIndex(idx >= 0 ? idx : null);
    } else {
      setFirstUnreadIndex(null);
    }
  }, [messages, authUser]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (!socket || !isConnected || !conversationId || !authUser) {
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        _id: tempId,
        text: inputText.trim(),
        createdAt: new Date(),
        user: {
          _id: authUser?.id || "unknown",
          name: authUser?.name || "Me",
          profileImageUrl: authUser?.profileImageUrl,
        },
        conversationId: conversationId || "unknown",
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setInputText("");

      Alert.alert(
        "Connection Issue",
        "Your message will be sent when the connection is restored.",
        [{ text: "OK" }]
      );
      return;
    }

    const messagePayload = {
      content: inputText.trim(),
      conversationId: conversationId,
    };
    socket.emit("sendMessage", messagePayload); // Optimistic update
    const optimisticMsg: ChatMessage = {
      _id: `temp_${Date.now()}`,
      text: inputText.trim(),
      createdAt: new Date(),
      user: {
        _id: authUser.id,
        name: authUser.name,
        profileImageUrl: authUser.profileImageUrl,
      },
      conversationId: conversationId,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    handleTypingEmitter(false);

    // Always scroll to bottom when sending a message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      setShowScrollToBottom(false);
      setHasNewMessages(false);
    }, 100);
  };
  let typingTimerRef = useRef<number | null>(null);
  const handleTypingEmitter = (isCurrentlyTyping: boolean) => {
    if (!socket || !isConnected || !conversationId) return;
    socket.emit("typing", { conversationId, isTyping: isCurrentlyTyping });
  };

  const onInputTextChanged = (text: string) => {
    setInputText(text);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    if (isConnected && text.length > 0) {
      handleTypingEmitter(true);
      typingTimerRef.current = setTimeout(() => {
        handleTypingEmitter(false);
      }, 3000);
    } else if (isConnected) {
      handleTypingEmitter(false);
    }
  };
  const renderMessageItem = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const isMyMessage = item.user._id === authUser?.id;
    const currentMsgDate = item.createdAt;
    const previousMessage = index > 0 ? messages[index - 1] : null;

    // Divider indicating start of unread messages
    const showUnreadDivider = firstUnreadIndex === index;
    // Check if we should show date header (first message or different day from previous)
    const showDateHeader =
      index === 0 ||
      (previousMessage &&
        !isSameDay(currentMsgDate, previousMessage.createdAt));

    // Format date - show "Today" if the message is from today
    const formatMessageDate = (date: Date) => {
      const today = new Date();
      return isSameDay(date, today) ? "Today" : format(date, "PPPP");
    };

    return (
      <>
        {showDateHeader && (
          <View className="py-2 px-4 items-center">
            <View className="bg-cyan-100 rounded-full px-3 py-1">
              <Text className="text-xs font-urbanistMedium text-cyan-700">
                {formatMessageDate(currentMsgDate)}
              </Text>
            </View>
          </View>
        )}
        {/* Unread messages divider */}
        {showUnreadDivider && (
          <View className="py-2 px-4 items-center">
            <View className="bg-rose-100 rounded-full px-3 py-1">
              <Text className="text-xs font-urbanistMedium text-rose-700">
                New messages
              </Text>
            </View>
          </View>
        )}
        <View className={`p-2 ${isMyMessage ? "items-end" : "items-start"}`}>
          <View
            className={`max-w-[90%] ${
              isMyMessage ? "items-end" : "items-start"
            }`}>
            {!isMyMessage && isGroupChat && (
              <View className="flex-row items-center mb-1.5 ml-2 mt-0.5">
                {item.user.profileImageUrl ? (
                  <Image
                    source={{ uri: item.user.profileImageUrl }}
                    className="h-6 w-6 rounded-full mr-1.5"
                    defaultSource={require("../../assets/images/together-icon.png")}
                  />
                ) : (
                  <View className="h-6 w-6 rounded-full bg-cyan-200 items-center justify-center mr-1.5">
                    <Text className="text-xs text-cyan-700 font-urbanistBold">
                      {item.user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="text-xs font-urbanistBold text-cyan-700">
                  {item.user.name.split(" ")[0]}
                </Text>
              </View>
            )}
            <View
              className={`px-3 py-2 shadow ${
                isMyMessage
                  ? "bg-cyan-600 rounded-tl-xl rounded-tr-xl rounded-bl-xl"
                  : "bg-white rounded-tl-xl rounded-tr-xl rounded-br-xl"
              }`}>
              <Text
                className={`text-base font-urbanist ${
                  isMyMessage ? "text-white" : "text-gray-800"
                }`}>
                {item.text}
              </Text>
            </View>
            <View
              className={`mt-1 flex-row items-center w-full ${
                isMyMessage ? "justify-end" : "justify-start"
              }`}>
              {/* Time on left for received messages */}
              {!isMyMessage && (
                <Text className="text-xs text-gray-500 ml-1">
                  {format(item.createdAt, "p")}
                </Text>
              )}
              {/* Status icons and time on right for sent messages */}
              <View
                className={`flex-row items-center ${
                  !isMyMessage ? "hidden" : "mr-1"
                }`}>
                {isMyMessage && (
                  <Text className="text-xs text-cyan-700 mr-1">
                    {format(item.createdAt, "p")}
                  </Text>
                )}
                {isMyMessage && item.pending && (
                  // Message is pending (not sent to server yet)
                  <Ionicons name="time-outline" size={14} color="gray" />
                )}
                {isMyMessage &&
                  !item.pending &&
                  (() => {
                    // Determine recipient ID(s)
                    const recipientId = !isGroupChat && otherParticipantId;
                    // Check delivered status
                    const isDelivered =
                      item.deliveredTo &&
                      (isGroupChat
                        ? item.deliveredTo.length > 0
                        : typeof recipientId === "string" &&
                          item.deliveredTo.includes(recipientId));
                    // Check read status (for outgoing, check if recipient has read)
                    const isMessageRead =
                      typeof recipientId === "string"
                        ? item.readBy?.includes(recipientId)
                        : Array.isArray(item.readBy) && item.readBy.length > 0;
                    if (!isDelivered) {
                      // Sent but not delivered
                      return (
                        <Ionicons
                          name="checkmark-outline"
                          size={14}
                          color="gray"
                        />
                      );
                    }
                    if (isDelivered && !isMessageRead) {
                      // Delivered but not read
                      return (
                        <Ionicons
                          name="checkmark-done-outline"
                          size={14}
                          color="gray"
                        />
                      );
                    }
                    // Read
                    return (
                      <Ionicons
                        name="checkmark-done-outline"
                        size={14}
                        color="#0891b2"
                      />
                    );
                  })()}
              </View>
            </View>
          </View>
        </View>
      </>
    );
  };
  const debugReadStatus = () => {
    console.log("------- MESSAGE READ STATUS DEBUG -------");
    messages.forEach((msg) => {
      if (msg.user._id === authUser?.id) {
        console.log(
          `Message: "${msg.text.substring(0, 20)}..." ID: ${msg._id} Read: ${
            msg.isRead ? "YES" : "NO"
          }`
        );
      }
    });
  };

  // Debug function to manually check online status
  const checkParticipantStatus = useCallback(() => {
    if (!socket || !isConnected || !otherParticipantId || !conversationId) {
      console.log("Cannot check participant status - missing required data", {
        socketReady: !!socket,
        connected: isConnected,
        participantId: otherParticipantId,
        convId: conversationId,
      });
      return;
    }

    console.log(
      `Manually requesting status for participant ${otherParticipantId}`
    );
    socket.emit("getParticipantStatus", {
      targetUserId: otherParticipantId,
      conversationId: conversationId,
    });
  }, [socket, isConnected, otherParticipantId, conversationId]);

  // Effect to animate status indicator when status changes
  useEffect(() => {
    // Create animation for online status changes
    const animate = () => {
      setStatusAnimationScale(1.5);
      setTimeout(() => setStatusAnimationScale(1), 300);
    };

    // Run animation when status changes
    animate();

    // Also log status change for debugging
    console.log(
      `[ONLINE STATUS] Status changed to: ${
        participantOnlineStatus ? "ONLINE" : "OFFLINE"
      }`
    );
  }, [participantOnlineStatus]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-cyan-50">
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }
  if (!authUser)
    return (
      <View className="flex-1 justify-center items-center bg-cyan-50">
        <Text className="text-cyan-700 font-urbanistMedium">
          Authenticating...
        </Text>
      </View>
    );
  return (
    <SafeAreaView
      className="flex-1 bg-cyan-50"
      style={{ paddingTop: StatusBar.currentHeight }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={true}
      />
      {/* Header */}
      <View className="p-4 bg-cyan-50 flex-row items-center border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#0891b2" />
        </TouchableOpacity>
        {/* Profile Image - Make it clickable to navigate to profile */}
        <TouchableOpacity
          className="mr-3"
          onPress={() => {
            if (isGroupChat && conversationId) {
              router.push(
                `/(conversation)/groupProfile?groupId=${conversationId}`
              );
            } else if (otherParticipantId && !isGroupChat) {
              router.push(
                `/(contacts)/contactProfile?contactId=${otherParticipantId}`
              );
            }
          }}>
          {headerProfileImage ? (
            <Image
              source={{ uri: headerProfileImage }}
              className="h-10 w-10 rounded-full"
              defaultSource={require("../../assets/images/together-icon.png")}
            />
          ) : (
            <View className="h-10 w-10 rounded-full bg-cyan-200 items-center justify-center">
              <Ionicons
                name={isGroupChat ? "people" : "person"}
                size={20}
                color="#0891b2"
              />
            </View>
          )}
        </TouchableOpacity>
        <View className="flex-1">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (isGroupChat && conversationId) {
                  router.push(
                    `/(conversation)/groupProfile?groupId=${conversationId}`
                  );
                } else if (otherParticipantId && !isGroupChat) {
                  router.push(
                    `/(contacts)/contactProfile?contactId=${otherParticipantId}`
                  );
                }
              }}>
              <Text className="text-xl font-urbanistBold text-cyan-700">
                {headerTitle}
              </Text>
            </TouchableOpacity>
            {/* Simple online status dot indicator */}
            {!isGroupChat && (
              <TouchableOpacity
                onPress={checkParticipantStatus}
                className="ml-2">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${
                    participantOnlineStatus ? "bg-green-500" : "bg-gray-300"
                  }`}
                  style={{
                    transform: [{ scale: statusAnimationScale }],
                  }}
                />
              </TouchableOpacity>
            )}
          </View>
          {isGroupChat && (
            <Text className="text-xs font-urbanist text-cyan-600">
              {messages.length > 0
                ? `${messages.length} messages`
                : "No messages yet"}
            </Text>
          )}
        </View>
        {isGroupChat ? (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(conversation)/groupProfile?groupId=${conversationId}`
              )
            }
            className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#0891b2"
            />
            <Text className="text-xs font-urbanist text-gray-600 ml-1">
              Group Info
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              if (otherParticipantId && !isGroupChat) {
                router.push(
                  `/(contacts)/contactProfile?contactId=${otherParticipantId}`
                );
              }
            }}
            className="flex-row items-center px-2 py-1 rounded-full">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#0891b2"
            />
          </TouchableOpacity>
        )}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}>
        {!isConnected && (
          <View className="bg-red-100 py-2 px-4 flex-row items-center justify-between">
            <View>
              <Text className="text-red-700 font-urbanistMedium">
                Connection lost
              </Text>
              <Text className="text-xs text-red-500 font-urbanist">
                Server: {serverUrl?.substring(0, 30)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                attemptReconnect();
                Alert.alert(
                  "Reconnecting",
                  `Trying to connect to ${serverUrl}`
                );
              }}
              className="bg-red-600 py-1 px-3 rounded-md">
              <Text className="text-white font-urbanistMedium">Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="flex-1 relative">
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-2 pt-2 bg-cyan-50"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
            onScroll={(event) => {
              const offsetFromBottom =
                event.nativeEvent.contentSize.height -
                event.nativeEvent.layoutMeasurement.height -
                event.nativeEvent.contentOffset.y;

              scrollOffsetRef.current = offsetFromBottom;

              if (offsetFromBottom > 100) {
                setShowScrollToBottom(true);
              } else {
                setShowScrollToBottom(false);
                setHasNewMessages(false);
              }
            }}
            onContentSizeChange={() => {
              if (scrollOffsetRef.current < 100 || messages.length <= 1) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onLayout={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListFooterComponent={() => (
              <View style={{ minHeight: 48 }}>
                {isTyping && typingUserName ? (
                  <TypingIndicator
                    user={typingUserName}
                    profileImg={headerProfileImage}
                  />
                ) : null}
              </View>
            )}
          />

          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <TouchableOpacity
              onPress={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                setShowScrollToBottom(false);
                setHasNewMessages(false);
              }}
              className="absolute bottom-4 right-4 bg-cyan-600 h-10 w-10 rounded-full items-center justify-center shadow-md z-10">
              {/* Ensure button is above list content */}
              {hasNewMessages && (
                <View className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full" />
              )}
              <Ionicons name="arrow-down" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
        {/* Message Input Area */}
        <View className="flex-row items-center border-t px-4 py-3 border-gray-200 bg-cyan-50">
          <TextInput
            value={inputText}
            onChangeText={onInputTextChanged}
            placeholder="Type a message..."
            className="flex-1 h-10 bg-white rounded-full px-4 mr-2 font-urbanist"
            multiline
            editable={true}
            style={{ minHeight: 40 }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`p-2 rounded-full  ${
              !inputText.trim() ? "opacity-50" : "bg-cyan-600"
            }`}>
            <Ionicons
              name="send"
              size={24}
              color={!inputText.trim() ? "#9ca3af" : "white"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
