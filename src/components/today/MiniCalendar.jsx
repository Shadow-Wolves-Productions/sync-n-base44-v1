import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarEvents, useTasks } from '@/lib/useSyncnData';
import { offsetToDate } from '@/lib/syncn';

export default function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const { data: events } = useCalendarEvents();
  const { data: tasks } = useTasks();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Check if a date has items
  const hasItems = (date) => {
    const hasEvent = events.some(e => {
      if (e.ignored) return false;
      const d = offsetToDate(e.day_offset);
      return isSameDay(d, date);
    });
    const hasTask = tasks.some(t => {
      if (!t.scheduled || t.archived) return false;
      const d = offsetToDate(t.day_offset);
      return isSameDay(d, date);
    });
    return hasEvent || hasTask;
  };

  const today = new Date();

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 w-64 shrink-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const todayDate = isToday(day);
          const hasActivity = isCurrentMonth && hasItems(day);
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <span
                className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full transition-colors
                  ${!isCurrentMonth ? 'text-muted-foreground/30' : ''}
                  ${todayDate ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground'}
                `}
              >
                {format(day, 'd')}
              </span>
              {hasActivity && !todayDate && (
                <div className="w-1 h-1 rounded-full bg-primary/50 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Today label */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          Today — {format(today, 'EEEE, d MMM')}
        </p>
      </div>
    </div>
  );
}