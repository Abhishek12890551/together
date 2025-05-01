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
  ScrollView, // Added ScrollView import
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axiosInstance from "../../utils/axiosInstance.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  const handleSubmit = () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    axiosInstance
      .post("/auth/register", { name, email, password })
      .then((response) => {
        if (response.status === 201 && response.data.success) {
          AsyncStorage.setItem("user", JSON.stringify(response.data.user));
          AsyncStorage.setItem("token", response.data.token);
          alert("Registration successful!");
          router.push("/home"); // Navigate to home after successful registration
        } else {
          alert(
            response.data.message || "Registration failed. Please try again."
          );
        }
      })
      .catch((error) => {
        console.error("Registration Error:", error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(`Registration failed: ${error.response.data.message}`);
        } else {
          alert(
            "An error occurred during registration. Please try again later."
          );
        }
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cyan-50">
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />

      {/* Background decorations */}
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

      <ScrollView // Wrap content in ScrollView to prevent overflow
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside inputs
      >
        {/* Header */}
        <View className="flex-row items-center px-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>

        {/* Sign Up form */}
        <View className="flex-1 px-8 ">
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full overflow-hidden bg-cyan-100/50 mb-4">
              <Image
                source={require("../../assets/images/logo-placeholder.png")}
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
            {/* Name field */}
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
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email field */}
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
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password field */}
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
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password field */}
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
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              className="bg-cyan-500 rounded-full py-3.5 items-center mb-4"
              onPress={handleSubmit} // Call handleSubmit on press
            >
              <Text className="text-white text-center text-base font-ubuntuMedium">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <View className="flex-row justify-center mt-6 mb-6">
            <Text className="text-gray-600 font-plusJakarta">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/signin")}>
              <Text className="text-cyan-600 font-plusJakartaBold">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Conditions */}
          <Text className="text-gray-500 text-center text-xs mb-6 font-plusJakarta">
            By signing up, you agree to our{" "}
            <Text className="text-cyan-600 font-plusJakartaMedium">
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text className="text-cyan-600 font-plusJakartaMedium">
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
