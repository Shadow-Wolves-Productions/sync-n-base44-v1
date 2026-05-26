import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks, useCalendarEvents, usePillars, useReminders } from '@/lib/useSyncnData';
import { dateToOffset, offsetToDate, recurringOccursOnDate, formatTime } from '@/lib/syncn';
import AddModal from '@/components/modals/AddModal';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm
const HOUR_HEIGHT = 60;

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: pillars } = usePillars();
  const { data: reminders } = useReminders();
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const scrollRef = useRef(null);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (hour - 7) * HOUR_HEIGHT);
    }
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const goPrev = () => setWeekStart(d => addDays(d, -7));
  const goNext = () => setWeekStart(d => addDays(d, 7));

  const getBlocksForDay = (date) => {
    const offset = dateToOffset(date);
    const blocks = [];

    // Calendar events (locked)
    events.filter(e => e.day_offset === offset && !e.ignored).forEach(e => {
      blocks.push({
        id: `event-${e.id}`,
        title: e.title,
        startMin: (e.start_hour || 0) * 60 + (e.start_min || 0),
        duration: e.duration_mins || 60,
        type: 'event',
        color: '#00b4d8',
        item: e,
      });
    });

    // Scheduled tasks
    tasks.filter(t => t.scheduled && t.day_offset === offset && !t.archived).forEach(t => {
      const pillar = pillars.find(p => p.id === t.pillar_id);
      blocks.push({
        id: `task-${t.id}`,
        title: t.title,
        startMin: (t.start_hour || 0) * 60 + (t.start_min || 0),
        duration: t.duration_mins || 30,
        type: 'task',
        color: pillar?.color || '#6b7280',
        item: t,
        done: t.done,
      });
    });

    // Recurring tasks
    tasks.filter(t => t.is_recurring && !t.archived && !t.done).forEach(t => {
      if (!recurringOccursOnDate(t, date)) return;
      if (blocks.some(b => b.item?.id === t.id)) return;
      const pillar = pillars.find(p => p.id === t.pillar_id);
      blocks.push({
        id: `rec-${t.id}-${offset}`,
        title: t.title,
        startMin: (t.recurring_start_hour || 9) * 60 + (t.recurring_start_min || 0),
        duration: t.duration_mins || 30,
        type: 'recurring',
        color: pillar?.color || '#6b7280',
        item: t,
      });
    });

    // Reminder blocks
    reminders.filter(r => r.block_time).forEach(r => {
      if (r.is_recurring) {
        if (!recurringOccursOnDate(r, date)) return;
        blocks.push({
          id: `rem-${r.id}-${offset}`,
          title: `🔔 ${r.title}`,
          startMin: (r.recurring_start_hour || 9) * 60 + (r.recurring_start_min || 0),
          duration: r.duration_mins || 30,
          type: 'reminder',
          color: '#f59e0b',
          item: r,
        });
      } else if (r.day_offset === offset) {
        blocks.push({
          id: `rem-${r.id}`,
          title: `🔔 ${r.title}`,
          startMin: (r.start_hour || 0) * 60 + (r.start_min || 0),
          duration: r.duration_mins || 30,
          type: 'reminder',
          color: '#f59e0b',
          item: r,
        });
      }
    });

    return blocks;
  };

  const handleBlockClick = (block) => {
    if (block.type === 'event' || block.type === 'reminder') {
      setEditItem({ ...block.item, _type: 'meeting' });
    } else {
      setEditItem({ ...block.item, _type: 'task' });
    }
    setEditOpen(true);
  };

  const handleSlotClick = (dayIndex, hour) => {
    const date = days[dayIndex];
    const offset = dateToOffset(date);
    setEditItem({ _type: 'meeting', day_offset: offset, start_hour: hour, start_min: 0, title: '', duration_mins: 60 });
    setEditOpen(true);
  };

  // Now indicator
  const now = new Date();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((now.getHours() - 6) * HOUR_HEIGHT) + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const todayDayIndex = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'));

  // Reminder counts per day
  const reminderCounts = days.map(date => {
    const offset = dateToOffset(date);
    return reminders.filter(r => {
      if (r.block_time) return false; // block_time reminders show as blocks
      if (r.is_recurring) return recurringOccursOnDate(r, date);
      return r.day_offset === offset;
    }).length;
  });

  return (
    <div className="max-w-screen-xl mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{format(weekStart, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0 mb-1">
        <div />
        {days.map((d, i) => {
          const isToday = format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          return (
            <div key={i} className="text-center pb-2">
              <div className="text-xs text-muted-foreground">{format(d, 'EEE')}</div>
              <div className={`text-sm font-mono mt-0.5 ${isToday ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                {format(d, 'd')}
              </div>
              {reminderCounts[i] > 0 && (
                <span className="text-[10px] text-amber-500">🔔{reminderCounts[i]}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-0 relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Time labels */}
          {HOURS.map(h => (
            <div
              key={h}
              className="text-xs font-mono text-muted-foreground pr-2 text-right"
              style={{ position: 'absolute', top: (h - 6) * HOUR_HEIGHT - 6, left: 0, width: 50 }}
            >
              {format(new Date(2000, 0, 1, h), 'ha').toLowerCase()}
            </div>
          ))}

          {/* Day columns */}
          {days.map((d, dayIndex) => {
            const blocks = getBlocksForDay(d);
            return (
              <div
                key={dayIndex}
                className="relative border-l border-border/30"
                style={{ gridColumn: dayIndex + 2, height: '100%' }}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/20 cursor-pointer hover:bg-muted/20"
                    style={{ top: (h - 6) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(dayIndex, h)}
                  />
                ))}

                {/* Blocks */}
                {blocks.map(block => {
                  const top = ((block.startMin / 60) - 6) * HOUR_HEIGHT;
                  const height = (block.duration / 60) * HOUR_HEIGHT;
                  const isEvent = block.type === 'event';
                  const isRecurring = block.type === 'recurring';
                  const isReminder = block.type === 'reminder';

                  return (
                    <div
                      key={block.id}
                      className={`absolute left-1 right-1 rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden transition-colors text-xs ${
                        isEvent ? 'opacity-100 border-2' : isRecurring ? 'opacity-70 border' : isReminder ? 'opacity-80 border border-dashed' : 'opacity-90 border'
                      } ${block.done ? 'line-through opacity-50' : ''}`}
                      style={{
                        top: Math.max(0, top),
                        height: Math.max(20, height),
                        backgroundColor: `${block.color}20`,
                        borderColor: `${block.color}60`,
                        color: block.color,
                      }}
                      onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                    >
                      <div className="font-medium truncate" style={{ fontSize: height < 30 ? 10 : 11 }}>
                        {block.title}
                      </div>
                      {height >= 30 && (
                        <div className="text-[10px] opacity-70">
                          {formatTime(Math.floor(block.startMin / 60), block.startMin % 60)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Now indicator */}
                {dayIndex === todayDayIndex && nowTop > 0 && (
                  <div className="absolute left-0 right-0 z-10" style={{ top: nowTop }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <div className="flex-1 h-px bg-primary" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}