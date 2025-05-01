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
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  startOfMonth,
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
}

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null);
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const generateMonthDates = (
    monthDate: Date,
    selected: Date
  ): CalendarDate[] => {
    const monthStart = startOfMonth(monthDate);
    const startDayOfWeek = getDay(monthStart);
    const weekStartsOn = 1;
    const correctedStartDayOfWeek = (startDayOfWeek - weekStartsOn + 7) % 7;

    const dates: CalendarDate[] = [];
    const startDate = subDays(monthStart, correctedStartDayOfWeek);

    for (let i = 0; i < 42; i++) {
      const loopDate = addDays(startDate, i);
      dates.push({
        date: loopDate,
        dayOfMonth: getDate(loopDate),
        isCurrentMonth: isSameMonth(loopDate, monthStart),
        isToday: isToday(loopDate),
        isSelected: isSameDay(loopDate, selected),
        isSunday: getDay(loopDate) === 0,
      });
    }
    return dates;
  };

  const getWeekDates = (referenceDate: Date) => {
    const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const dates: WeekDate[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(start, i);
      dates.push({
        day: format(currentDate, "EEE"),
        date: format(currentDate, "d"),
        isToday: isToday(currentDate),
        fullDate: currentDate,
        isSunday: getDay(currentDate) === 0,
      });
    }
    setWeekDates(dates);
  };

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const [scheduleRes, todoRes, eventRes] = await Promise.all([
        axiosInstance.get("/schedules", {
          headers: { Authorization: `${token}` },
        }),
        axiosInstance.get("/todos", { headers: { Authorization: `${token}` } }),
        axiosInstance.get("/events", {
          headers: { Authorization: `${token}` },
        }),
      ]);

      if (Array.isArray(scheduleRes.data)) {
        setSchedules(scheduleRes.data);
      } else if (scheduleRes.data && Array.isArray(scheduleRes.data.data)) {
        setSchedules(scheduleRes.data.data);
      } else {
        console.warn("Invalid schedule data format:", scheduleRes.data);
        setSchedules([]);
      }

      if (Array.isArray(todoRes.data)) {
        setTodos(todoRes.data);
      } else if (todoRes.data && Array.isArray(todoRes.data.data)) {
        setTodos(todoRes.data.data);
      } else {
        console.warn("Invalid todo data format:", todoRes.data);
        setTodos([]);
      }

      if (Array.isArray(eventRes.data)) {
        setEvents(eventRes.data);
      } else if (eventRes.data && Array.isArray(eventRes.data.data)) {
        setEvents(eventRes.data.data);
      } else {
        console.warn("Invalid event data format:", eventRes.data);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching data for home screen:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("user");
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUserName(userData.name || "User");
        } else {
          setUserName("User");
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setUserName("User");
      }
    };

    const getCurrentGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 18) return "Good afternoon";
      return "Good evening";
    };

    setIsLoading(true);
    fetchUserData();
    fetchData();
    setGreeting(getCurrentGreeting());

    getWeekDates(selectedDate);
    setMonthCalendarDates(generateMonthDates(currentMonth, selectedDate));
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getWeekDates(selectedDate);
    setMonthCalendarDates(generateMonthDates(currentMonth, selectedDate));
  }, [selectedDate, currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(startOfMonth(date));
    }
  };

  const toggleCalendarView = () => {
    setCalendarViewMode((prevMode) => (prevMode === "week" ? "month" : "week"));
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(startOfMonth(today));
  };

  const showDatePicker = () => {
    console.log("Show date picker (requires implementation)");
  };

  const onDateChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined
  ) => {
    const currentDate = selectedDate || new Date();
    setShowPicker(Platform.OS === "ios");
    setSelectedDate(currentDate);
    if (!isSameMonth(currentDate, currentMonth)) {
      setCurrentMonth(startOfMonth(currentDate));
    }
  };

  const filteredSchedules = schedules
    .filter((schedule) => {
      try {
        return (
          schedule.date && isSameDay(parseISO(schedule.date), selectedDate)
        );
      } catch (error) {
        console.error("Error parsing schedule date:", schedule.date, error);
        return false;
      }
    })
    .sort((a, b) => {
      const normalizeTime = (time: string) =>
        time.replace(":", ".").replace(" ", "");
      return normalizeTime(a.startTime).localeCompare(
        normalizeTime(b.startTime)
      );
    })
    .slice(0, 3);

  const filteredTodos = todos.filter((todo) => !todo.completed).slice(0, 3);

  const filteredEvents = events
    .filter((event) => {
      try {
        return (
          event.startDate && isSameDay(parseISO(event.startDate), selectedDate)
        );
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);

  const formatScheduleTime = (start: string, end: string) => {
    const normalizeTime = (time: string) => {
      return time.includes(".") ? time.replace(".", ":") : time;
    };

    return `${normalizeTime(start)} - ${normalizeTime(end)}`;
  };

  const formatEventTime = (startISO: string): string => {
    try {
      return format(parseISO(startISO), "p");
    } catch {
      return "Invalid time";
    }
  };

  const backgroundColor = "#ecfeff";
  const primaryDarkColor = "#0891b2";
  const mutedTextColor = "#9ca3af";
  const primaryColor = "#06b6d4";
  const accentColor = "#ef4444";

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getCategoryColor = (categoryName: string | null): string => {
    if (!categoryName) return "bg-gray-500";

    const category = categories.find(
      (cat) =>
        cat.id.toLowerCase() === categoryName.toLowerCase() ||
        cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    return category ? category.color : "bg-gray-500";
  };

  const getTodoColor = (title: string | undefined): string => {
    if (!title) return "bg-gray-400";

    // Generate a consistent color based on the title string
    const colors = [
      "bg-cyan-500",
      "bg-blue-500",
      "bg-teal-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-pink-500",
      "bg-purple-500",
      "bg-indigo-500",
    ];

    // Simple hash function to get consistent colors for the same title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const categories = [
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

  return (
    <SafeAreaView className="flex-1 bg-cyan-50">
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
              className="w-12 h-12 rounded-full bg-cyan-100 border border-cyan-300 items-center justify-center">
              <Ionicons
                name="person-outline"
                size={24}
                color={primaryDarkColor}
              />
            </TouchableOpacity>
          </View>
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={showDatePicker}
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
                        : "calendar-sharp"
                    }
                    size={24}
                    color={primaryDarkColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

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
                          className={`w-9 h-9 rounded-full items-center justify-center
                              ${item.isSelected ? "bg-cyan-500" : ""} ${
                            item.isToday && !item.isSelected
                              ? "border border-red-500"
                              : ""
                          }
                            `}
                          disabled={!item.isCurrentMonth}>
                          <Text
                            className={`font-urbanistMedium text-base
                                ${item.isSelected ? "text-white" : ""} ${
                              !item.isCurrentMonth
                                ? "text-gray-300"
                                : item.isToday
                                ? "text-red-500"
                                : item.isSunday
                                ? "text-red-500"
                                : "text-gray-800"
                            }
                            `}>
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
                isLoading ? "justify-center items-center" : ""
              }`}>
              {isLoading ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredSchedules.length > 0 ? (
                <View className="space-y-4">
                  {filteredSchedules.map((item) => {
                    const categoryColor = getCategoryColor(item.category);
                    return (
                      <View
                        key={item._id}
                        className="flex-row items-start bg-cyan-50/60 rounded-lg p-2.5">
                        <View
                          className={`w-1.5 h-full ${categoryColor} rounded-full mr-3 self-stretch`}
                        />
                        <View className="flex-1">
                          {/* Time and category in same row with space between */}
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="font-urbanistBold text-base text-cyan-800">
                              {formatScheduleTime(item.startTime, item.endTime)}
                            </Text>
                            <View
                              className={`px-2 py-0.5 ${categoryColor} rounded-full`}>
                              <Text className="font-urbanistBold text-xs text-white">
                                {item.category || "No Category"}
                              </Text>
                            </View>
                          </View>

                          {item.note && (
                            <Text className="font-urbanist text-gray-600 text-sm mt-1">
                              {item.note.substring(0, 50)}
                              {item.note.length > 50 ? "..." : ""}
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
                    name="calendar-outline"
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
                isLoading ? "justify-center items-center" : ""
              }`}>
              {isLoading ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredTodos.length > 0 ? (
                <View className="space-y-3 gap-1">
                  {filteredTodos.map((item) => {
                    const todoColor = getTodoColor(
                      item.listTitle || item.title
                    );
                    return (
                      <View key={item._id} className="flex-row items-center">
                        <View
                          className={`w-2 h-6 ${todoColor} rounded-full mr-3`}
                        />
                        <View className="flex-1">
                          <Text className="font-urbanistBold text-base">
                            {item.listTitle || item.title || item.text}
                          </Text>
                          {(item.listTitle || item.title) && item.text && (
                            <Text className="font-urbanist text-xs text-gray-500 mt-1">
                              {item.text.length > 30
                                ? item.text.substring(0, 30) + "..."
                                : item.text}
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
                    name="checkmark-circle-outline"
                    size={32}
                    color={mutedTextColor}
                  />
                  <Text className="font-urbanist text-gray-600 mt-2">
                    No to-do items for today.
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/* --- Upcoming Events Section --- */}
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
                isLoading ? "justify-center items-center" : ""
              }`}>
              {isLoading ? (
                <ActivityIndicator color={primaryColor} />
              ) : filteredEvents.length > 0 ? (
                <View className="space-y-3">
                  {filteredEvents.map((item) => {
                    const eventColor = "bg-violet-500";

                    return (
                      <View key={item._id} className="flex-row items-center">
                        <View
                          className={`w-1.5 h-8 ${eventColor} rounded-full mr-3`}
                        />
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center">
                            <Text className="font-urbanistMedium text-violet-800">
                              {formatEventTime(item.startDate)} - {item.title}
                            </Text>
                            <View
                              className={`px-2 py-0.5 ${eventColor} rounded-full ml-2`}>
                              <Text className="font-urbanistBold text-xs text-white">
                                Event
                              </Text>
                            </View>
                          </View>
                          {item.location && (
                            <Text className="font-urbanist text-gray-500 text-xs">
                              {item.location}
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
                    No events for this day.
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View className="h-20" />
        </View>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </SafeAreaView>
  );
}
