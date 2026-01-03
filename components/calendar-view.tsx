"use client";

import { useState } from "react";

interface CalendarViewProps {
  slots: Array<{
    id: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    [key: string]: any;
  }>;
  onDateSelect?: (date: string) => void;
  onSlotToggle?: (slotId: string, isAvailable: boolean) => void;
  showToggle?: boolean;
}

export function CalendarView({ slots, onDateSelect, onSlotToggle, showToggle = false }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group slots by date
  const slotsByDate: { [key: string]: typeof slots } = {};
  slots.forEach((slot) => {
    const date = new Date(slot.start_time).toISOString().split("T")[0];
    if (!slotsByDate[date]) {
      slotsByDate[date] = [];
    }
    slotsByDate[date].push(slot);
  });

  // Get days in current month
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }


  const selectedDateSlots = selectedDate ? slotsByDate[selectedDate] || [] : [];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClickInternal = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    if (onDateSelect) {
      onDateSelect(dateStr);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-custom-text">Calendar</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              className="px-3 py-1 bg-dark-green-900/50 border border-cyber-green/30 rounded text-custom-text hover:bg-dark-green-800/50"
            >
              ←
            </button>
            <span className="px-4 py-1 text-custom-text font-semibold">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              className="px-3 py-1 bg-dark-green-900/50 border border-cyber-green/30 rounded text-custom-text hover:bg-dark-green-800/50"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-custom-text/70 py-2">
              {day}
            </div>
          ))}
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square"></div>;
            }
            const dateStr = date.toISOString().split("T")[0];
            const hasSlots = !!slotsByDate[dateStr];
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const isPast = date < new Date() && !isToday;

            return (
              <button
                key={dateStr}
                onClick={() => !isPast && handleDateClickInternal(date)}
                disabled={isPast}
                className={`aspect-square rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-cyber-green/30 border-cyber-green"
                    : hasSlots
                    ? "bg-dark-green-900/50 border-cyber-green/30 hover:border-cyber-green/50"
                    : "bg-dark-green-900/30 border-cyber-green/20"
                } ${isPast ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${
                  isToday ? "ring-2 ring-cyber-green/50" : ""
                }`}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className={`text-sm ${isSelected ? "text-cyber-green font-bold" : "text-custom-text"}`}>
                    {date.getDate()}
                  </span>
                  {hasSlots && (
                    <span className="text-xs text-cyber-green mt-1">
                      {slotsByDate[dateStr].length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Slots */}
      {selectedDate && selectedDateSlots.length > 0 && (
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">
            Slots for {new Date(selectedDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          <div className="space-y-3">
            {selectedDateSlots.map((slot) => {
              const startTime = new Date(slot.start_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              const endTime = new Date(slot.end_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-4 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg"
                >
                  <div>
                    <p className="text-custom-text font-semibold">
                      {startTime} - {endTime}
                    </p>
                    <p className="text-sm text-custom-text/70">
                      ${slot.rate_per_hour}/hour •{" "}
                      {slot.is_available ? (
                        <span className="text-green-300">Available</span>
                      ) : (
                        <span className="text-red-300">Unavailable</span>
                      )}
                    </p>
                  </div>
                  {showToggle && onSlotToggle && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={slot.is_available}
                        onChange={(e) => onSlotToggle(slot.id, e.target.checked)}
                        className="w-5 h-5 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                      />
                      <span className="text-sm text-custom-text">Available</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

