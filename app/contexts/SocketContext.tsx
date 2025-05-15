import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { BACKEND_URL } from "@/utils/const";

// Set a single server URL as requested
const SERVER_URL = BACKEND_URL;
// const SERVER_URL = "http://192.168.0.230:5000";
console.log("SocketContext: Using server URL:", SERVER_URL);

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  serverUrl: string;
  attemptReconnect: () => void;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const serverUrl = SERVER_URL;
  const failedAttemptsRef = useRef(0);

  const createSocketConnection = () => {
    console.log(`SocketContext: Attempting to connect to ${SERVER_URL}`);

    if (socket) {
      console.log(
        "SocketContext: Cleaning up existing socket before creating a new one"
      );
      socket.disconnect();
      setIsConnected(false);
    }

    const newSocket = io(SERVER_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log(
        "SocketContext: Connected to socket server with ID:",
        newSocket.id,
        "Transport:",
        newSocket.io.engine.transport.name,
        "URL:",
        SERVER_URL
      );
      setIsConnected(true);
      failedAttemptsRef.current = 0; // Reset failed attempts counter

      if (user) {
        newSocket.emit("user_online", {
          userId: user.id,
          username: user.name,
        });
        console.log("SocketContext: Emitted user_online event");
      }
    });

    // Online/offline status handling
    newSocket.on("userOnline", ({ userId }) => {
      console.log(`SocketContext: User ${userId} is online`);
      setOnlineUsers((prev) => {
        const updatedSet = new Set(prev);
        updatedSet.add(userId);
        return updatedSet;
      });
    });

    newSocket.on("userOffline", ({ userId }) => {
      console.log(`SocketContext: User ${userId} is offline`);
      setOnlineUsers((prev) => {
        const updatedSet = new Set(prev);
        updatedSet.delete(userId);
        return updatedSet;
      });
    });

    // Monitor transport changes - using Socket.io events
    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`SocketContext: Reconnected after ${attemptNumber} attempts`);
      console.log(
        `SocketContext: Current transport: ${newSocket.io.engine.transport.name}`
      );
      setIsConnected(true);
      failedAttemptsRef.current = 0; // Reset failed attempts counter
    });

    newSocket.on("disconnect", (reason) => {
      console.log("SocketContext: Disconnected from socket server:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error(
        "SocketContext: Connection error:",
        err.message,
        (err as any).data || ""
      );
      setIsConnected(false);
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`SocketContext: Reconnect attempt #${attemptNumber}`);
    });

    setSocket(newSocket);
    return newSocket;
  };

  const attemptReconnect = () => {
    // Just reconnect to the same URL
    console.log(`SocketContext: Manually reconnecting to ${SERVER_URL}`);
    if (socket) {
      socket.connect();
    } else {
      createSocketConnection();
    }
  };

  useEffect(() => {
    if (token && user) {
      const newSocket = createSocketConnection();

      return () => {
        console.log("SocketContext: Cleaning up socket connection.");
        newSocket.disconnect();
        setIsConnected(false);
        setSocket(null);
      };
    } else {
      // If no token or user, ensure any existing socket is disconnected
      if (socket) {
        console.log(
          "SocketContext: No token/user, disconnecting existing socket."
        );
        socket.disconnect();
        setIsConnected(false);
        setSocket(null);
      }
    }
  }, [token, user]); // Re-run effect if token or user changes

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, serverUrl, attemptReconnect, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
