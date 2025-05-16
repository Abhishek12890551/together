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
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  format,
  parseISO,
  isSameDay,
  startOfDay,
  isAfter,
  isSameMonth,
} from "date-fns";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Interface for Event data from backend
interface Event {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  category?: string;
}

export default function EventScreen() {
  const router = useRouter();
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
  }; // We've removed the filtered events for today's date

  // Get upcoming events for the current month
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter((event) => {
        try {
          const eventStartDate = parseISO(event.startDate);
          // Include events that start today or in the future within the current month
          return (
            (isAfter(eventStartDate, today) ||
              isSameDay(eventStartDate, today)) &&
            isSameMonth(eventStartDate, today)
          );
        } catch (error) {
          console.error(
            "Error parsing upcoming event date:",
            event.startDate,
            error
          );
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return (
            parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
          );
        } catch {
          return 0;
        }
      });
  }, [events]);

  // Memoized value for next event date
  const nextEventDate = useMemo(() => {
    if (upcomingEvents.length === 0) return null;

    // Get the soonest event's start date
    const soonestEvent = upcomingEvents.reduce((prev, curr) => {
      const prevDate = parseISO(prev.startDate);
      const currDate = parseISO(curr.startDate);
      return isAfter(currDate, prevDate) ? prev : curr;
    });

    return format(parseISO(soonestEvent.startDate), "EEEE, MMMM d");
  }, [upcomingEvents]);

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

  // Format upcoming event dates
  const formatEventDate = (startISO: string, endISO?: string): string => {
    try {
      const startDate = parseISO(startISO);

      if (!endISO) {
        return format(startDate, "EEE, MMM d");
      }

      const endDate = parseISO(endISO);
      if (isSameDay(startDate, endDate)) {
        return format(startDate, "EEE, MMM d");
      }

      // If in the same month
      if (isSameMonth(startDate, endDate)) {
        return `${format(startDate, "MMM d")} - ${format(endDate, "d")}`;
      }

      // Different months
      return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
    } catch (error) {
      console.error("Error formatting event date:", startISO, endISO, error);
      return "Invalid date";
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

          {/* Upcoming Events Section */}
          <Text
            className="font-urbanistMedium text-lg mb-4"
            style={{ color: darkTextColor }}>
            Upcoming Events This Month
          </Text>

          {isLoading && !refreshing ? (
            <ActivityIndicator
              size="large"
              color={primaryAccentColor}
              className="mt-10"
            />
          ) : upcomingEvents.length === 0 ? (
            <View className="items-center justify-center py-5 mb-6">
              <Ionicons
                name="calendar-outline"
                size={36}
                color={mutedTextColor}
              />
              <Text
                className="font-urbanist text-base mt-2"
                style={{ color: mutedTextColor }}>
                No upcoming events this month
              </Text>
            </View>
          ) : (
            <View className="space-y-4 mb-8">
              {upcomingEvents.map((event) => (
                <View
                  key={event._id}
                  className={`${cardBgColor} rounded-xl shadow-sm overflow-hidden`}>
                  <View className={`flex-row items-stretch`}>
                    {/* Left date indicator */}
                    <View
                      className={`w-16 bg-cyan-500 p-2 items-center justify-center`}>
                      <Text className="font-urbanistBold text-lg text-white">
                        {format(parseISO(event.startDate), "d")}
                      </Text>
                      <Text className="font-urbanistMedium text-xs text-white">
                        {format(parseISO(event.startDate), "MMM")}
                      </Text>
                    </View>

                    <View className="flex-1 p-4">
                      {/* Header with title and action buttons */}
                      <View className="flex-row justify-between items-start mb-2">
                        <Text
                          className="font-urbanistBold text-lg flex-1"
                          style={{ color: darkTextColor }}>
                          {event.title}
                        </Text>

                        {/* Action Buttons - Moved to top right */}
                        <View className="flex-row space-x-3">
                          <TouchableOpacity
                            onPress={() => navigateToUpdateEvent(event._id)}
                            className="p-1">
                            <Ionicons
                              name="pencil-outline"
                              size={18}
                              color={primaryAccentColor}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteEvent(event._id)}
                            className="p-1">
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color={deleteColor}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {/* Time */}
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={primaryAccentColor}
                          className="mr-1"
                        />
                        <Text
                          className="font-urbanistMedium text-sm"
                          style={{ color: primaryAccentColor }}>
                          {formatEventTime(event.startDate, event.endDate)}
                          {event.endDate &&
                            !isSameDay(
                              parseISO(event.startDate),
                              parseISO(event.endDate)
                            ) &&
                            ` (until ${format(
                              parseISO(event.endDate),
                              "MMM d"
                            )})`}
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
                      {/* Description - with truncation */}
                      {event.description && (
                        <Text
                          className="font-urbanist text-sm"
                          style={{ color: mutedTextColor }}
                          numberOfLines={2}>
                          {event.description}
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
