'use client';

import { useState, useRef, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  selectedDate: DateTime;
  onDateChange: (date: DateTime) => void;
  maxDate?: DateTime;
  minDate?: DateTime;
}

export default function DatePicker({ 
  selectedDate, 
  onDateChange, 
  maxDate = DateTime.now().setZone('America/Los_Angeles').set({ hour: 23, minute: 59, second: 0, millisecond: 0 }),
  minDate = DateTime.now().setZone('America/Los_Angeles').minus({ days: 30 })
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate.startOf('month'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: DateTime) => {
    const start = date.startOf('month');
    const end = date.endOf('month');
    const days = [];
    
    // Add days from previous month to fill first week
    const firstDayOfWeek = start.weekday;
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      days.push(start.minus({ days: i }));
    }
    
    // Add days of current month
    for (let i = 0; i < end.day; i++) {
      days.push(start.plus({ days: i }));
    }
    
    // Add days from next month to fill last week
    const lastDayOfWeek = end.weekday;
    for (let i = 1; i <= 7 - lastDayOfWeek; i++) {
      days.push(end.plus({ days: i }));
    }
    
    return days;
  };

  const handleDateSelect = (date: DateTime) => {
    console.log(date)
    console.log(maxDate)
    if (date >= minDate && date <= maxDate) {
      onDateChange(date);
      setIsOpen(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' 
        ? prev.minus({ months: 1 })
        : prev.plus({ months: 1 })
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span>{selectedDate.toFormat('MMM dd, yyyy')}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <h3 className="text-white font-medium">
              {currentMonth.toFormat('MMMM yyyy')}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isCurrentMonth = day.month === currentMonth.month;
              const isSelected = day.hasSame(selectedDate, 'day');
              const isDisabled = day < minDate || day > maxDate;
              const isToday = day.hasSame(DateTime.now().setZone('America/Los_Angeles'), 'day');

              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    w-8 h-8 text-sm rounded transition-colors
                    ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
                    ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-800'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isToday && !isSelected ? 'bg-blue-500/20 text-blue-400' : ''}
                  `}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={() => handleDateSelect(DateTime.now().setZone('America/Los_Angeles'))}
              className="flex-1 px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleDateSelect(DateTime.now().setZone('America/Los_Angeles').minus({ days: 1 }))}
              className="flex-1 px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Yesterday
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 