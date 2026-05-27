import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarEvents, useTasks } from '@/lib/useSyncnData';
import { usePillars } from '@/lib/useSyncnData';
import { offsetToDate } from '@/lib/syncn';

export default function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: events } = useCalendarEvents();
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();

  const today = new Date();

  // Mini month calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const hasItems = (date) => {
    const hasEvent = events.some(e => !e.ignored && isSameDay(offsetToDate(e.day_offset), date));
    const hasTask = tasks.some(t => t.scheduled && !t.archived && isSameDay(offsetToDate(t.day_offset), date));
    return hasEvent || hasTask;
  };

  // Today's timeline items (tasks + events scheduled for today, day_offset=0)
  const todayItems = useMemo(() => {
    const items = [];
    tasks.filter(t => t.scheduled && t.day_offset === 0 && !t.archived).forEach(t => {
      items.push({ ...t, _itemType: 'task' });
    });
    events.filter(e => e.day_offset === 0 && !e.ignored).forEach(e => {
      items.push({ ...e, _itemType: 'event' });
    });
    return items.sort((a, b) => {
      const aH = a.start_hour ?? 0, aM = a.start_min ?? 0;
      const bH = b.start_hour ?? 0, bM = b.start_min ?? 0;
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
  }, [tasks, events]);

  return (
    <div className="w-56 shrink-0 space-y-4">
      {/* Mini month calendar */}
      <div className="bg-card border border-border/50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          </button>
          <span className="text-[11px] font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-0.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[9px] text-muted-foreground font-medium py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const todayDate = isToday(day);
            const hasActivity = isCurrentMonth && hasItems(day);
            return (
              <div key={i} className="flex flex-col items-center py-0.5">
                <span className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full
                  ${!isCurrentMonth ? 'text-muted-foreground/25' : 'text-foreground'}
                  ${todayDate ? 'bg-primary text-primary-foreground font-bold' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {hasActivity && !todayDate && (
                  <div className="w-0.5 h-0.5 rounded-full bg-primary/60 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's timeline */}
      <div className="bg-card border border-border/50 rounded-xl p-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Today — {format(today, 'EEE d MMM')}
        </p>
        {todayItems.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2">Nothing scheduled</p>
        ) : (
          <div className="space-y-1">
            {todayItems.map((item, i) => {
              const pillar = pillars?.find(p => p.id === item.pillar_id);
              const hour = item.start_hour ?? 0;
              const min = item.start_min ?? 0;
              const timeStr = format(new Date(2000, 0, 1, hour, min), 'h:mm a');
              const color = pillar?.color || (item._itemType === 'event' ? '#00b4d8' : '#94a3b8');
              return (
                <div key={item.id || i} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono w-12 shrink-0 pt-0.5">{timeStr}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="rounded px-1.5 py-1 text-[11px] font-medium truncate"
                      style={{ backgroundColor: color + '22', color: color, borderLeft: `2px solid ${color}` }}
                    >
                      {item.title}
                      {item.duration_mins && (
                        <span className="ml-1 opacity-70 font-normal">{item.duration_mins}m</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}