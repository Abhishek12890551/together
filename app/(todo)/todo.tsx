import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TodoItem {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Todo {
  _id: string;
  title: string;
  items: TodoItem[];
  user: string;
  createdAt: string;
  updatedAt: string;
}

export default function TodoScreen() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Colors
  const backgroundColor = "#ecfeff";
  const primaryAccentColor = "#0891b2";
  const darkTextColor = "#0e7490";
  const mutedTextColor = "#6b7280";
  const cardBgColor = "bg-white/90";

  // Fetch todos from API
  const fetchTodos = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axiosInstance.get("/todos", {
        headers: { Authorization: `${token}` },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        setTodos(response.data.data);
      } else {
        console.error(
          "API did not return expected data structure for todos:",
          response.data
        );
        setTodos([]);
        Alert.alert("Error", "Received invalid data format from server.");
      }
    } catch (error: any) {
      console.error(
        "Error fetching todos:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to load todos: ${error.response?.data?.error || error.message}`
      );
      setTodos([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchTodos();
  }, [fetchTodos]);

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTodos();
  }, [fetchTodos]);

  // Navigate to add todo screen
  const navigateToAddTodo = () => {
    router.push("/(todo)/addTodo");
  };

  // Navigate to update todo screen
  const navigateToUpdateTodo = (todoId: string) => {
    router.push({
      pathname: "/(todo)/updateTodo",
      params: { todoId: todoId },
    });
  };

  // Handle todo deletion
  const handleDeleteTodo = async (todoId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this todo list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic UI update
            const originalTodos = [...todos];
            setTodos(todos.filter((todo) => todo._id !== todoId));

            try {
              const token = await AsyncStorage.getItem("token");
              await axiosInstance.delete(`/todos/${todoId}`, {
                headers: { Authorization: `${token}` },
              });
            } catch (error: any) {
              console.error(
                "Error deleting todo:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                `Failed to delete todo: ${
                  error.response?.data?.error || error.message
                }`
              );
              setTodos(originalTodos);
            }
          },
        },
      ]
    );
  };

  // Toggle todo item completion status
  const toggleTodoItemCompletion = async (
    todoId: string,
    itemId: string,
    currentStatus: boolean
  ) => {
    // Optimistic UI update
    const updatedTodos = todos.map((todo) => {
      if (todo._id === todoId) {
        return {
          ...todo,
          items: todo.items.map((item) => {
            if (item._id === itemId) {
              return { ...item, completed: !currentStatus };
            }
            return item;
          }),
        };
      }
      return todo;
    });

    setTodos(updatedTodos);

    try {
      // Send API request to update item status
      const token = await AsyncStorage.getItem("token");
      await axiosInstance.put(
        `/todos/${todoId}/items/${itemId}`,
        {
          completed: !currentStatus,
        },
        { headers: { Authorization: `${token}` } }
      );
    } catch (error: any) {
      console.error(
        "Error updating todo item:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to update todo item: ${
          error.response?.data?.error || error.message
        }`
      );
      fetchTodos();
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
          />
        }>
        <View className="p-6 pt-10">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.push("/(home)/home")}
              className="p-1 mr-4">
              <Ionicons name="arrow-back" size={24} color={darkTextColor} />
            </TouchableOpacity>
            <Text
              className="font-urbanistBold text-2xl"
              style={{ color: darkTextColor }}>
              Todo Lists
            </Text>
          </View>
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color="#ef4444" className="mt-10" />
          ) : todos.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Ionicons name="list-outline" size={48} color={mutedTextColor} />
              <Text
                className="font-urbanist text-base mt-4 text-center"
                style={{ color: mutedTextColor }}>
                No todo lists yet.
                {"\n"}
                Tap the button below to create one.
              </Text>
            </View>
          ) : (
            <View className="space-y-4 gap-4">
              {todos.map((todo) => (
                <View
                  key={todo._id}
                  className={`${cardBgColor} rounded-xl shadow-sm overflow-hidden`}>
                  <View className={`flex-row items-stretch`}>
                    {/* Color Indicator */}
                    <View className={`w-2 bg-cyan-600`} />

                    <View className="flex-1 p-4">
                      {/* Todo List Title */}
                      <View className="flex-row justify-between items-center mb-2">
                        <Text
                          className="font-urbanistBold text-lg"
                          style={{ color: darkTextColor }}>
                          {todo.title}
                        </Text>

                        {/* Action Buttons */}
                        <View className="flex-row space-x-3">
                          <TouchableOpacity
                            onPress={() => navigateToUpdateTodo(todo._id)}
                            className="p-1">
                            <Ionicons
                              name="pencil-outline"
                              size={20}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteTodo(todo._id)}
                            className="p-1">
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Todo Items */}
                      {todo.items.length > 0 ? (
                        <View>
                          {todo.items.map((item, idx) => (
                            <TouchableOpacity
                              key={item._id}
                              onPress={() =>
                                toggleTodoItemCompletion(
                                  todo._id,
                                  item._id,
                                  item.completed
                                )
                              }
                              className={`flex-row items-center py-2 ${
                                idx > 0 ? "border-t border-gray-100" : ""
                              }`}>
                              {/* Checkbox */}
                              <View
                                className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                                  item.completed
                                    ? "border-gray-400"
                                    : "border-gray-400"
                                }`}
                                style={{
                                  backgroundColor: item.completed
                                    ? "#ef4444"
                                    : "transparent",
                                  borderColor: item.completed
                                    ? "#ef4444"
                                    : undefined,
                                }}>
                                {item.completed && (
                                  <Ionicons
                                    name="checkmark"
                                    size={12}
                                    color="white"
                                  />
                                )}
                              </View>

                              {/* Item Text */}
                              <Text
                                className={`font-urbanist text-base ${
                                  item.completed
                                    ? "line-through text-gray-400"
                                    : ""
                                }`}
                                style={{
                                  color: item.completed
                                    ? mutedTextColor
                                    : darkTextColor,
                                }}>
                                {item.title}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text
                          className="font-urbanist italic text-sm"
                          style={{ color: mutedTextColor }}>
                          No items in this list
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {/* Add Button (Bottom Center) */}
      <View className="p-6  bg-cyan-50 items-center">
        <TouchableOpacity
          onPress={navigateToAddTodo}
          disabled={isLoading}
          className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Create New Todo List
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
