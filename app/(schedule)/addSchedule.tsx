import axiosInstance from "../../utils/axiosInstance";
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
import { useRouter } from "expo-router";
import { format, addDays, isSameDay, startOfDay, isBefore } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DateOption {
  day: string;
  date: string;
  fullDate: Date;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface SchedulePayload {
  date: string;
  startTime: string;
  endTime: string;
  category: string | null;
  note: string;
  userId: string;
  title?: string;
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

export default function AddScheduleScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [showFromTimeOptions, setShowFromTimeOptions] = useState(false);
  const [showToTimeOptions, setShowToTimeOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const backgroundColor = "#ecfeff";
  const primaryAccentColor = "red-500";
  const lightBgClass = "bg-white/80";
  const darkTextColor = "#0e7490";
  const mutedTextColor = "#9ca3af";
  const borderColor = "border-cyan-200";
  const primaryColorHex = "#0891b2";

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("user");
        console.log("User Data String:", userDataString);
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserId(userData.id);
        } else {
          console.error("User data not found in storage.");
          Alert.alert("Error", "User not logged in.");
        }
      } catch (error) {
        console.error("Failed to fetch user ID:", error);
        Alert.alert("Error", "Could not retrieve user information.");
      }
    };

    fetchUserId();
    generateDateOptions(selectedDate);
  }, []);

  const generateDateOptions = (baseDate: Date) => {
    const today = startOfDay(baseDate);
    const options: DateOption[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = startOfDay(addDays(today, i));
      options.push({
        day: format(currentDate, "EEE"),
        date: format(currentDate, "d"),
        fullDate: currentDate,
      });
    }
    setDateOptions(options);
    setSelectedDate(today);
  };

  // Handlers
  const handleDateSelect = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) {
      console.log("Cannot select past dates.");
      return;
    }
    setSelectedDate(date);
    setShowFromTimeOptions(false);
    setShowToTimeOptions(false);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleAddSchedule = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please log in again.");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category.");
      return;
    }

    const categoryObject = categories.find(
      (cat) => cat.id === selectedCategory
    );
    if (!categoryObject) {
      Alert.alert("Error", "Invalid category selected.");
      return;
    }

    const scheduleData: SchedulePayload = {
      date: format(selectedDate, "yyyy-MM-dd"),
      // Convert time format from HH:MM to HH.MM
      startTime: startTime.replace(":", "."),
      endTime: endTime.replace(":", "."),
      category: categoryObject.name,
      note,
      userId,
    };

    console.log("Adding Schedule:", scheduleData);
    setIsLoading(true);
    const token = await AsyncStorage.getItem("token");

    try {
      const response = await axiosInstance.post(`/schedules/`, scheduleData, {
        headers: {
          Authorization: `${token}`,
        },
      });
      console.log("Add Response:", response.data);
      Alert.alert("Success", "Schedule added successfully.");
      router.back();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Error adding schedule:", errorMessage);
      Alert.alert("Error", `Failed to add schedule: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  const handleStartTimeSelect = (time: string) => {
    setStartTime(time);
    setShowFromTimeOptions(false);
    if (time >= endTime) {
      const currentIndex = timeSlots.indexOf(time);
      const nextIndex = Math.min(currentIndex + 1, timeSlots.length - 1);
      setEndTime(timeSlots[nextIndex]);
    }
  };

  const handleEndTimeSelect = (time: string) => {
    if (time > startTime) {
      setEndTime(time);
      setShowToTimeOptions(false);
    } else {
      console.warn("End time must be after start time.");
    }
  };

  const toggleFromTimeOptions = () => {
    setShowFromTimeOptions(!showFromTimeOptions);
    setShowToTimeOptions(false);
  };

  const toggleToTimeOptions = () => {
    setShowToTimeOptions(!showToTimeOptions);
    setShowFromTimeOptions(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-cyan-50">
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
            <Text className="font-urbanistBold text-2xl text-cyan-800">
              Add New Schedule
            </Text>
          </View>

          {/* Date Selection */}
          <Text className="font-urbanistMedium text-lg text-cyan-800 mb-3">
            Select the date
          </Text>
          <View className="flex-row justify-around items-center mb-8">
            {dateOptions.map((item) => {
              const isPast =
                isBefore(item.fullDate, startOfDay(new Date())) &&
                !isSameDay(item.fullDate, startOfDay(new Date()));
              const isSelected = isSameDay(item.fullDate, selectedDate);
              return (
                <TouchableOpacity
                  key={item.date + item.day}
                  onPress={() => handleDateSelect(item.fullDate)}
                  disabled={isPast}
                  className={`items-center justify-center p-2 rounded-xl w-12 h-16 border ${borderColor} ${
                    isSelected ? `bg-cyan-600` : lightBgClass
                  } ${isPast ? "opacity-50" : ""}`}>
                  <Text
                    className={`font-urbanistMedium text-sm ${
                      isSelected
                        ? "text-white"
                        : isPast
                        ? mutedTextColor
                        : "text-gray-500"
                    }`}>
                    {item.day}
                  </Text>
                  <Text
                    className={`font-urbanistBold text-xl mt-1 ${
                      isSelected
                        ? "text-white"
                        : isPast
                        ? mutedTextColor
                        : `text-cyan-800`
                    }`}>
                    {item.date}
                  </Text>
                  {isSelected && !isPast && (
                    <View className="w-1.5 h-1.5 bg-white rounded-full mt-1" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Selection */}
          <Text className="font-urbanistMedium text-lg text-cyan-800 mb-3">
            Select time
          </Text>
          <View className="mb-8 space-y-4">
            <View
              className={`flex-row justify-between items-center ${lightBgClass} border ${borderColor} rounded-xl p-4`}>
              <TouchableOpacity
                onPress={toggleFromTimeOptions}
                className="items-center">
                <Text className="font-urbanist text-sm text-gray-500">
                  From
                </Text>
                <Text className="font-urbanistBold text-2xl text-cyan-800">
                  {startTime}
                </Text>
              </TouchableOpacity>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={mutedTextColor}
              />
              <TouchableOpacity
                onPress={toggleToTimeOptions}
                className="items-center">
                <Text className="font-urbanist text-sm text-gray-500">To</Text>
                <Text className="font-urbanistBold text-2xl text-cyan-800">
                  {endTime}
                </Text>
              </TouchableOpacity>
            </View>
            {showFromTimeOptions && (
              <View>
                <Text className="font-urbanist text-sm text-gray-500 mb-2 ml-1">
                  Select Start Time
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={`start-${time}`}
                        onPress={() => handleStartTimeSelect(time)}
                        className={`px-4 py-2 rounded-full border ${borderColor} ${
                          startTime === time ? "bg-cyan-600" : lightBgClass
                        }`}>
                        <Text
                          className={`font-urbanistMedium ${
                            startTime === time ? "text-white" : "text-cyan-800"
                          }`}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            {showToTimeOptions && (
              <View>
                <Text className="font-urbanist text-sm text-gray-500 mb-2 ml-1">
                  Select End Time
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={`end-${time}`}
                        onPress={() => handleEndTimeSelect(time)}
                        className={`px-4 py-2 rounded-full border ${borderColor} ${
                          endTime === time ? "bg-cyan-600" : lightBgClass
                        } ${time <= startTime ? "opacity-50" : ""}`}
                        disabled={time <= startTime}>
                        <Text
                          className={`font-urbanistMedium ${
                            endTime === time ? "text-white" : "text-cyan-800"
                          }`}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Category Selection */}
          <Text className="font-urbanistMedium text-lg text-cyan-800 mb-3">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-8">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                className={`flex-row items-center rounded-full px-4 py-2 border ${
                  selectedCategory === cat.id
                    ? `bg-cyan-100 border-cyan-500`
                    : `${lightBgClass} ${borderColor}`
                }`}>
                <View className={`w-3 h-3 rounded-full mr-2 ${cat.color}`} />
                <Text
                  className={`font-urbanistMedium ${
                    selectedCategory === cat.id
                      ? `text-cyan-700`
                      : "text-gray-700"
                  }`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note Input */}
          <Text className="font-urbanistMedium text-lg text-cyan-800 mb-3">
            Note
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add notes..."
            placeholderTextColor={mutedTextColor}
            multiline
            numberOfLines={4}
            className={`${lightBgClass} border ${borderColor} rounded-xl p-4 text-base font-urbanist text-cyan-800 h-28 mb-8`}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Add Button */}
      <View className="p-6 bg-cyan-50 items-center">
        <TouchableOpacity
          onPress={handleAddSchedule}
          disabled={isLoading}
          className={`bg-red-500 rounded-full py-4 px-10 items-center justify-center w-auto ${
            isLoading ? "opacity-50" : ""
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-urbanistBold text-white text-lg">
              Create Schedule
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
