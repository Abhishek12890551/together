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
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format, parseISO } from "date-fns";
import axiosInstance from "../../utils/axiosInstance";

// Interface for Event data from backend
interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string; // ISO String
  endDate?: string; // ISO String
  location?: string;
}

// Interface for Event payload for update
interface EventUpdatePayload {
  title: string;
  description?: string;
  startDate: string; // ISO String format
  endDate?: string; // ISO String format
  location?: string;
}

export default function UpdateEventScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [location, setLocation] = useState("");

  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching/updating
  const [originalEvent, setOriginalEvent] = useState<Event | null>(null);

  // Update colors to match the app's theme
  const backgroundColor = "#ecfeff"; // Cyan-50 background to match home screen
  const primaryAccentColor = "#06b6d4"; // Cyan-500 to match primary color
  const darkTextColor = "#0e7490"; // Cyan-800 for dark text
  const mutedTextColor = "#9ca3af"; // Gray-400 for muted text
  const inputBgClass = "bg-white/80"; // Same as other screens
  const borderColor = "border-cyan-200"; // Cyan-200 to match borders elsewhere

  // Fetch event data
  useEffect(() => {
    if (eventId) {
      setIsLoading(true);
      axiosInstance
        .get(`/events/${eventId}`)
        .then((response) => {
          if (response.data.success) {
            const eventData: Event = response.data.data;
            setOriginalEvent(eventData);
            setTitle(eventData.title);
            setDescription(eventData.description || "");
            setLocation(eventData.location || "");
            try {
              setStartDate(parseISO(eventData.startDate));
              if (eventData.endDate) {
                setEndDate(parseISO(eventData.endDate));
              } else {
                setEndDate(null); // Explicitly set to null if no end date
              }
            } catch (e) {
              console.error("Error parsing event dates:", e);
              // Handle date parsing error, maybe show alert or default dates
              Alert.alert("Error", "Could not parse event dates.");
              setStartDate(new Date()); // Fallback
              setEndDate(null);
            }
          } else {
            Alert.alert(
              "Error",
              `Failed to load event: ${response.data.error || "Unknown error"}`
            );
            router.back();
          }
        })
        .catch((error) => {
          console.error(
            "Error fetching event:",
            error.response?.data || error.message
          );
          Alert.alert(
            "Error",
            `Failed to load event data: ${
              error.response?.data?.error || error.message
            }`
          );
          router.back();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      Alert.alert("Error", "Event ID is missing.");
      router.back();
      setIsLoading(false); // Ensure loading stops if ID is missing
    }
  }, [eventId]);

  // Date Picker Handlers (same as addEvent)
  const showStartDatePicker = () => setStartDatePickerVisibility(true);
  const hideStartDatePicker = () => setStartDatePickerVisibility(false);
  const handleStartDateConfirm = (date: Date) => {
    setStartDate(date);
    if (endDate && date > endDate) {
      setEndDate(date);
    }
    hideStartDatePicker();
  };

  const showEndDatePicker = () => setEndDatePickerVisibility(true);
  const hideEndDatePicker = () => setEndDatePickerVisibility(false);
  const handleEndDateConfirm = (date: Date) => {
    if (startDate && date < startDate) {
      Alert.alert("Invalid Date", "End date cannot be before the start date.");
    } else {
      setEndDate(date);
    }
    hideEndDatePicker();
  };

  // Handle Update Event
  const handleUpdateEvent = async () => {
    if (!eventId) {
      Alert.alert("Error", "Cannot update without Event ID.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Input Required", "Please enter an event title.");
      return;
    }
    if (!startDate) {
      Alert.alert("Input Required", "Please select a start date and time.");
      return;
    }

    const updatedData: EventUpdatePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString() || undefined,
      location: location.trim() || undefined,
    };

    console.log("Updating Event:", eventId, updatedData);
    setIsLoading(true);

    try {
      const response = await axiosInstance.put(
        `/events/${eventId}`,
        updatedData
      );
      if (response.data.success) {
        Alert.alert("Success", "Event updated successfully.");
        router.back(); // Go back after successful update
      } else {
        Alert.alert(
          "Error",
          `Failed to update event: ${response.data.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error(
        "Error updating event:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to update event: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !originalEvent) {
    // Show loading indicator only when fetching initial data
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor }}>
        <ActivityIndicator size="large" color={primaryAccentColor} />
        <Text
          className="mt-4 font-urbanist text-lg"
          style={{ color: darkTextColor }}>
          Loading Event Details...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
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
              Update Event
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
              style={{
                color: startDate ? darkTextColor : mutedTextColor,
              }}>
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
            date={startDate || new Date()}
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
              style={{
                color: endDate ? darkTextColor : mutedTextColor,
              }}>
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
            date={endDate || startDate || new Date()}
            minimumDate={startDate || undefined}
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

      {/* Update Button */}
      <View className="p-6 items-center" style={{ backgroundColor }}>
        <TouchableOpacity
          onPress={handleUpdateEvent}
          disabled={isLoading}
          className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Update Event
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
