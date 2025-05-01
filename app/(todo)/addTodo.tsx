import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define TodoItem interface
interface TodoItem {
  title: string;
  completed: boolean;
}

export default function AddTodoScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<TodoItem[]>([
    { title: "", completed: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Updated consistent color scheme
  const backgroundColor = "#f0fdff";
  const primaryColor = "#0891b2";
  const darkTextColor = "#0e7490";
  const lightBgColor = "#ffffff";
  const accentColor = "#0ea5e9";
  const buttonColor = "#ef4444";
  const dangerColor = "#ef4444";

  const addItem = () => {
    setItems([...items, { title: "", completed: false }]);
  };

  // Update an item at specific index
  const updateItemText = (text: string, index: number) => {
    const newItems = [...items];
    newItems[index].title = text;
    setItems(newItems);
  };

  // Remove an item at specific index
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    } else {
      // Keep at least one empty item
      setItems([{ title: "", completed: false }]);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title for your todo list.");
      return;
    }

    // Filter out empty items and ensure we have at least one valid item
    const validItems = items.filter((item) => item.title.trim().length > 0);
    if (validItems.length === 0) {
      Alert.alert("Error", "Please add at least one todo item.");
      return;
    }

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      await axiosInstance.post(
        "/todos",
        {
          title,
          items: validItems,
        },
        {
          headers: { Authorization: `${token}` },
        }
      );

      // Success - navigate back to todo list
      router.push("/(todo)/todo");
    } catch (error: any) {
      console.error(
        "Error creating todo list:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to create todo list: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          keyboardShouldPersistTaps="handled">
          <View className="p-6 pt-10">
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-2 mr-4">
                <Ionicons name="arrow-back" size={24} color={primaryColor} />
              </TouchableOpacity>
              <Text
                className="font-urbanistBold text-2xl"
                style={{ color: darkTextColor }}>
                Create Todo List
              </Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              {/* Todo List Title */}
              <View>
                <Text
                  className="font-urbanistMedium text-lg mb-3"
                  style={{ color: darkTextColor }}>
                  List Title
                </Text>
                <TextInput
                  className="bg-white rounded-lg p-4 font-urbanist text-base shadow-sm"
                  placeholder="Enter list title"
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                  placeholderTextColor="#9ca3af"
                  style={{ borderColor: "#e5e7eb", borderWidth: 1 }}
                />
              </View>
              {/* Todo Items Section */}
              <View>
                <Text
                  className="font-urbanistMedium text-lg mb-3"
                  style={{ color: darkTextColor }}>
                  Todo Items
                </Text>
                <View className="gap-4">
                  {items.map((item, index) => (
                    <View
                      key={index}
                      className="flex-row items-center bg-white rounded-lg shadow-sm"
                      style={{ borderColor: "#e5e7eb", borderWidth: 1 }}>
                      <TextInput
                        className="flex-1 p-4 font-urbanist text-base"
                        placeholder={`Todo item ${index + 1}`}
                        value={item.title}
                        onChangeText={(text) => updateItemText(text, index)}
                        autoCapitalize="sentences"
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        onPress={() => removeItem(index)}
                        className="p-3 mr-1">
                        <Ionicons name="close" size={20} color={dangerColor} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                {/* Add Item Button */}
                <TouchableOpacity
                  onPress={addItem}
                  className="flex-row items-center justify-center bg-white rounded-lg p-4 mt-4 border border-dashed"
                  style={{ borderColor: accentColor }}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={accentColor}
                  />
                  <Text
                    className="font-urbanistMedium ml-2"
                    style={{ color: accentColor }}>
                    Add Another Item
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        {/* Submit Button */}
        <View className="p-6  bg-cyan-50 items-center">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
              isLoading ? "opacity-50" : ""
            }`}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-urbanistBold text-white text-lg">
                Create Todo List
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
