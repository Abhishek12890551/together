import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail, resendVerificationEmail, pendingVerificationUserId } =
    useAuth();
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      alert("Please enter the verification code sent to your email.");
      return;
    }

    if (!pendingVerificationUserId) {
      alert("User ID not found. Please try logging in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmail(pendingVerificationUserId, verificationCode.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      alert("Email address is required to resend verification code.");
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationEmail(email);
    } finally {
      setIsResending(false);
    }
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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled">
        {/* Header with back button */}
        <View className="flex-row items-center px-4 pt-12">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
        </View>

        {/* Verification Form */}
        <View className="flex-1 px-8 justify-center">
          <View className="items-center mb-8">
            <Text className="font-urbanistBold text-2xl text-cyan-700 text-center">
              Verify Your Email
            </Text>
            <Text className="font-urbanist text-gray-600 text-center mt-2">
              We've sent a verification code to{"\n"}
              <Text className="font-urbanistBold">{email}</Text>
            </Text>
          </View>

          {/* Verification code input */}
          <View className="mb-6">
            <Text className="font-urbanistMedium text-gray-700 mb-2">
              Verification Code
            </Text>
            <TextInput
              className="bg-white p-4 rounded-xl font-urbanist text-gray-800 border border-gray-200"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {/* Verify button */}
          <TouchableOpacity
            className="bg-cyan-600 rounded-xl py-4 items-center mb-4"
            onPress={handleVerify}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-urbanistBold text-lg">
                Verify Email
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend code */}
          <TouchableOpacity
            className="items-center py-3"
            onPress={handleResendCode}
            disabled={isResending}>
            {isResending ? (
              <ActivityIndicator color="#0891b2" size="small" />
            ) : (
              <Text className="font-urbanistMedium text-cyan-700">
                Resend Verification Code
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
