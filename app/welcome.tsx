import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import React from "react";
import { router } from "expo-router";

export default function WelcomeScreen() {
  const screenWidth = Dimensions.get("window").width;

  return (
    <View className="flex-1 bg-cyan-50">
      <StatusBar
        backgroundColor="#ecfeff"
        barStyle="dark-content"
        translucent={true}
      />

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
        <View
          className="absolute rounded-full bg-red-200 opacity-60"
          style={{
            width: screenWidth * 0.7,
            height: screenWidth * 0.7,
            right: -screenWidth * 0.3,
            bottom: screenWidth * 0.4,
          }}
        />
        <View
          className="absolute rounded-full bg-cyan-200 opacity-60"
          style={{
            width: screenWidth * 0.6,
            height: screenWidth * 0.6,
            left: -screenWidth * 0.3,
            bottom: screenWidth * 0.2,
          }}
        />
      </View>

      <View className="flex-1 justify-between">
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-80 h-80 rounded-full overflow-hidden bg-cyan-100/50 mx-auto flex justify-center items-center">
            <Image
              source={require("../assets/images/welcomeHero-removebg-preview.png")}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="font-ubuntuMedium text-3xl text-gray-800 mt-6">
            Welcome to
            <Text className="text-cyan-500 font-ubuntuBold"> Together</Text>
          </Text>

          <Text className="font-plusJakarta text-gray-600 text-center mt-3 text-base">
            Making the connections effortless.
          </Text>

          <Text className="font-plusJakarta text-gray-600 text-center mt-2 text-base">
            Join us to connect with your friends and family.
          </Text>
        </View>

        <View className="px-8 mb-4">
          <View className="items-center mb-6">
            <TouchableOpacity
              className="bg-cyan-500 rounded-full py-4 w-72 items-center shadow-md"
              onPress={() => router.push("/signup")}>
              <Text className="text-white text-center text-base font-ubuntuMedium">
                Get Started
              </Text>
            </TouchableOpacity>

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
          </View>

          {/* Terms text */}
          <Text className="text-gray-500 text-center text-sm font-plusJakarta pb-4">
            By signing up, you agree to our
            <Text className="text-cyan-500 font-plusJakartaMedium">
              Terms of Service
            </Text>
            and
            <Text className="text-cyan-500 font-plusJakartaMedium">
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </View>
    </View>
  );
}
