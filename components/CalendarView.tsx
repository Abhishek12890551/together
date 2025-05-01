import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  // Import isBefore and startOfDay
  isBefore,
  startOfDay,
} from "date-fns";

interface CalendarViewProps {
  isVisible: boolean;
  initialDate: Date;
  selectedDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  isVisible,
  initialDate,
  selectedDate,
  onClose,
  onConfirm,
  accentColor = "#ef4444", // Default accent (red-500)
  textColor = "#0e7490", // Default text (cyan-800)
  backgroundColor = "#ecfeff", // Default background (cyan-50)
}) => {
  const [displayMonth, setDisplayMonth] = useState(startOfMonth(initialDate));
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);

  // Get the start of today once
  const today = useMemo(() => startOfDay(new Date()), []);

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Week starts Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [displayMonth]);

  const handlePrevMonth = () => {
    setDisplayMonth(subMonths(displayMonth, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(addMonths(displayMonth, 1));
  };

  const handleDatePress = (day: Date) => {
    setTempSelectedDate(day);
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedDate); // Calls the function passed from addSchedule.tsx
    onClose(); // Calls the function passed from addSchedule.tsx to hide the modal
  };

  const handleCancel = () => {
    setTempSelectedDate(selectedDate); // Reset temp selection
    onClose();
  };

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={isVisible}
      onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          {/* Header: Month Navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: textColor }]}>
              {format(displayMonth, "MMMM yyyy")}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {daysInMonth.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, displayMonth);
              const isSelected = isSameDay(day, tempSelectedDate);
              // Check if the day is before today
              const isPastDate = isBefore(day, today);
              const isDisabled = !isCurrentMonth || isPastDate; // Disable if not current month OR in the past

              const dayTextStyle = [
                styles.dayText,
                !isCurrentMonth && styles.dayTextNotInMonth,
                isSelected && styles.dayTextSelected,
                // Apply disabled text style if needed (e.g., different color)
                isDisabled && styles.dayTextDisabled,
                // Ensure selected text color overrides disabled style
                {
                  color: isSelected
                    ? "#fff"
                    : isDisabled
                    ? "#9ca3af"
                    : textColor,
                },
              ];
              const dayButtonStyle = [
                styles.dayButton,
                isSelected && { backgroundColor: accentColor },
                // Apply disabled button style (e.g., lower opacity)
                isDisabled && styles.dayButtonDisabled,
              ];

              return (
                <TouchableOpacity
                  key={index}
                  style={dayButtonStyle}
                  onPress={() => handleDatePress(day)}
                  // Disable button if not current month or is past date
                  disabled={isDisabled}>
                  <Text style={dayTextStyle}>{format(day, "d")}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}>
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: accentColor }]}>
              <Text style={styles.buttonTextConfirm}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  navButton: {
    padding: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb", // gray-200
  },
  weekDayText: {
    fontSize: 12,
    color: "#6b7280", // gray-500
    width: 32,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Change justification to align items to the start of the row
    justifyContent: "flex-start",
    width: "100%",
  },
  dayButton: {
    width: "14.28%", // Ensure 7 items fit per row (100% / 7)
    aspectRatio: 1, // Make the button square
    justifyContent: "center",
    alignItems: "center",
    // Remove horizontal margin, rely on width percentage
    marginVertical: 3,
    borderRadius: 100, // Make it circular
  },
  dayButtonDisabled: {
    opacity: 0.4, // Example disabled style
  },
  dayText: {
    fontSize: 14,
  },
  dayTextNotInMonth: {
    color: "#d1d5db", // gray-300
  },
  dayTextSelected: {
    fontWeight: "bold",
  },
  dayTextDisabled: {
    color: "#9ca3af", // Example disabled text color (gray-400)
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end", // Align buttons to the right
    width: "100%",
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6", // gray-100
    borderWidth: 1,
    borderColor: "#d1d5db", // gray-300
  },
  buttonTextCancel: {
    color: "#374151", // gray-700
    fontSize: 14,
    fontWeight: "bold",
  },
  buttonTextConfirm: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default CalendarView;
