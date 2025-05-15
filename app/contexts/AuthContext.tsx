import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import axiosInstance from "@/utils/axiosInstance";

interface User {
  _id: any;
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  isEmailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailValue: string, passwordValue: string) => Promise<boolean>;
  register: (
    nameValue: string,
    emailValue: string,
    passwordValue: string,
    confirmPasswordValue?: string
  ) => Promise<boolean>;
  verifyEmail: (userId: string, verificationCode: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
  logout: () => void;
  pendingVerificationUserId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerificationUserId, setPendingVerificationUserId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken: string | null = null;
      let storedUserString: string | null = null;
      let storedPendingUserId: string | null = null;

      try {
        userToken = await AsyncStorage.getItem("token");
        storedUserString = await AsyncStorage.getItem("user");
        storedPendingUserId = await AsyncStorage.getItem(
          "pendingVerificationUserId"
        );

        if (storedPendingUserId) {
          setPendingVerificationUserId(storedPendingUserId);
        }

        if (userToken && storedUserString) {
          const storedUser: User = JSON.parse(storedUserString);
          setToken(userToken);
          setUser(storedUser);
        }
      } catch (e) {
        console.error("AuthContext: Restoring token/user failed", e);
      }
      setIsLoading(false);
    };
    bootstrapAsync();
  }, []);
  const login = async (
    emailValue: string,
    passwordValue: string
  ): Promise<boolean> => {
    try {
      const response = await axiosInstance.post("/auth/login", {
        email: emailValue,
        password: passwordValue,
      });

      if (response.status === 200 && response.data.success) {
        const { token: newToken, user: userData } = response.data;
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        await AsyncStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(userData);
        router.replace("/home");
        return true;
      } else {
        alert(
          response.data.message ||
            "Login failed. Please check your credentials."
        );
        return false;
      }
    } catch (error: any) {
      console.error("AuthContext Login Error:", error);

      // Handle email verification requirement
      if (error.response?.data?.requiresVerification) {
        const userId = error.response.data.userId;
        setPendingVerificationUserId(userId);
        await AsyncStorage.setItem("pendingVerificationUserId", userId);

        // Navigate to verification page
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: emailValue },
        });
        return false;
      }

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        // Check if there's a specific field error
        if (error.response.data.field) {
          const fieldError = {
            field: error.response.data.field,
            message: error.response.data.message,
          };
          // Throw the field error so it can be handled by the component
          throw fieldError;
        } else {
          alert(`Login failed: ${error.response.data.message}`);
        }
      } else {
        alert("An error occurred during login. Please try again later.");
      }
      return false;
    }
  };
  const register = async (
    nameValue: string,
    emailValue: string,
    passwordValue: string,
    confirmPasswordValue?: string
  ): Promise<boolean> => {
    try {
      const requestData: any = {
        name: nameValue,
        email: emailValue,
        password: passwordValue,
      };

      // Include confirmPassword if provided
      if (confirmPasswordValue) {
        requestData.confirmPassword = confirmPasswordValue;
      }

      const response = await axiosInstance.post("/auth/register", requestData);

      if (response.status === 201 && response.data.success) {
        const { token: newToken, user: userData } = response.data;

        // Check if email verification is required
        if (userData && !userData.isEmailVerified) {
          // Store user ID for verification
          setPendingVerificationUserId(userData.id);
          await AsyncStorage.setItem("pendingVerificationUserId", userData.id);

          // Show message about verification email
          alert(
            response.data.message ||
              "Please check your email for a verification code."
          );

          // Navigate to verification page
          router.replace({
            pathname: "/(auth)/verify-email",
            params: { email: emailValue },
          });
          return true;
        }

        await AsyncStorage.setItem("user", JSON.stringify(userData));
        await AsyncStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(userData);
        router.replace("/home");
        return true;
      } else {
        alert(
          response.data.message || "Registration failed. Please try again."
        );
        return false;
      }
    } catch (error: any) {
      console.error("AuthContext Registration Error:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        // Check if there's a specific field error
        if (error.response.data.field) {
          const fieldError = {
            field: error.response.data.field,
            message: error.response.data.message,
          };
          // Throw the field error so it can be handled by the component
          throw fieldError;
        } else {
          alert(`Registration failed: ${error.response.data.message}`);
        }
      } else {
        alert("An error occurred during registration. Please try again later.");
      }
      return false;
    }
  };

  const verifyEmail = async (
    userId: string,
    verificationCode: string
  ): Promise<boolean> => {
    try {
      const response = await axiosInstance.post("/auth/verify-email", {
        userId,
        verificationCode,
      });

      if (response.status === 200 && response.data.success) {
        // If verification is successful and we got a token and user data
        if (response.data.token && response.data.user) {
          const { token: newToken, user: userData } = response.data;

          // Save to storage and state
          await AsyncStorage.setItem("user", JSON.stringify(userData));
          await AsyncStorage.setItem("token", newToken);
          setToken(newToken);
          setUser(userData);

          // Clear pending verification
          setPendingVerificationUserId(null);
          await AsyncStorage.removeItem("pendingVerificationUserId");

          // Navigate to home
          router.replace("/home");
        }
        return true;
      } else {
        alert(
          response.data.message || "Verification failed. Please try again."
        );
        return false;
      }
    } catch (error: any) {
      console.error("Email Verification Error:", error);
      if (error.response?.data?.message) {
        alert(`Verification failed: ${error.response.data.message}`);
      } else {
        alert("An error occurred during email verification. Please try again.");
      }
      return false;
    }
  };

  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.post("/auth/resend-verification", {
        email,
      });

      if (response.status === 200) {
        // If there's a userId in the response, update the pending verification
        if (response.data.userId) {
          setPendingVerificationUserId(response.data.userId);
          await AsyncStorage.setItem(
            "pendingVerificationUserId",
            response.data.userId
          );
        }

        alert(response.data.message || "Verification email has been sent.");
        return true;
      } else {
        alert(response.data.message || "Could not resend verification email.");
        return false;
      }
    } catch (error: any) {
      console.error("Resend Verification Error:", error);
      if (error.response?.data?.message) {
        alert(`Failed to resend: ${error.response.data.message}`);
      } else {
        alert("An error occurred. Please try again.");
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("pendingVerificationUserId");
    } catch (error) {
      console.error("AuthContext: Error clearing auth data", error);
    }
    setToken(null);
    setUser(null);
    setPendingVerificationUserId(null);
    router.replace("/welcome");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
        resendVerificationEmail,
        pendingVerificationUserId,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
