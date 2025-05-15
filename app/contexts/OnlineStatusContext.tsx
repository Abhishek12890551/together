import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "./SocketContext";
import axiosInstance from "../../utils/axiosInstance";

interface OnlineStatusContextType {
  isAppActive: boolean;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(
  undefined
);

export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error(
      "useOnlineStatus must be used within an OnlineStatusProvider"
    );
  }
  return context;
};

export const OnlineStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAppActive, setIsAppActive] = useState<boolean>(true);
  const { socket } = useSocket();

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App comes to foreground
        setIsAppActive(true);
        try {
          // Update online status on server
          await axiosInstance.post("/users/online");

          // If we have a socket connection, send the online status there too
          if (socket?.connected) {
            socket.emit("userOnlineStatus", { isOnline: true });
          }
        } catch (error) {
          console.error("Error updating online status:", error);
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        // App goes to background
        setIsAppActive(false);
        try {
          // Update offline status on server
          await axiosInstance.post("/users/offline");

          // If we have a socket connection, send the offline status there too
          if (socket?.connected) {
            socket.emit("userOnlineStatus", { isOnline: false });
          }
        } catch (error) {
          console.error("Error updating offline status:", error);
        }
      }
    };

    // Subscribe to AppState change events
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Initial online status update when the app starts
    const updateInitialOnlineStatus = async () => {
      try {
        await axiosInstance.post("/users/online");
        if (socket?.connected) {
          socket.emit("userOnlineStatus", { isOnline: true });
        }
      } catch (error) {
        console.error("Error setting initial online status:", error);
      }
    };

    updateInitialOnlineStatus();

    // Clean up
    return () => {
      subscription.remove();
    };
  }, [socket]);

  return (
    <OnlineStatusContext.Provider value={{ isAppActive }}>
      {children}
    </OnlineStatusContext.Provider>
  );
};
