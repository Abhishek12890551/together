import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions, // Make sure Dimensions is imported if used for styling (though not directly in this logic)
  Image,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Entypo } from "@expo/vector-icons"; // Added Entypo for example
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  startOfMonth,
  endOfMonth,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  getDate,
  subDays,
  parseISO,
  startOfDay,
  // isWithinInterval, // Uncomment if using for multi-day event display
} from "date-fns";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import axiosInstance from "../../utils/axiosInstance"; // Ensure this path is correct
import { useAuth } from "../contexts/AuthContext"; // Ensure this path is correct

// --- Interfaces (Verify these match your data structures) ---
interface User {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
}

interface WeekDate {
  day: string;
  date: string;
  isToday: boolean;
  fullDate: Date;
  isSunday: boolean;
}

interface CalendarDate {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
}

interface Schedule {
  _id: string;
  startTime: string;
  endTime: string;
  category: string;
  note?: string;
  date: string; // ISO Date string
}

interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  title?: string;
  listTitle?: string;
}

interface Event {
  _id: string;
  title: string;
  startDate: string; // ISO Date string
  endDate?: string;
  location?: string;
  description?: string;
  category?: string;
}

// For API responses that might wrap data
interface ApiCollectionResponse<T> {
  success: boolean;
  count?: number;
  data: T[]; // Assuming data is always an array for collections
  message?: string;
}

export default function Home() {
  const { user, token: authTokenFromContext } = useAuth();
  const [userName, setUserName] = useState<string | null>(user?.name || "User");
  const [greeting, setGreeting] = useState<string>("Hello");
  const [weekDates, setWeekDates] = useState<WeekDate[]>([]);

  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">(
    "week"
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date())
  );
  const [monthCalendarDates, setMonthCalendarDates] = useState<CalendarDate[]>(
    []
  );
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [monthlyEvents, setMonthlyEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const generateMonthDates = useCallback(
    (monthDate: Date, selected: Date): CalendarDate[] => {
      const monthStart = startOfMonth(monthDate);
      const startDayOfWeek = getDay(monthStart); // 0 (Sun) - 6 (Sat)
      const weekStartsOn = 1; // 1 for Monday
      const correctedStartDayOfWeek = (startDayOfWeek - weekStartsOn + 7) % 7;

      const datesArray: CalendarDate[] = [];
      const startDateForCalendar = subDays(monthStart, correctedStartDayOfWeek);

      for (let i = 0; i < 42; i++) {
        // 6 weeks * 7 days
        const loopDate = addDays(startDateForCalendar, i);
        datesArray.push({
          date: loopDate,
          dayOfMonth: getDate(loopDate),
          isCurrentMonth: isSameMonth(loopDate, monthStart),
          isToday: isToday(loopDate),
          isSelected: isSameDay(loopDate, selected),
          isSunday: getDay(loopDate) === 0,
        });
      }
      return datesArray;
    },
    []
  );

  const getWeekDates = useCallback((referenceDate: Date) => {
    const start = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Week starts on Monday
    const datesArray: WeekDate[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(start, i);
      datesArray.push({
        day: format(currentDate, "EEE"), // e.g., "Mon"
        date: format(currentDate, "d"), // e.g., "15"
        isToday: isToday(currentDate),
        fullDate: currentDate,
        isSunday: getDay(currentDate) === 0, // Sunday
      });
    }
    setWeekDates(datesArray);
  }, []);

  const fetchData = useCallback(async () => {
    if (!authTokenFromContext) {
      console.warn(
        "Home.tsx fetchData: No auth token. API calls will be skipped."
      );
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    console.log(
      `Home.tsx fetchData: Attempting to fetch data for month: ${format(
        currentMonth,
        "yyyy-MM"
      )}`
    );

    try {
      const monthStartDate = startOfMonth(currentMonth);
      const monthEndDate = endOfMonth(currentMonth);
      const selectedDateFormatted = format(selectedDate, "yyyy-MM-dd");

      const [scheduleRes, todoRes, eventRes] = await Promise.all([
        axiosInstance.get<ApiCollectionResponse<Schedule>>("/schedules", {
          params: {
            date: selectedDateFormatted, // Fetch schedules for selected date
          },
        }),
        axiosInstance.get<ApiCollectionResponse<Todo>>("/todos"), // Specify response type
        axiosInstance.get<ApiCollectionResponse<Event>>("/events", {
          params: {
            startDate: format(monthStartDate, "yyyy-MM-dd"),
            endDate: format(monthEndDate, "yyyy-MM-dd"),
          },
        }),
      ]);

      setSchedules(scheduleRes.data.data || []);
      setAllTodos(todoRes.data.data || []);
      setMonthlyEvents(eventRes.data.data || []);
    } catch (error: any) {
      console.error(
        "Error fetching data for home screen:",
        error.isAxiosError ? error.message : error
      );
      if (error.response) {
        console.error("Error response data:", error.response.data);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [authTokenFromContext, currentMonth, selectedDate]); // Added selectedDate as dependency

  useEffect(() => {
    if (user) {
      setUserName(user.name || "User");
    } else {
      const fetchUserFromStorage = async () => {
        /* ... (same as before) ... */
      };
      fetchUserFromStorage();
    }

    const getCurrentGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };

    setGreeting(getCurrentGreeting());
  }, [user]);

  useEffect(() => {
    // This effect fetches data when component mounts or when fetchData (due to currentMonth/token change) is new
    setIsLoading(true);
    if (authTokenFromContext) {
      fetchData();
    } else {
      console.warn(
        "Home.tsx useEffect (data fetch): No auth token, skipping data fetch."
      );
      setIsLoading(false);
    }
  }, [fetchData, authTokenFromContext]); // fetchData dependency will trigger refetch on month change

  useEffect(() => {
    // This effect updates calendar UI elements when selectedDate or currentMonth changes
    getWeekDates(selectedDate);
    setMonthCalendarDates(generateMonthDates(currentMonth, selectedDate));
  }, [selectedDate, currentMonth, getWeekDates, generateMonthDates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (authTokenFromContext) {
      fetchData();
    } else {
      setRefreshing(false); // Stop refreshing if no token
    }
  }, [fetchData, authTokenFromContext]);

  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const handleDateSelect = (date: Date) => {
    const newSelectedDate = startOfDay(date);
    setSelectedDate(newSelectedDate); // Ensure selectedDate is always start of day

    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date));
    } else if (!isSameDay(newSelectedDate, selectedDate)) {
      // If just the day changed (same month), we need to refetch schedules for the new day
      setIsLoading(true);
      fetchData(); // This will use the updated selectedDate value in next render
    }
  };

  const toggleCalendarView = () =>
    setCalendarViewMode((prev) => (prev === "week" ? "month" : "week"));
  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
  };

  const showDatePickerModal = () => setShowPicker(true); // Renamed for clarity
  const onDateChangeFromPicker = (
    event: DateTimePickerEvent,
    newSelectedDate?: Date
  ) => {
    setShowPicker(Platform.OS === "ios"); // Keep picker open on iOS until done
    if (event.type === "set" && newSelectedDate) {
      // 'set' means user picked a date
      const chosenDate = startOfDay(newSelectedDate);
      setSelectedDate(chosenDate);
      if (!isSameMonth(chosenDate, currentMonth)) {
        setCurrentMonth(startOfMonth(chosenDate));
      }
    }
  };

  // --- Filtering Logic ---
  const filteredSchedulesForSelectedDate = schedules
    .filter((schedule) => {
      if (!schedule.date) return false;
      try {
        return isSameDay(parseISO(schedule.date), selectedDate);
      } catch {
        return false; // In case date parsing fails
      }
    })
    .sort((a, b) => {
      // More robust time sorting
      const parseTime = (timeStr: string) => {
        try {
          // Convert "9:00 AM", "14:00", etc. to comparable values
          const normalizedTime = timeStr.trim().toUpperCase();
          const isPM =
            normalizedTime.includes("PM") && !normalizedTime.includes("12:");
          const isAM12 =
            normalizedTime.includes("12:") && normalizedTime.includes("AM");

          let [hours, minutes] = normalizedTime
            .replace(/[^\d:]/g, "")
            .split(":");
          let hoursNum = parseInt(hours, 10);

          if (isPM && hoursNum < 12) hoursNum += 12;
          if (isAM12) hoursNum = 0; // 12 AM = 0 hours

          return hoursNum * 60 + parseInt(minutes || "0", 10);
        } catch {
          return 0; // Default if parsing fails
        }
      };

      return parseTime(a.startTime) - parseTime(b.startTime);
    })
    .slice(0, 3);

  // Enhance events filtering to show all events for selected date including multi-day events
  const filteredEventsForSelectedDate = monthlyEvents
    .filter((event) => {
      if (!event.startDate) return false;

      try {
        // Handle single day events
        if (isSameDay(parseISO(event.startDate), selectedDate)) return true;

        // Handle multi-day events
        if (event.endDate) {
          const startDate = parseISO(event.startDate);
          const endDate = parseISO(event.endDate);
          return selectedDate >= startDate && selectedDate <= endDate;
        }

        return false;
      } catch {
        return false; // In case date parsing fails
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
    })
    .slice(0, 3);

  // Filter todos to get the most important incomplete ones
  const filteredTopTodos = allTodos
    .filter((todo) => !todo.completed) // Only show incomplete todos
    .sort((a, b) => {
      // Sort by due date if available
      if (a.dueDate && b.dueDate) {
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      }
      if (a.dueDate) return -1; // Todos with due dates come first
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 3); // Get top 3 todos

  const formatScheduleTime = (start: string, end: string): string => {
    const normalize = (time: string) => time.replace(".", ":"); // Basic normalization
    try {
      // This is a naive attempt to format, consider a robust time parsing library if formats vary wildly
      const formatIfPossible = (timeStr: string) => {
        const [hourMinute, period] = timeStr.split(" ");
        const [hour, minute] = hourMinute.split(":");
        if (
          hour &&
          minute &&
          parseInt(hour) >= 1 &&
          parseInt(hour) <= 12 &&
          parseInt(minute) >= 0 &&
          parseInt(minute) <= 59
        ) {
          return `${hour}:${minute}${period ? " " + period : ""}`;
        }
        return timeStr; // fallback
      };
      return `${formatIfPossible(normalize(start))} - ${formatIfPossible(
        normalize(end)
      )}`;
    } catch {
      return `${normalize(start)} - ${normalize(end)}`;
    }
  };

  // Enhance event time display to show multi-day indicator
  const formatEventTime = (startISO: string, endISO?: string): string => {
    try {
      // If it's a multi-day event spanning over the selected date
      if (endISO && !isSameDay(parseISO(startISO), selectedDate)) {
        // If we're on the end date
        if (isSameDay(parseISO(endISO), selectedDate)) {
          return `Until ${format(parseISO(endISO), "h:mm a")}`;
        }
        // If we're in the middle of a multi-day event
        if (
          selectedDate > parseISO(startISO) &&
          selectedDate < parseISO(endISO)
        ) {
          return "All day";
        }
      }

      return format(parseISO(startISO), "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  // --- Styling and Content Constants ---
  const backgroundColor = "#ecfeff";
  const primaryDarkColor = "#0891b2";
  const primaryColor = "#06b6d4";
  const accentColor = "#ef4444";
  const mutedTextColor = "#9ca3af";
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const categories = [
    { name: "Work", color: "bg-blue-500" },
    { name: "Personal", color: "bg-green-500" },
    { name: "Health", color: "bg-red-500" },
    { name: "Education", color: "bg-purple-500" },
    { name: "Social", color: "bg-yellow-500" },
    { name: "Family", color: "bg-pink-500" },
    { name: "Finance", color: "bg-indigo-500" },
    { name: "Shopping", color: "bg-amber-500" },
    { name: "Travel", color: "bg-emerald-500" },
    { name: "Other", color: "bg-cyan-500" },
  ];

  const getCategoryColor = (categoryName: string | null): string => {
    if (!categoryName) return "bg-gray-400";

    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    return category ? category.color : "bg-cyan-500"; // Default to cyan if no match
  };

  const getTodoColor = (title: string | undefined): string => {
    if (!title) return "bg-gray-400"; // Default color

    // Available color classes
    const colorOptions = [
      "bg-blue-500",
      "bg-green-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-amber-500",
      "bg-emerald-500",
      "bg-rose-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-cyan-500",
    ];

    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colorOptions.length;
    return colorOptions[index];
  };

  return (
    <SafeAreaView className="flex-1 bg-cyan-50 pt-6">
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }>
        <View className="flex-1 p-6 pt-10 pb-4">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-10">
            <View>
              <Text className="font-urbanist text-gray-600 text-base">
                {greeting},
              </Text>
              <Text className="font-urbanistBold text-cyan-700 text-2xl">
                {userName || "Loading..."}
              </Text>
            </View> 
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="w-12 h-12 rounded-full bg-cyan-100 border border-cyan-300 items-center justify-center overflow-hidden">
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: user.profileImageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={primaryDarkColor}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Calendar Controls */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={showDatePickerModal}
                className="flex-row items-center">
                <Text className="font-urbanistMedium text-lg text-gray-800 mr-1">
                  {calendarViewMode === "week"
                    ? format(selectedDate, "MMMM yyyy")
                    : format(currentMonth, "MMMM yyyy")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={primaryDarkColor}
                />
              </TouchableOpacity>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={goToToday} className="p-1 mr-2">
                  <Text className="font-urbanistMedium text-red-500">
                    Today
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleCalendarView} className="p-1">
                  <Ionicons
                    name={
                      calendarViewMode === "week"
                        ? "calendar-outline"
                        : "calendar"
                    }
                    size={24}
                    color={primaryDarkColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Week View */}
            {calendarViewMode === "week" ? (
              <View className="flex-row justify-between bg-white/80 rounded-xl p-3 border border-cyan-200">
                {weekDates.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleDateSelect(item.fullDate)}
                    className={`items-center justify-center p-2 rounded-lg w-12 h-16 ${
                      isSameDay(item.fullDate, selectedDate)
                        ? "bg-cyan-500"
                        : "bg-transparent"
                    } ${
                      item.isToday && !isSameDay(item.fullDate, selectedDate)
                        ? "border border-red-500"
                        : ""
                    }`}>
                    <Text
                      className={`font-urbanistMedium text-sm ${
                        isSameDay(item.fullDate, selectedDate)
                          ? "text-white"
                          : item.isSunday
                          ? "text-red-500"
                          : "text-gray-600"
                      }`}>
                      {item.day}
                    </Text>
                    <Text
                      className={`font-urbanistBold text-lg mt-1 ${
                        isSameDay(item.fullDate, selectedDate)
                          ? "text-white"
                          : item.isToday
                          ? "text-red-500"
                          : item.isSunday
                          ? "text-red-500"
                          : "text-gray-800"
                      }`}>
                      {item.date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Month View
              <View>
                <View className="flex-row justify-between items-center mb-3 px-4">
                  <TouchableOpacity onPress={goToPreviousMonth} className="p-2">
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={primaryDarkColor}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goToNextMonth} className="p-2">
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={primaryDarkColor}
                    />
                  </TouchableOpacity>
                </View>
                <View className="bg-white/80 rounded-xl p-3 border border-cyan-200">
                  <View className="flex-row mb-2">
                    {dayNames.map((day, index) => (
                      <View key={day} className="flex-1 items-center">
                        <Text
                          className={`font-urbanistMedium text-sm ${
                            index === 6 ? "text-red-500" : "text-gray-600"
                          }`}>
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View className="flex-row flex-wrap">
                    {monthCalendarDates.map((item, index) => (
                      <View
                        key={index}
                        className="w-[14.28%] items-center justify-center py-1">
                        <TouchableOpacity
                          onPress={() => handleDateSelect(item.date)}
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            item.isSelected ? "bg-cyan-500" : ""
                          } ${
                            item.isToday && !item.isSelected
                              ? "border border-red-500"
                              : ""
                          }`}
                          disabled={!item.isCurrentMonth}>
                          <Text
                            className={`font-urbanistMedium text-base ${
                              item.isSelected ? "text-white" : ""
                            } ${
                              !item.isCurrentMonth
                                ? "text-gray-300"
                                : item.isToday
                                ? "text-red-500"
                                : item.isSunday
                                ? "text-red-500"
                                : "text-gray-800"
                            }`}>
                            {item.dayOfMonth}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* --- Schedule Section --- */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-urbanistMedium text-lg text-gray-800">
                Schedule for {format(selectedDate, "MMM d")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(schedule)/schedule")}
                className="p-1">
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={24}
                  color={accentColor}
                />
              </TouchableOpacity>
            </View>
            <View
              className={`bg-white/80 rounded-xl p-4 border border-cyan-200 min-h-[120px] ${
                isLoading && !refreshing ? "justify-center items-center" : ""
              }`}>
              {isLoading && !refreshing ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredSchedulesForSelectedDate.length > 0 ? (
                <View className="space-y-3">
                  {filteredSchedulesForSelectedDate.map((item) => {
                    const categoryColor = getCategoryColor(item.category);
                    return (
                      <View
                        key={item._id}
                        className="flex-row items-start bg-cyan-50/60 rounded-lg p-2.5">
                        <View
                          className={`w-1.5 h-full ${categoryColor} rounded-full mr-3 self-stretch`}
                        />
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center mb-0.5">
                            <Text className="font-urbanistBold text-base text-cyan-800">
                              {formatScheduleTime(item.startTime, item.endTime)}
                            </Text>
                            <View
                              className={`px-2 py-0.5 ${categoryColor} rounded-full`}>
                              <Text className="font-urbanistMedium text-xs text-white">
                                {item.category || "No Category"}
                              </Text>
                            </View>
                          </View>
                          {item.note && (
                            <Text className="font-urbanist text-gray-600 text-sm mt-0.5">
                              {item.note.substring(0, 60)}
                              {item.note.length > 60 ? "..." : ""}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="justify-center items-center min-h-[80px]">
                  <Ionicons
                    name="calendar-clear-outline"
                    size={32}
                    color={mutedTextColor}
                  />
                  <Text className="font-urbanist text-gray-600 mt-2">
                    No schedule items for this day.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* --- To-Do List Section --- */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-urbanistMedium text-lg text-gray-800">
                To-Do List
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(todo)/todo")}
                className="p-1">
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={24}
                  color={accentColor}
                />
              </TouchableOpacity>
            </View>
            <View
              className={`bg-white/80 rounded-xl p-4 border border-cyan-200 min-h-[100px] ${
                isLoading && !refreshing ? "justify-center items-center" : ""
              }`}>
              {isLoading && !refreshing ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredTopTodos.length > 0 ? (
                <View className="space-y-2.5">
                  {filteredTopTodos.map((item) => {
                    const todoColor = getTodoColor(item.title);
                    return (
                      <View
                        key={item._id}
                        className="flex-row items-center p-1">
                        <View
                          className={`w-2 h-5 ${todoColor} rounded-sm mr-3`}
                        />
                        <View className="flex-1">
                          <Text className="font-urbanistMedium text-base text-gray-800">
                            {item.title || "Untitled Task"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="justify-center items-center min-h-[80px]">
                  <Ionicons
                    name="checkmark-done-circle-outline"
                    size={32}
                    color={mutedTextColor}
                  />
                  <Text className="font-urbanist text-gray-600 mt-2">
                    All caught up on tasks!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* --- Events Section --- */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-urbanistMedium text-lg text-gray-800">
                Events for {format(selectedDate, "MMM d")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(events)/event")}
                className="p-1">
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={24}
                  color={accentColor}
                />
              </TouchableOpacity>
            </View>
            <View
              className={`bg-white/80 rounded-xl p-4 border border-cyan-200 min-h-[100px] ${
                isLoading && !refreshing ? "justify-center items-center" : ""
              }`}>
              {isLoading && !refreshing ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredEventsForSelectedDate.length > 0 ? (
                <View className="space-y-3">
                  {filteredEventsForSelectedDate.map((item) => {
                    const eventColor = item.category
                      ? getCategoryColor(item.category)
                      : "bg-violet-500"; // Use category color or default
                    return (
                      <View
                        key={item._id}
                        className="flex-row items-start bg-cyan-50/60 rounded-lg p-2.5">
                        <View
                          className={`w-1.5 h-full ${eventColor} rounded-full mr-3 self-stretch`}
                        />
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center mb-0.5">
                            <Text className="font-urbanistBold text-base text-cyan-800">
                              {formatEventTime(item.startDate, item.endDate)} - 
                              {item.title}
                            </Text>
                            {item.category && (
                              <View
                                className={`px-2 py-0.5 ${eventColor} rounded-full ml-2`}>
                                <Text className="font-urbanistMedium text-xs text-white">
                                  {item.category}
                                </Text>
                              </View>
                            )}
                          </View>
                          {item.location && (
                            <View className="flex-row items-center mt-0.5">
                              <Ionicons
                                name="location-outline"
                                size={14}
                                color={mutedTextColor}
                              />
                              <Text className="font-urbanist text-gray-600 text-sm ml-1">
                                {item.location}
                              </Text>
                            </View>
                          )}
                          {item.description && (
                            <Text className="font-urbanist text-gray-500 text-xs mt-1">
                              {item.description.substring(0, 60)}
                              {item.description.length > 60 ? "..." : ""}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="justify-center items-center min-h-[80px]">
                  <Ionicons
                    name="sparkles-outline"
                    size={32}
                    color={mutedTextColor}
                  />
                  <Text className="font-urbanist text-gray-600 mt-2">
                    No events scheduled for this day.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Spacer */}
          <View className="h-20" />
        </View>
      </ScrollView>

      {/* DateTimePicker Modal */}
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChangeFromPicker}
        />
      )}
    </SafeAreaView>
  );
}
