import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, useCalendarEvents, usePillars, useReminders } from '@/lib/useSyncnData';
import { dateToOffset, recurringOccursOnDate, formatTime } from '@/lib/syncn';
import AddModal from '@/components/modals/AddModal';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm
const HOUR_HEIGHT = 64;

export default function CalendarPage() {
  const [calView, setCalView] = useState('week'); // 'week' | 'day'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: pillars } = usePillars();
  const { data: reminders } = useReminders();
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const hour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (hour - 7) * HOUR_HEIGHT);
    }
  }, [calView]);

  const now = new Date();
  const days = calView === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [selectedDay];

  const goToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDay(new Date());
  };
  const goPrev = () => {
    if (calView === 'week') setWeekStart(d => subWeeks(d, 1));
    else setSelectedDay(d => addDays(d, -1));
  };
  const goNext = () => {
    if (calView === 'week') setWeekStart(d => addWeeks(d, 1));
    else setSelectedDay(d => addDays(d, 1));
  };

  const switchToDay = (date) => {
    setSelectedDay(date);
    setCalView('day');
  };

  const getBlocksForDay = (date) => {
    const offset = dateToOffset(date);
    const blocks = [];

    events.filter(e => e.day_offset === offset && !e.ignored).forEach(e => {
      blocks.push({
        id: `event-${e.id}`, title: e.title,
        startMin: (e.start_hour || 0) * 60 + (e.start_min || 0),
        duration: e.duration_mins || 60, type: 'event',
        color: '#00b4d8', item: e,
      });
    });

    tasks.filter(t => t.scheduled && t.day_offset === offset && !t.archived).forEach(t => {
      const pillar = pillars.find(p => p.id === t.pillar_id);
      blocks.push({
        id: `task-${t.id}`, title: t.title,
        startMin: (t.start_hour || 0) * 60 + (t.start_min || 0),
        duration: t.duration_mins || 30, type: 'task',
        color: pillar?.color || '#6b7280', item: t, done: t.done,
      });
    });

    tasks.filter(t => t.is_recurring && !t.archived && !t.done).forEach(t => {
      if (!recurringOccursOnDate(t, date)) return;
      if (blocks.some(b => b.item?.id === t.id)) return;
      const pillar = pillars.find(p => p.id === t.pillar_id);
      blocks.push({
        id: `rec-${t.id}-${offset}`, title: t.title,
        startMin: (t.recurring_start_hour || 9) * 60 + (t.recurring_start_min || 0),
        duration: t.duration_mins || 30, type: 'recurring',
        color: pillar?.color || '#6b7280', item: t,
      });
    });

    reminders.filter(r => r.block_time).forEach(r => {
      if (r.is_recurring) {
        if (!recurringOccursOnDate(r, date)) return;
        blocks.push({
          id: `rem-${r.id}-${offset}`, title: r.title,
          startMin: (r.recurring_start_hour || 9) * 60 + (r.recurring_start_min || 0),
          duration: r.duration_mins || 30, type: 'reminder',
          color: '#f59e0b', item: r,
        });
      } else if (r.day_offset === offset) {
        blocks.push({
          id: `rem-${r.id}`, title: r.title,
          startMin: (r.start_hour || 0) * 60 + (r.start_min || 0),
          duration: r.duration_mins || 30, type: 'reminder',
          color: '#f59e0b', item: r,
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

  const handleSlotClick = (date, hour) => {
    const offset = dateToOffset(date);
    setEditItem({ _type: 'meeting', day_offset: offset, start_hour: hour, start_min: 0, title: '', duration_mins: 60 });
    setEditOpen(true);
  };

  const nowTop = ((now.getHours() - 6) * HOUR_HEIGHT) + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const todayStr = format(now, 'yyyy-MM-dd');

  const colCount = calView === 'week' ? 7 : 1;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs font-medium">Today</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <h2 className="text-sm font-semibold">
            {calView === 'week'
              ? format(weekStart, 'MMMM yyyy')
              : format(selectedDay, 'EEEE, MMMM d')}
          </h2>
        </div>

        {/* Day / Week toggle */}
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {['Day', 'Week'].map(v => (
            <button
              key={v}
              onClick={() => {
                if (v === 'Day') { setSelectedDay(new Date()); setCalView('day'); }
                else setCalView('week');
              }}
              className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${
                (v === 'Day' && calView === 'day') || (v === 'Week' && calView === 'week')
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className={`grid shrink-0 border-b border-border/30`} style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}>
        <div />
        {days.map((d, i) => {
          const isToday = format(d, 'yyyy-MM-dd') === todayStr;
          return (
            <div
              key={i}
              className={`text-center py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
              onClick={() => calView === 'week' && switchToDay(d)}
            >
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{format(d, 'EEE')}</div>
              <div className={`text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto transition-colors
                ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
                {format(d, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Time gutter */}
          <div className="shrink-0 relative" style={{ width: 56 }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-[10px] font-mono text-muted-foreground/60"
                style={{ top: (h - 6) * HOUR_HEIGHT - 7, width: 50 }}
              >
                {format(new Date(2000, 0, 1, h), 'ha').toLowerCase()}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIndex) => {
            const blocks = getBlocksForDay(d);
            const isToday = format(d, 'yyyy-MM-dd') === todayStr;
            return (
              <div
                key={dayIndex}
                className={`relative flex-1 border-l border-border/25 ${isToday ? 'bg-primary/[0.02]' : ''}`}
              >
                {/* Hour rows */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-border/20 hover:bg-muted/15 cursor-pointer transition-colors"
                    style={{ top: (h - 6) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(d, h)}
                  />
                ))}

                {/* Blocks */}
                {blocks.map(block => {
                  const top = ((block.startMin / 60) - 6) * HOUR_HEIGHT;
                  const height = Math.max(24, (block.duration / 60) * HOUR_HEIGHT);
                  const isHovered = hoveredBlock === block.id;

                  return (
                    <div
                      key={block.id}
                      className={`absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer overflow-visible transition-all z-10 ${block.done ? 'opacity-40' : 'opacity-90 hover:opacity-100'}`}
                      style={{
                        top: Math.max(0, top),
                        height,
                        backgroundColor: `${block.color}18`,
                        borderLeft: `3px solid ${block.color}`,
                        color: block.color,
                        boxShadow: isHovered ? `0 4px 12px ${block.color}30` : 'none',
                      }}
                      onMouseEnter={() => setHoveredBlock(block.id)}
                      onMouseLeave={() => setHoveredBlock(null)}
                      onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                    >
                      <div className={`font-medium truncate leading-tight ${block.done ? 'line-through' : ''}`} style={{ fontSize: height < 30 ? 10 : 11 }}>
                        {block.title}
                      </div>
                      {height >= 32 && (
                        <div className="text-[10px] opacity-60 mt-0.5">
                          {formatTime(Math.floor(block.startMin / 60), block.startMin % 60)}
                          {block.duration && ` · ${block.duration}m`}
                        </div>
                      )}
                      {isHovered && (
                        <div
                          className="absolute left-0 z-30 rounded-lg px-2 py-2 shadow-lg border pointer-events-none"
                          style={{
                            top: height + 2,
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: `${block.color}40`,
                            color: 'hsl(var(--foreground))',
                            minWidth: 140,
                          }}
                        >
                          <p className="text-xs font-semibold">{block.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatTime(Math.floor(block.startMin / 60), block.startMin % 60)} · {block.duration}m
                          </p>
                          {block.item?.notes && <p className="text-[10px] text-muted-foreground mt-1 truncate">{block.item.notes}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Now indicator */}
                {isToday && nowTop > 0 && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
                      <div className="flex-1 h-px bg-primary/70" />
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