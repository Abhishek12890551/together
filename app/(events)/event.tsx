import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl, // Import RefreshControl
} from "react-native";
import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import axiosInstance from "../../utils/axiosInstance"; // Import axios instance
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface for Event data from backend
interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
}

export default function EventScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh

  // Colors (Updated to match schedule/todo)
  const backgroundColor = "#ecfeff"; // Light cyan background
  const primaryAccentColor = "#0891b2"; // Cyan-600
  const darkTextColor = "#0e7490"; // Cyan-800
  const mutedTextColor = "#6b7280"; // Gray-500
  const cardBgColor = "bg-white/90";
  const deleteColor = "#ef4444"; // Red-500 for delete

  // Fetch Events from API
  const fetchEvents = useCallback(async () => {
    // setIsLoading(true); // Set loading at start
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axiosInstance.get("/events", {
        headers: { Authorization: `${token}` },
      });
      // Backend returns { success: true, count: ..., data: [...] }
      if (response.data.success && Array.isArray(response.data.data)) {
        setEvents(response.data.data);
      } else {
        console.error(
          "API did not return expected data structure for events:",
          response.data
        );
        setEvents([]);
        Alert.alert("Error", "Received invalid data format from server.");
      }
    } catch (error: any) {
      console.error(
        "Error fetching events:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to load events: ${error.response?.data?.error || error.message}`
      );
      setEvents([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false); // Stop pull-to-refresh
    }
  }, []);

  useEffect(() => {
    setIsLoading(true); // Set loading on mount
    fetchEvents();
  }, [fetchEvents]);

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  // Remove handleDateChange as CalendarView is removed
  // const handleDateChange = (date: Date) => {
  //   setSelectedDate(startOfDay(date));
  //   // Events are already fetched, filtering happens below
  // };

  const navigateToAddEvent = () => {
    router.push("/(events)/addEvent");
  };

  const navigateToUpdateEvent = (eventId: string) => {
    router.push({
      pathname: "/(events)/updateEvent",
      params: { eventId: eventId }, // Pass only the ID, update screen will fetch details
    });
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic UI update
            const originalEvents = [...events];
            setEvents(events.filter((event) => event._id !== eventId));

            try {
              await axiosInstance.delete(`/events/${eventId}`);
              // Alert.alert("Success", "Event deleted."); // Optional success message
            } catch (error: any) {
              console.error(
                "Error deleting event:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                `Failed to delete event: ${
                  error.response?.data?.error || error.message
                }`
              );
              // Rollback UI
              setEvents(originalEvents);
            }
          },
        },
      ]
    );
  };

  // Filter events for the selected date
  const filteredEvents = events.filter((event) => {
    try {
      if (event.startDate && typeof event.startDate === "string") {
        const eventStartDate = startOfDay(parseISO(event.startDate));
        // Consider events spanning multiple days if endDate exists?
        // For simplicity, showing events that START on the selected day.
        return isSameDay(eventStartDate, selectedDate);
      }
      return false;
    } catch (error) {
      console.error("Error parsing event start date:", event.startDate, error);
      return false;
    }
  });

  // Helper to format date/time range
  const formatEventTime = (startISO: string, endISO?: string): string => {
    try {
      const startDate = parseISO(startISO);
      const startTime = format(startDate, "p"); // Format time (e.g., 1:00 PM)

      if (endISO) {
        const endDate = parseISO(endISO);
        // If start and end are on the same day
        if (isSameDay(startDate, endDate)) {
          const endTime = format(endDate, "p");
          return `${startTime} - ${endTime}`;
        } else {
          // If spans multiple days, show start time and potentially end date/time
          const endTime = format(endDate, "p");
          const endDateFormatted = format(endDate, "MMM d");
          return `${startTime} - ${endDateFormatted}, ${endTime}`;
        }
      } else {
        // Only start date/time provided
        return startTime;
      }
    } catch (error) {
      console.error("Error formatting event time:", startISO, endISO, error);
      return "Invalid time";
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      {/* Status Bar - Use correct style and color */}
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryAccentColor} // Use cyan for refresh indicator
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
              Events
            </Text>
          </View>

          {/* Event List for Selected Date */}
          <Text
            className="font-urbanistMedium text-lg mb-4"
            style={{ color: darkTextColor }}>
            Events on {format(selectedDate, "EEEE, MMMM d")}
          </Text>

          {isLoading && !refreshing ? (
            <ActivityIndicator
              size="large"
              color={primaryAccentColor} // Use cyan for loading indicator
              className="mt-10"
            />
          ) : filteredEvents.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Ionicons
                name="calendar-outline"
                size={48}
                color={mutedTextColor}
              />
              <Text
                className="font-urbanist text-base mt-4"
                style={{ color: mutedTextColor }}>
                No events scheduled for this day.
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {filteredEvents.map((event) => (
                <View
                  key={event._id}
                  className={`${cardBgColor} rounded-xl shadow-sm overflow-hidden`}>
                  <View className={`flex-row items-stretch`}>
                    {/* Color Indicator - Use cyan */}
                    <View className={`w-2 bg-cyan-400`} />

                    <View className="flex-1 p-4">
                      {/* Time and Title */}
                      <View className="mb-2">
                        <Text
                          className="font-urbanistBold text-base"
                          style={{ color: darkTextColor }}>
                          {formatEventTime(event.startDate, event.endDate)}
                        </Text>
                        <Text
                          className="font-urbanistMedium text-lg mt-1"
                          style={{ color: darkTextColor }}>
                          {event.title}
                        </Text>
                      </View>

                      {/* Location */}
                      {event.location && (
                        <View className="flex-row items-center mb-1 opacity-80">
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color={mutedTextColor}
                            className="mr-1"
                          />
                          <Text
                            className="font-urbanist text-sm"
                            style={{ color: mutedTextColor }}>
                            {event.location}
                          </Text>
                        </View>
                      )}

                      {/* Description */}
                      {event.description && (
                        <Text
                          className="font-urbanist text-sm mb-3"
                          style={{ color: mutedTextColor }}>
                          {event.description}
                        </Text>
                      )}

                      {/* Action Buttons */}
                      <View className="flex-row justify-end space-x-3 pt-2 border-t border-gray-100 mt-2">
                        <TouchableOpacity
                          onPress={() => navigateToUpdateEvent(event._id)}
                          className="p-1">
                          <Ionicons
                            name="pencil-outline"
                            size={20}
                            color={primaryAccentColor}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(event._id)}
                          className="p-1">
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color={deleteColor}
                          />
                        </TouchableOpacity>
                      </View>
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
          onPress={navigateToAddEvent}
          disabled={isLoading}
          className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Add Event
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
