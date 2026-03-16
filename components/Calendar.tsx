'use client';

import { useEffect, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isOpenDay } from '@/lib/services';

interface CalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string;
}

export default function Calendar({ onDateSelect, selectedDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (isOpenDay(date)) {
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }

    setAvailableDates(dates);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isDateAvailable = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return availableDates.includes(dateString);
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return isSameDay(date, new Date(`${selectedDate}T00:00:00`));
  };

  const handleDateClick = (date: Date) => {
    if (isDateAvailable(date)) {
      onDateSelect(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isAvailable = isDateAvailable(day);
          const isSelected = isDateSelected(day);
          const isTodayDate = isToday(day);
          const isPastDate = isPast(day) && !isTodayDate;

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={!isAvailable || isPastDate}
              className={`
                calendar-day
                ${!isCurrentMonth ? 'text-gray-300' : ''}
                ${isPastDate ? 'disabled' : ''}
                ${isTodayDate ? 'ring-2 ring-primary-500' : ''}
                ${isSelected ? 'selected' : ''}
                ${isAvailable && !isSelected && !isPastDate ? 'hover:bg-primary-100' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-primary-500 rounded" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span>No disponible</span>
        </div>
      </div>
    </div>
  );
}
