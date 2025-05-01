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
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axiosInstance from "../../utils/axiosInstance.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  useFocusEffect(
    React.useCallback(() => {
      setEmail("");
      setPassword("");
      setShowPassword(false);

      return () => {};
    }, [])
  );

  const handleSubmit = () => {
    if (!email || !password) {
      alert("Please fill in all fields.");
      return;
    }
    axiosInstance
      .post("/auth/login", { email, password })
      .then((response) => {
        if (response.status === 200 && response.data.success) {
          AsyncStorage.setItem("user", JSON.stringify(response.data.user));
          AsyncStorage.setItem("token", response.data.token);
          console.log("User data:", response.data.user);
          console.log("Token:", response.data.token);
          alert("Login successful!");
          router.push("/home");
        } else {
          alert(
            response.data.message ||
              "Login failed. Please check your credentials."
          );
        }
      })
      .catch((error) => {
        console.error("Login Error:", error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(`Login failed: ${error.response.data.message}`);
        } else {
          alert("An error occurred during login. Please try again later.");
        }
      });
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

        <View className="flex-row items-center px-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-8">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full overflow-hidden bg-cyan-100/50 mb-4">
              <Image
                source={require("../../assets/images/logo-placeholder.png")}
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

          <View className="bg-white/70 rounded-xl p-5 shadow-sm">
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

            <View className="mb-2">
              <Text className="text-gray-700 mb-2 font-plusJakartaMedium">
                Password
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Ionicons name="lock-closed-outline" size={20} color="gray" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800 font-plusJakarta"
                  placeholder="Enter your password"
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

            <TouchableOpacity className="self-end mb-6">
              <Text className="text-cyan-600 font-plusJakartaMedium">
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-cyan-500 rounded-full py-3.5 items-center mb-4"
              onPress={handleSubmit}>
              <Text className="text-white text-center text-base font-ubuntuMedium">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8 mb-6">
            <Text className="text-gray-600 font-plusJakarta">
              Don't have an account?{" "}
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
