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
import { isOpenDay } from '@/lib/shared/services';

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

  const isDateAvailable = (date: Date) =>
    availableDates.includes(format(date, 'yyyy-MM-dd'));

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
    <div className="max-w-sm mx-auto">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-200 touch-manipulation"
          style={{ border: '1px solid #2C3E36', color: '#9FB0A2' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#E84B85')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2C3E36')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2
          className="text-base font-semibold capitalize font-display"
          style={{ color: '#F1EDE3' }}
        >
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-200 touch-manipulation"
          style={{ border: '1px solid #2C3E36', color: '#9FB0A2' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#E84B85')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2C3E36')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium py-2"
            style={{ color: '#7C8F81' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

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
              className={`calendar-day ${!isCurrentMonth ? 'opacity-20' : ''} ${isPastDate ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
              style={isTodayDate && !isSelected ? { boxShadow: '0 0 0 2px #E84B85' } : undefined}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-5 text-xs" style={{ color: '#7C8F81' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#E84B85' }} />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#2C3E36' }} />
          No disponible
        </div>
      </div>
    </div>
  );
}
