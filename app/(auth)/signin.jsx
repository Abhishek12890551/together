import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";

export default function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Error states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const screenWidth = Dimensions.get("window").width;

  useFocusEffect(
    React.useCallback(() => {
      setEmail("");
      setPassword("");
      setShowPassword(false);
      return () => {};
    }, [])
  );
  // Client-side validation function
  const validateForm = () => {
    let isValid = true;

    // Reset all errors
    setEmailError("");
    setPasswordError("");

    // Email validation
    if (!email || email.trim() === "") {
      setEmailError("Email is required");
      isValid = false;
    } else {
      const emailRegex = /^[\w-]+(\.[\w-]+)*@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setEmailError("Please enter a valid email address");
        isValid = false;
      }
    }

    // Password validation (basic check for login)
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(email, password); // Call the login function from AuthContext
    } catch (error) {
      console.error("Login error:", error);
      // Handle field-specific errors
      if (error && error.field) {
        if (error.field === "email") {
          setEmailError(error.message);
        } else if (error.field === "password") {
          setPasswordError(error.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1">
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-cyan-50">
        {/* Background decorations - RETAINED */}
        <View className="absolute inset-0">
          <View
            className="absolute rounded-full bg-red-200 opacity-60"
            style={{
              width: screenWidth * 0.8,
              height: screenWidth * 0.8,
              left: -screenWidth * 0.3,
              top: screenWidth * 0.4,
            }}
          />
          <View
            className="absolute rounded-full bg-cyan-200 opacity-60"
            style={{
              width: screenWidth * 0.9,
              height: screenWidth * 0.9,
              right: -screenWidth * 0.3,
              top: screenWidth * 0.1,
            }}
          />
        </View>

        {/* Header with back button - RETAINED */}
        <View className="flex-row items-center px-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-8">
          {/* Logo and Welcome Text - RETAINED */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full overflow-hidden bg-cyan-100/50 mb-4">
              <Image
                source={require("../../assets/images/together-icon.png")}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="font-ubuntuBold text-3xl text-gray-800">
              Welcome Back
            </Text>
            <Text className="font-plusJakarta text-gray-600 text-center mt-2 text-base">
              Sign in to continue
            </Text>
          </View>

          {/* Sign In Form - RETAINED */}
          <View className="bg-white/70 rounded-xl p-5 shadow-sm">
            {/* Email field - RETAINED */} 
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Email
              </Text>
              <View
                className={`flex-row items-center border ${
                  emailError ? "border-red-500" : "border-gray-300"
                } rounded-lg px-3 py-2 bg-white`}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailError ? "#ef4444" : "gray"}
                />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting} // Disable input while submitting
                />
              </View>
              {emailError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {emailError}
                </Text>
              ) : null}
            </View>
            {/* Password field - RETAINED */}
            <View className="mb-2">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Password
              </Text>
              <View
                className={`flex-row items-center border ${
                  passwordError ? "border-red-500" : "border-gray-300"
                } rounded-lg px-3 py-2 bg-white`}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={passwordError ? "#ef4444" : "gray"}
                />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError("");
                  }}
                  autoCapitalize="none"
                  editable={!isSubmitting} // Disable input while submitting
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={passwordError ? "#ef4444" : "gray"}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {passwordError}
                </Text>
              ) : null}
            </View>
            {/* Forgot Password link - RETAINED */}
            <TouchableOpacity className="self-end mb-6">
              <Text className="text-cyan-600 font-plusJakartaMedium">
                Forgot Password?
              </Text>
            </TouchableOpacity>
            {/* Sign In Button - UPDATED with loading state */}
            <TouchableOpacity
              className={`bg-cyan-500 rounded-full py-3.5 items-center mb-4 ${
                isSubmitting ? "opacity-50" : ""
              }`}
              onPress={handleSubmit}
              disabled={isSubmitting} // Disable button while submitting
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-ubuntuMedium">
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link - RETAINED */}
          <View className="flex-row justify-center mt-8 mb-6">
            <Text className="text-gray-600 font-plusJakarta">
              Don't have an account? 
            </Text>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text className="text-cyan-600 font-plusJakartaBold">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
