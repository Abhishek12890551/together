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
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TodoItem {
  _id?: string;
  title: string;
  completed: boolean;
}

interface Todo {
  _id: string;
  title: string;
  items: TodoItem[];
  user: string;
}

export default function UpdateTodoScreen() {
  const router = useRouter();
  const { todoId } = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [items, setItems] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  // Colors
  const backgroundColor = "#ecfeff"; // Light cyan background
  const primaryAccentColor = "#0891b2"; // Cyan-600
  const darkTextColor = "#0e7490"; // Cyan-800
  const mutedTextColor = "#6b7280"; // Gray-500

  // Fetch todo details
  useEffect(() => {
    const fetchTodoDetails = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const response = await axiosInstance.get(`/todos/${todoId}`, {
          headers: { Authorization: `${token}` },
        });

        if (response.data.success && response.data.data) {
          const todo = response.data.data;
          setTitle(todo.title);
          setItems(todo.items || []);
        } else {
          Alert.alert("Error", "Failed to load todo details.");
          router.back();
        }
      } catch (error: any) {
        console.error(
          "Error fetching todo details:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Error",
          `Failed to load todo details: ${
            error.response?.data?.error || error.message
          }`
        );
        router.back();
      } finally {
        setIsFetching(false);
      }
    };

    if (todoId) {
      fetchTodoDetails();
    } else {
      Alert.alert("Error", "No todo ID provided");
      router.back();
    }
  }, [todoId, router]);

  // Add a new empty todo item to the list
  const addItem = () => {
    setItems([...items, { title: "", completed: false }]);
  };

  // Update an item at specific index
  const updateItemText = (text: string, index: number) => {
    const newItems = [...items];
    newItems[index].title = text;
    setItems(newItems);
  };

  // Toggle item completion status
  const toggleItemCompletion = (index: number) => {
    const newItems = [...items];
    newItems[index].completed = !newItems[index].completed;
    setItems(newItems);
  };

  // Remove an item at specific index
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    } else {
      // Keep at least one item
      Alert.alert("Warning", "Todo list must have at least one item.");
    }
  };

  // Handle form submission
  const handleUpdate = async () => {
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
      await axiosInstance.put(
        `/todos/${todoId}`,
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
        "Error updating todo list:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to update todo list: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor }}>
        <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

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
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-1 mr-4">
                <Ionicons name="arrow-back" size={24} color={darkTextColor} />
              </TouchableOpacity>
              <Text
                className="font-urbanistBold text-2xl"
                style={{ color: darkTextColor }}>
                Update Todo List
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-5">
              {/* Todo List Title */}
              <View>
                <Text
                  className="font-urbanistMedium text-base mb-2"
                  style={{ color: darkTextColor }}>
                  List Title
                </Text>
                <TextInput
                  className="bg-white rounded-lg p-3 font-urbanist text-base shadow-sm"
                  placeholder="Enter list title"
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Todo Items Section */}
              <View>
                <Text
                  className="font-urbanistMedium text-base mb-2"
                  style={{ color: darkTextColor }}>
                  Todo Items
                </Text>
                <View className="space-y-3">
                  {items.map((item, index) => (
                    <View
                      key={item._id || `new-${index}`}
                      className="flex-row items-center bg-white rounded-lg shadow-sm">
                      {/* Checkbox for completed status */}
                      <TouchableOpacity
                        onPress={() => toggleItemCompletion(index)}
                        className="pl-3">
                        <View
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            item.completed
                              ? "border-gray-400"
                              : "border-gray-400"
                          }`}
                          style={{
                            backgroundColor: item.completed
                              ? "#ef4444"
                              : "transparent",
                            borderColor: item.completed ? "#ef4444" : undefined,
                          }}>
                          {item.completed && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="white"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                      {/* Item Text Input */}
                      <TextInput
                        className={`flex-1 p-3 font-urbanist text-base ${
                          item.completed ? "text-gray-400" : ""
                        }`}
                        placeholder={`Todo item ${index + 1}`}
                        value={item.title}
                        onChangeText={(text) => updateItemText(text, index)}
                        autoCapitalize="sentences"
                      />
                      {/* Remove Item Button */}
                      <TouchableOpacity
                        onPress={() => removeItem(index)}
                        className="p-3">
                        <Ionicons name="close" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                {/* Add Item Button */}
                <TouchableOpacity
                  onPress={addItem}
                  className="flex-row items-center justify-center bg-white rounded-lg p-3 mt-3 border border-dashed"
                  style={{ borderColor: "#ef4444" }}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#ef4444"
                  />
                  <Text
                    className="font-urbanistMedium ml-2"
                    style={{ color: "#ef4444" }}>
                    Add Another Item
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        {/* Update Button */}
        <View className="p-6  bg-cyan-50 items-center">
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={isLoading}
            className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
              isLoading ? "opacity-50" : ""
            }`}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-urbanistBold text-white text-lg">
                Update Todo List
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
