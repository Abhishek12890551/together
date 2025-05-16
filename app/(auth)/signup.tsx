import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function SignUp() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // New state variables for validation errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const screenWidth = Dimensions.get("window").width;

  // Client-side validation function
  const validateForm = () => {
    let isValid = true;

    // Reset all errors first
    setNameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Name validation
    if (!name || name.trim() === "") {
      setNameError("Full name is required");
      isValid = false;
    }

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

    // Password validation
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      isValid = false;
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        setPasswordError(
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        );
        isValid = false;
      }
    }

    // Confirm password validation
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
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
      const success = await register(name, email, password, confirmPassword); // Pass confirmPassword for server validation
      // AuthContext handles navigation on success
    } catch (error: any) {
      console.error("Registration error:", error);
      // Handle field-specific errors from the server
      if (error && error.field) {
        switch (error.field) {
          case "name":
            setNameError(error.message);
            break;
          case "email":
            setEmailError(error.message);
            break;
          case "password":
            setPasswordError(error.message);
            break;
          case "confirmPassword":
            setConfirmPasswordError(error.message);
            break;
          default:
            // General error handling
            alert(`Registration failed: ${error.message}`);
        }
      }
    } finally {
      setIsSubmitting(false); 
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      className="bg-cyan-50"
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}>
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />

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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header with back button - RETAINED */}
        <View className="flex-row items-center px-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>

        {/* Sign Up form - RETAINED */}
        <View className="flex-1 px-8 ">
          {/* Logo and Create Account Text - RETAINED */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full overflow-hidden bg-cyan-100/50 mb-4">
              <Image
                source={require("../../assets/images/together-icon.png")}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <Text className="font-ubuntuBold text-3xl text-gray-800">
              Create Account
            </Text>
            <Text className="font-plusJakarta text-gray-600 text-center mt-2 text-base">
              Sign up to get started
            </Text>
          </View>
          <View className="bg-white/70 rounded-xl p-5 shadow-sm">
            {/* Name field - RETAINED */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Full Name
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Ionicons name="person-outline" size={20} color="gray" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (nameError) setNameError("");
                  }}
                  editable={!isSubmitting} // Disable input while submitting
                />
              </View>
              {/* Error message for name field */}
              {nameError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {nameError}
                </Text>
              ) : null}
            </View>

            {/* Email field - RETAINED */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Email
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Ionicons name="mail-outline" size={20} color="gray" />
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
              {/* Error message for email field */}
              {emailError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Password field - RETAINED */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Password
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Ionicons name="lock-closed-outline" size={20} color="gray" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Create a password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError("");
                    if (
                      confirmPasswordError &&
                      confirmPassword &&
                      text === confirmPassword
                    ) {
                      setConfirmPasswordError("");
                    }
                  }}
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
              {/* Error message for password field */}
              {passwordError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password field - RETAINED */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Confirm Password
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Ionicons name="lock-closed-outline" size={20} color="gray" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Confirm your password"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) setConfirmPasswordError("");
                    // Clear the error if passwords now match
                    if (password === text) {
                      setConfirmPasswordError("");
                    }
                  }}
                  autoCapitalize="none"
                  editable={!isSubmitting} // Disable input while submitting
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}>
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
              {/* Error message for confirm password field */}
              {confirmPasswordError ? (
                <Text className="text-red-500 text-xs mt-1 font-plusJakarta">
                  {confirmPasswordError}
                </Text>
              ) : null}
            </View>

            {/* Sign Up Button - UPDATED with loading state */}
            <TouchableOpacity
              className={`bg-cyan-500 rounded-full py-3.5 items-center mb-4 ${
                isSubmitting ? "opacity-50" : ""
              }`}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center text-base font-ubuntuMedium">
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          </View>
          {/* Sign In Link - RETAINED */}
          <View className="flex-row justify-center mt-6 mb-6">
            <Text className="text-gray-600 font-plusJakarta">
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text className="text-cyan-600 font-plusJakartaBold">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
          {/* Terms and Conditions - RETAINED */}
          <Text className="text-gray-500 text-center text-xs mb-6 font-plusJakarta">
            By signing up, you agree to our
            <Text className="text-cyan-600 font-plusJakartaMedium">
              Terms of Service
            </Text>
            and
            <Text className="text-cyan-600 font-plusJakartaMedium">
              Privacy Policy
            </Text>
          </Text>
          {/* Extra padding space to ensure content isn't hidden under keyboard */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
