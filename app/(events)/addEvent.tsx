import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from "date-fns";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface for Event payload
interface EventPayload {
  title: string;
  description?: string;
  startDate: string; 
  endDate?: string; 
  location?: string;
}

export default function AddEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [location, setLocation] = useState("");

  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loading state for API call

  // Colors (Updated to match schedule/todo)
  const backgroundColor = "#ecfeff"; // Light cyan background
  const primaryAccentColor = "#0891b2"; // Cyan-600
  const darkTextColor = "#0e7490"; // Cyan-800
  const mutedTextColor = "#6b7280"; // Gray-500
  const inputBgClass = "bg-white/80";
  const borderColor = "border-cyan-200";
  const buttonBgColor = "bg-red-500"; // Use cyan for the button

  const showStartDatePicker = () => setStartDatePickerVisibility(true);
  const hideStartDatePicker = () => setStartDatePickerVisibility(false);
  const handleStartDateConfirm = (date: Date) => {
    setStartDate(date);
    // Optional: Auto-set end date if it's before start date
    if (endDate && date > endDate) {
      setEndDate(date);
    }
    hideStartDatePicker();
  };

  const showEndDatePicker = () => setEndDatePickerVisibility(true);
  const hideEndDatePicker = () => setEndDatePickerVisibility(false);
  const handleEndDateConfirm = (date: Date) => {
    // Optional: Ensure end date is not before start date
    if (startDate && date < startDate) {
      Alert.alert("Invalid Date", "End date cannot be before the start date.");
    } else {
      setEndDate(date);
    }
    hideEndDatePicker();
  };

  const handleAddEvent = async () => {
    if (!title.trim()) {
      Alert.alert("Input Required", "Please enter an event title.");
      return;
    }
    if (!startDate) {
      Alert.alert("Input Required", "Please select a start date and time.");
      return;
    }

    const eventData: EventPayload = {
      title: title.trim(),
      description: description.trim() || undefined, // Send undefined if empty
      startDate: startDate.toISOString(), // Send as ISO string
      endDate: endDate?.toISOString() || undefined, // Send as ISO string or undefined
      location: location.trim() || undefined,
    };

    console.log("Adding Event:", eventData);
    setIsLoading(true);

    const token = await AsyncStorage.getItem("token"); // Get token from storage

    try {
      const response = await axiosInstance.post("/events", eventData, {
        headers: { Authorization: `${token}` },
      }); // Use axios instance for API call
      if (response.data.success) {
        Alert.alert("Success", "Event added successfully.");
        router.back(); // Go back after successful addition
      } else {
        Alert.alert(
          "Error",
          `Failed to add event: ${response.data.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error(
        "Error adding event:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to add event: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      {/* Status Bar - Use correct style and color */}
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="p-6 pt-10">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-1 mr-4">
              {/* Use dark text color for back arrow */}
              <Ionicons name="arrow-back" size={24} color={darkTextColor} />
            </TouchableOpacity>
            <Text
              className="font-urbanistBold text-2xl"
              style={{ color: darkTextColor }}>
              Add New Event
            </Text>
          </View>

          {/* Event Title Input */}
          <Text
            className="font-urbanistMedium text-lg mb-2"
            style={{ color: darkTextColor }}>
            Event Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Team Meeting"
            placeholderTextColor={mutedTextColor}
            className={`${inputBgClass} border ${borderColor} rounded-xl p-4 text-base font-urbanist mb-6`}
            style={{ color: darkTextColor }}
          />

          {/* Start Date/Time Picker */}
          <Text
            className="font-urbanistMedium text-lg mb-2"
            style={{ color: darkTextColor }}>
            Start Date & Time *
          </Text>
          <TouchableOpacity
            onPress={showStartDatePicker}
            className={`${inputBgClass} border ${borderColor} rounded-xl p-4 mb-6 flex-row justify-between items-center`}>
            <Text
              className="font-urbanist text-base"
              style={{ color: startDate ? darkTextColor : mutedTextColor }}>
              {startDate
                ? format(startDate, "PPpp")
                : "Select start date & time"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={mutedTextColor}
            />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isStartDatePickerVisible}
            mode="datetime"
            onConfirm={handleStartDateConfirm}
            onCancel={hideStartDatePicker}
            date={startDate || new Date()} // Default to now if null
          />

          {/* End Date/Time Picker */}
          <Text
            className="font-urbanistMedium text-lg mb-2"
            style={{ color: darkTextColor }}>
            End Date & Time (Optional)
          </Text>
          <TouchableOpacity
            onPress={showEndDatePicker}
            className={`${inputBgClass} border ${borderColor} rounded-xl p-4 mb-6 flex-row justify-between items-center`}>
            <Text
              className="font-urbanist text-base"
              style={{ color: endDate ? darkTextColor : mutedTextColor }}>
              {endDate ? format(endDate, "PPpp") : "Select end date & time"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={mutedTextColor}
            />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isEndDatePickerVisible}
            mode="datetime"
            onConfirm={handleEndDateConfirm}
            onCancel={hideEndDatePicker}
            date={endDate || startDate || new Date()} // Default to start date or now
            minimumDate={startDate || undefined} // Prevent selecting end date before start date
          />

          {/* Location Input */}
          <Text
            className="font-urbanistMedium text-lg mb-2"
            style={{ color: darkTextColor }}>
            Location (Optional)
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Conference Room A"
            placeholderTextColor={mutedTextColor}
            className={`${inputBgClass} border ${borderColor} rounded-xl p-4 text-base font-urbanist mb-6`}
            style={{ color: darkTextColor }}
          />

          {/* Description Input */}
          <Text
            className="font-urbanistMedium text-lg mb-2"
            style={{ color: darkTextColor }}>
            Description (Optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add event details..."
            placeholderTextColor={mutedTextColor}
            multiline
            numberOfLines={4}
            className={`${inputBgClass} border ${borderColor} rounded-xl p-4 text-base font-urbanist h-28 mb-8`}
            style={{ color: darkTextColor }}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Add Button */}
      <View className="p-6 items-center" style={{ backgroundColor }}>
        <TouchableOpacity
          onPress={handleAddEvent}
          disabled={isLoading}
          className={`${buttonBgColor} rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Create Event
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
