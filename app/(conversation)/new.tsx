import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

export default function NewConversation() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!recipientId || !socket || !isConnected || !user) {
      setError("Missing required information to create conversation");
      setIsCreating(false);
      return;
    }

    // Add debug logging for socket connection state
    console.log(
      `Socket connection status: ${isConnected ? "Connected" : "Disconnected"}`
    );
    console.log(`Creating conversation with recipient: ${recipientId}`);

    // Set a timeout to handle cases where socket event doesn't fire
    timeoutRef.current = setTimeout(() => {
      console.log(
        "Timeout: No response received for new conversation creation"
      );
      setIsCreating(false);
      setError("Navigation timeout. Redirecting to home...");

      setTimeout(() => {
        router.replace("/(home)/home");
      }, 1500);
    }, 8000); // 8 seconds timeout

    const handleNewConversation = (conversation: any) => {
      console.log(
        "Received newConversationCreated event:",
        conversation?._id || "No ID received"
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (conversation && conversation._id) {
        setTimeout(() => {
          router.replace(`/(conversation)/${conversation._id}`);
        }, 300);
      } else {
        setError("Invalid conversation data received");
        setIsCreating(false);
      }
    };

    socket.on("newConversationCreated", handleNewConversation);

    socket.emit("sendMessage", {
      content: "Started a conversation",
      recipientId: recipientId,
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      socket.off("newConversationCreated", handleNewConversation);
    };
  }, [recipientId, socket, isConnected, user, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      {isCreating ? (
        <>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text className="font-urbanistBold mt-4 text-gray-600">
            Creating conversation...
          </Text>
        </>
      ) : error ? (
        <Text className="font-urbanistBold text-red-500 p-4 text-center">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
