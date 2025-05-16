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
  Dimensions,
  Image,
} from "react-native";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Entypo } from "@expo/vector-icons";
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
} from "date-fns";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../contexts/AuthContext";

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
  date: string;
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
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  category?: string;
}

// For API responses that might wrap data
interface ApiCollectionResponse<T> {
  success: boolean;
  count?: number;
  data: T[];
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
      const startDayOfWeek = getDay(monthStart);
      const weekStartsOn = 1;
      const correctedStartDayOfWeek = (startDayOfWeek - weekStartsOn + 7) % 7;

      const datesArray: CalendarDate[] = [];
      const startDateForCalendar = subDays(monthStart, correctedStartDayOfWeek);

      for (let i = 0; i < 42; i++) {
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
    const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const datesArray: WeekDate[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(start, i);
      datesArray.push({
        day: format(currentDate, "EEE"),
        date: format(currentDate, "d"),
        isToday: isToday(currentDate),
        fullDate: currentDate,
        isSunday: getDay(currentDate) === 0,
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
            date: selectedDateFormatted,
          },
        }),
        axiosInstance.get<ApiCollectionResponse<Todo>>("/todos"),
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
  }, [authTokenFromContext, currentMonth, selectedDate]);

  useEffect(() => {
    if (user) {
      setUserName(user.name || "User");
    } else {
      const fetchUserFromStorage = async () => {
        try {
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUserName(parsedUser.name || "User");
          } else {
            setUserName("User");
          }
        } catch (error) {
          console.error("Error fetching user from storage:", error);
          setUserName("User");
        }
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
      setRefreshing(false);
    }
  }, [fetchData, authTokenFromContext]);

  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const handleDateSelect = (date: Date) => {
    const newSelectedDate = startOfDay(date);
    setSelectedDate(newSelectedDate);

    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date));
    } else if (!isSameDay(newSelectedDate, selectedDate)) {
      setIsLoading(true);
      fetchData();
    }
  };

  const toggleCalendarView = () =>
    setCalendarViewMode((prev) => (prev === "week" ? "month" : "week"));
  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
  };

  const onDateChangeFromPicker = (
    event: DateTimePickerEvent,
    newSelectedDate?: Date
  ) => {
    setShowPicker(Platform.OS === "ios");
    if (event.type === "set" && newSelectedDate) {
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
        return false;
      }
    })
    .sort((a, b) => {
      const parseTime = (timeStr: string) => {
        try {
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
          if (isAM12) hoursNum = 0;

          return hoursNum * 60 + parseInt(minutes || "0", 10);
        } catch {
          return 0;
        }
      };

      return parseTime(a.startTime) - parseTime(b.startTime);
    })
    .slice(0, 3);

  // Get all upcoming events for the current month
  const upcomingEventsForCurrentMonth = useMemo(() => {
    const today = startOfDay(new Date());

    return monthlyEvents
      .filter((event) => {
        try {
          const eventStartDate = parseISO(event.startDate);
          return eventStartDate >= today;
        } catch {
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
      })
      .slice(0, 5);
  }, [monthlyEvents]);

  // Filter todos to get the most important incomplete ones
  const filteredTopTodos = allTodos
    .filter((todo) => !todo.completed)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 5);

  const formatScheduleTime = (start: string, end: string): string => {
    const normalize = (time: string) => time.replace(".", ":");
    try {
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
        return timeStr;
      };
      return `${formatIfPossible(normalize(start))} - ${formatIfPossible(
        normalize(end)
      )}`;
    } catch {
      return `${normalize(start)} - ${normalize(end)}`;
    }
  };

  // Format dates for upcoming events display
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
    } catch {
      return "Invalid date";
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
    return category ? category.color : "bg-cyan-500";
  };

  const getTodoColor = (title: string | undefined): string => {
    if (!title) return "bg-gray-400";

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
              {calendarViewMode === "month" ? (
                <Text className="font-urbanistMedium text-lg text-gray-800">
                  {format(currentMonth, "MMMM yyyy")}
                </Text>
              ) : (
                <Text className="font-urbanistMedium text-lg text-gray-800">
                  {format(selectedDate, "MMMM yyyy")}
                </Text>
              )}
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
                          <View className="flex-row justify-between items-start">
                            <Text
                              className="font-urbanistMedium text-base text-gray-800 flex-1 mr-2"
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {item.category}
                            </Text>
                            <Text className="font-urbanist text-sm text-cyan-600">
                              {formatScheduleTime(item.startTime, item.endTime)}
                            </Text>
                          </View>
                          {item.note && (
                            <Text
                              className="font-urbanist text-sm text-gray-500 mt-1"
                              numberOfLines={2}
                              ellipsizeMode="tail">
                              {item.note}
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
          {/* --- Upcoming Events Section --- */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-urbanistMedium text-lg text-gray-800">
                Upcoming Events This Month
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
              ) : upcomingEventsForCurrentMonth.length > 0 ? (
                <View className="space-y-3">
                  {upcomingEventsForCurrentMonth.map((item) => {
                    const eventColor = item.category
                      ? getCategoryColor(item.category)
                      : "bg-violet-500";
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
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={primaryDarkColor}
                            />
                            <Text className="font-urbanistMedium text-sm text-cyan-800 ml-1">
                              {formatEventDate(item.startDate, item.endDate)}
                            </Text>
                            <Text className="font-urbanist text-sm text-gray-600 ml-3">
                              {format(parseISO(item.startDate), "h:mm a")}
                              {item.endDate &&
                                !isSameDay(
                                  parseISO(item.startDate),
                                  parseISO(item.endDate)
                                ) &&
                                " →"}
                            </Text>
                          </View>
                          {item.location && (
                            <View className="flex-row items-center mt-1">
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
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="justify-center items-center min-h-[80px]">
                  <Ionicons
                    name="calendar-outline"
                    size={32}
                    color={mutedTextColor}
                  />
                  <Text className="font-urbanist text-gray-600 mt-2">
                    No upcoming events this month.
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
