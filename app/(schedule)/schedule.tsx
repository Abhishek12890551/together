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
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import axiosInstance from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Schedule {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string | null;
  note: string;
  title?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

const categories: CategoryOption[] = [
  { id: "hangout", name: "Hangout", color: "bg-cyan-500" },
  { id: "party", name: "Party", color: "bg-blue-500" },
  { id: "family", name: "Family", color: "bg-teal-500" },
  { id: "appointment", name: "Appointment", color: "bg-red-500" },
  { id: "birthday", name: "Birthday", color: "bg-yellow-500" },
  { id: "meeting", name: "Meeting", color: "bg-yellow-500" },
  { id: "exercise", name: "Exercise", color: "bg-green-500" },
  { id: "study", name: "Study", color: "bg-purple-500" },
  { id: "shopping", name: "Shopping", color: "bg-pink-500" },
  { id: "weekend", name: "Weekend", color: "bg-green-500" },
  { id: "cooking", name: "Cooking", color: "bg-orange-500" },
  { id: "other", name: "Other", color: "bg-gray-500" },
];

const getCategoryDetails = (
  categoryId: string | null
): CategoryOption | null => {
  if (!categoryId) return null;

  // Convert to lowercase for case-insensitive matching
  const lowerCategoryId = categoryId.toLowerCase();

  // Find category by id (case insensitive)
  return (
    categories.find((cat) => cat.id.toLowerCase() === lowerCategoryId) ||
    // If not found by id, try matching by name
    categories.find((cat) => cat.name.toLowerCase() === lowerCategoryId) ||
    null
  );
};

export default function ScheduleScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh

  // Colors
  const backgroundColor = "#ecfeff"; // Light cyan background
  const primaryAccentColor = "#0891b2"; // Cyan-600
  const darkTextColor = "#0e7490"; // Cyan-800
  const mutedTextColor = "#6b7280"; // Gray-500
  const cardBgColor = "bg-white/90"; // Slightly transparent white

  // Fetch schedules from API
  const fetchSchedules = useCallback(async () => {
    // setIsLoading(true); // Set loading true at the start of fetch
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axiosInstance.get("/schedules", {
        headers: { Authorization: `${token}` },
      });
      // Ensure response.data is an array before setting state
      if (Array.isArray(response.data)) {
        setSchedules(response.data);
      } else {
        console.error(
          "API did not return an array for schedules:",
          response.data
        );
        setSchedules([]); // Set to empty array on error
        Alert.alert("Error", "Received invalid data format from server.");
      }
    } catch (error: any) {
      console.error(
        "Error fetching schedules:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        `Failed to load schedules: ${
          error.response?.data?.message || error.message
        }`
      );
      setSchedules([]); // Clear schedules on error
    } finally {
      setIsLoading(false);
      setRefreshing(false); // Stop pull-to-refresh indicator
    }
  }, []); // No dependencies, fetch function is stable

  useEffect(() => {
    setIsLoading(true); // Set loading true when the component mounts or selectedDate changes initially
    fetchSchedules();
  }, [fetchSchedules]); // Fetch when component mounts

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true); // Set refreshing true
    fetchSchedules(); // Fetch data again
  }, [fetchSchedules]);

  const navigateToAddSchedule = () => {
    router.push("/(schedule)/addSchedule");
  };

  // Navigate to update screen, passing necessary data
  const navigateToUpdateSchedule = (schedule: Schedule) => {
    router.push({
      pathname: "/(schedule)/updateSchedule",
      params: {
        scheduleId: schedule._id,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        category: schedule.category || "", // Pass empty string if null
        note: schedule.note || "",
      },
    });
  };

  // Handle schedule deletion
  const handleDeleteSchedule = async (scheduleId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Don't set isLoading here as it triggers re-renders within an async function
              // that runs after component updates
              // setIsLoading(true); <- Remove this line

              await axiosInstance.delete(`/schedules/${scheduleId}`);
              // Don't show Alert here as it can interrupt the component lifecycle
              // Alert.alert("Success", "Schedule deleted."); <- Remove this line

              // Refresh the list after deletion
              fetchSchedules();
            } catch (error: any) {
              console.error(
                "Error deleting schedule:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Error",
                `Failed to delete schedule: ${
                  error.response?.data?.message || error.message
                }`
              );
            }
          },
        },
      ]
    );
  };

  // Filter schedules for the selected date
  const filteredSchedules = schedules
    .filter((schedule) => {
      try {
        // Ensure schedule.date is a valid date string before parsing
        if (schedule.date && typeof schedule.date === "string") {
          const scheduleDate = startOfDay(parseISO(schedule.date));
          return isSameDay(scheduleDate, selectedDate);
        }
        return false; // Skip if date is invalid or missing
      } catch (error) {
        console.error("Error parsing schedule date:", schedule.date, error);
        return false; // Skip schedules with invalid date format
      }
    })
    .sort((a, b) => {
      // Convert time format to ensure consistent sorting
      const normalizeTime = (time: string) => {
        // Handle different time formats (HH:MM, HH.MM)
        return time.replace(".", ":").replace(" ", "");
      };

      // Compare start times for sorting
      const timeA = normalizeTime(a.startTime);
      const timeB = normalizeTime(b.startTime);
      return timeA.localeCompare(timeB);
    });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          // Add RefreshControl
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryAccentColor}
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
              Schedule
            </Text>
          </View>

          {/* Schedule List for Selected Date */}
          <Text
            className="font-urbanistMedium text-lg mb-4"
            style={{ color: darkTextColor }}>
            Schedules for {format(selectedDate, "EEEE, MMMM d")}
          </Text>

          {isLoading && !refreshing ? (
            <ActivityIndicator
              size="large"
              color={primaryAccentColor}
              className="mt-10"
            />
          ) : filteredSchedules.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Ionicons
                name="calendar-outline"
                size={48}
                color={mutedTextColor}
              />
              <Text
                className="font-urbanist text-base mt-4"
                style={{ color: mutedTextColor }}>
                No schedules for this day.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              {filteredSchedules.map((schedule) => {
                const categoryDetails = getCategoryDetails(schedule.category);
                const categoryColor = categoryDetails
                  ? categoryDetails.color
                  : "bg-gray-500";
                const categoryName = categoryDetails
                  ? categoryDetails.name
                  : schedule.category || "Other";

                return (
                  <View
                    key={schedule._id}
                    className={`${cardBgColor} rounded-xl shadow-sm overflow-hidden`}>
                    <View className={`flex-row items-stretch`}>
                      {/* Color Indicator */}
                      <View className={`w-2 ${categoryColor}`} />

                      <View className="flex-1 p-4">
                        <View className="flex-row justify-between items-center mb-2">
                          <Text
                            className="font-urbanistBold text-base"
                            style={{ color: darkTextColor }}>
                            {schedule.startTime} - {schedule.endTime}
                          </Text>
                          <View
                            className={`flex-row items-center rounded-full px-3 py-1 ${categoryColor}`}>
                            <Text className="font-urbanistBold text-xs text-white">
                              {categoryName}
                            </Text>
                          </View>
                        </View>

                        {schedule.title && (
                          <Text
                            className="font-urbanistMedium text-lg mb-1"
                            style={{ color: darkTextColor }}>
                            {schedule.title}
                          </Text>
                        )}
                        <Text
                          className="font-urbanistMedium text-sm mb-3"
                          style={{ color: darkTextColor }}>
                          {schedule.note || "No details"}
                        </Text>

                        <View className="flex-row justify-end space-x-3 pt-2">
                          <TouchableOpacity
                            onPress={() => navigateToUpdateSchedule(schedule)}
                            className="p-1">
                            <Ionicons
                              name="pencil-outline"
                              size={20}
                              color={primaryAccentColor}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteSchedule(schedule._id)}
                            className="p-1">
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#ef4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Button (Bottom Center) */}
      <View className="p-6  bg-cyan-50 items-center">
        <TouchableOpacity
          onPress={navigateToAddSchedule}
          disabled={isLoading}
          className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Add Schedule
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
