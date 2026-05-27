import React, { useState, useEffect, useRef } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, useCalendarEvents, usePillars, useReminders } from '@/lib/useSyncnData';
import { dateToOffset, recurringOccursOnDate } from '@/lib/syncn';
import AddModal from '@/components/modals/AddModal';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00–21:00
const HOUR_HEIGHT = 64;
const GUTTER_WIDTH = 68;

function fmt24(hour, min) {
  return `${String(hour).padStart(2, '0')}:${String(min || 0).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const [calView, setCalView] = useState('week');
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

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const hour = new Date().getHours();
      scrollRef.current.scrollTop = Math.max(0, (hour - 7) * HOUR_HEIGHT);
    }
  }, [calView]);

  const days = calView === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [selectedDay];

  const goToday = () => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDay(new Date()); };
  const goPrev = () => { if (calView === 'week') setWeekStart(d => subWeeks(d, 1)); else setSelectedDay(d => addDays(d, -1)); };
  const goNext = () => { if (calView === 'week') setWeekStart(d => addWeeks(d, 1)); else setSelectedDay(d => addDays(d, 1)); };
  const switchToDay = (date) => { setSelectedDay(date); setCalView('day'); };

  const resolveCollisions = (blocks) => {
    const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
    const columns = [];
    const result = sorted.map(block => {
      const blockEnd = block.startMin + block.duration;
      let col = 0;
      while (columns[col] && columns[col] > block.startMin) col++;
      columns[col] = blockEnd;
      return { ...block, col };
    });
    return result.map((block, i) => {
      const blockEnd = block.startMin + block.duration;
      let maxCol = block.col;
      result.forEach((other, j) => {
        if (i === j) return;
        const otherEnd = other.startMin + other.duration;
        if (block.startMin < otherEnd && blockEnd > other.startMin) maxCol = Math.max(maxCol, other.col);
      });
      return { ...block, totalCols: maxCol + 1 };
    });
  };

  const getBlocksForDay = (date) => {
    const offset = dateToOffset(date);
    const raw = [];

    events.filter(e => e.day_offset === offset && !e.ignored).forEach(e => {
      raw.push({ id: `event-${e.id}`, title: e.title, startMin: (e.start_hour || 0) * 60 + (e.start_min || 0), duration: e.duration_mins || 60, type: 'event', locked: true, color: '#00b4d8', item: e });
    });

    tasks.filter(t => t.scheduled && t.day_offset === offset && !t.archived).forEach(t => {
      const pillar = pillars.find(p => p.id === t.pillar_id);
      raw.push({ id: `task-${t.id}`, title: t.title, startMin: (t.start_hour || 0) * 60 + (t.start_min || 0), duration: t.duration_mins || 30, type: 'task', locked: false, color: pillar?.color || '#6b7280', item: t, done: t.done });
    });

    tasks.filter(t => t.is_recurring && !t.archived && !t.done).forEach(t => {
      if (!recurringOccursOnDate(t, date)) return;
      if (raw.some(b => b.item?.id === t.id)) return;
      const pillar = pillars.find(p => p.id === t.pillar_id);
      raw.push({ id: `rec-${t.id}-${offset}`, title: t.title, startMin: (t.recurring_start_hour || 9) * 60 + (t.recurring_start_min || 0), duration: t.duration_mins || 30, type: 'recurring', locked: false, color: pillar?.color || '#6b7280', item: t });
    });

    reminders.filter(r => r.block_time).forEach(r => {
      if (r.is_recurring) {
        if (!recurringOccursOnDate(r, date)) return;
        raw.push({ id: `rem-${r.id}-${offset}`, title: r.title, startMin: (r.recurring_start_hour || 9) * 60 + (r.recurring_start_min || 0), duration: r.duration_mins || 30, type: 'reminder', locked: false, color: '#f59e0b', item: r });
      } else if (r.day_offset === offset) {
        raw.push({ id: `rem-${r.id}`, title: r.title, startMin: (r.start_hour || 0) * 60 + (r.start_min || 0), duration: r.duration_mins || 30, type: 'reminder', locked: false, color: '#f59e0b', item: r });
      }
    });

    return resolveCollisions(raw);
  };

  const handleBlockClick = (block) => {
    setEditItem(block.type === 'event' || block.type === 'reminder' ? { ...block.item, _type: 'meeting' } : { ...block.item, _type: 'task' });
    setEditOpen(true);
  };

  const handleSlotClick = (date, hour) => {
    setEditItem({ _type: 'meeting', day_offset: dateToOffset(date), start_hour: hour, start_min: 0, title: '', duration_mins: 60 });
    setEditOpen(true);
  };

  const nowTop = ((now.getHours() - 6) * HOUR_HEIGHT) + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const todayStr = format(now, 'yyyy-MM-dd');
  const colCount = calView === 'week' ? 7 : 1;

  const isActiveNow = (block, date) => {
    if (format(date, 'yyyy-MM-dd') !== todayStr) return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return nowMin >= block.startMin && nowMin < block.startMin + block.duration;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs font-medium">Today</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}><ChevronLeft className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
          <h2 className="text-sm font-semibold">
            {calView === 'week' ? format(weekStart, 'MMMM yyyy') : format(selectedDay, 'EEEE, MMMM d')}
          </h2>
        </div>
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {['Day', 'Week'].map(v => (
            <button key={v}
              onClick={() => { if (v === 'Day') { setSelectedDay(new Date()); setCalView('day'); } else setCalView('week'); }}
              className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${
                (v === 'Day' && calView === 'day') || (v === 'Week' && calView === 'week')
                  ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid shrink-0 border-b border-border/40" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${colCount}, 1fr)` }}>
        <div />
        {days.map((d, i) => {
          const isToday = format(d, 'yyyy-MM-dd') === todayStr;
          return (
            <div key={i} className={`text-center py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
              onClick={() => calView === 'week' && switchToDay(d)}>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{format(d, 'EEE')}</div>
              <div className={`text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto transition-colors ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
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
          <div className="shrink-0 relative border-r border-border/40" style={{ width: GUTTER_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className="absolute text-[10px] font-mono text-muted-foreground/70 text-right pr-3"
                style={{ top: (h - 6) * HOUR_HEIGHT - 7, right: 0, width: GUTTER_WIDTH }}>
                {fmt24(h, 0)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIndex) => {
            const blocks = getBlocksForDay(d);
            const isToday = format(d, 'yyyy-MM-dd') === todayStr;
            return (
              <div key={dayIndex} className={`relative flex-1 border-l border-border/40 ${isToday ? 'bg-primary/[0.02]' : ''}`}>
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-border/40 hover:bg-muted/15 cursor-pointer transition-colors"
                    style={{ top: (h - 6) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(d, h)} />
                ))}

                {blocks.map(block => {
                  const top = ((block.startMin / 60) - 6) * HOUR_HEIGHT;
                  const height = Math.max(24, (block.duration / 60) * HOUR_HEIGHT);
                  const isHovered = hoveredBlock === block.id;
                  const colWidth = 100 / (block.totalCols || 1);
                  const colLeft = block.col * colWidth;
                  const active = isActiveNow(block, d);

                  const borderStyle = block.locked
                    ? `3px solid ${block.color}`
                    : block.type === 'recurring'
                      ? `2px dashed ${block.color}`
                      : `2px solid ${block.color}`;

                  const bgOpacity = active ? '55' : block.locked ? '35' : '25';

                  return (
                    <div
                      key={block.id}
                      className={`absolute rounded-lg px-2 py-1 cursor-pointer overflow-visible transition-all z-10 ${block.done ? 'opacity-40' : ''}`}
                      style={{
                        top: Math.max(0, top),
                        height,
                        left: `calc(${colLeft}% + 2px)`,
                        width: `calc(${colWidth}% - 4px)`,
                        backgroundColor: `${block.color}${bgOpacity}`,
                        borderLeft: borderStyle,
                        color: block.color,
                        boxShadow: active ? `0 0 0 1px ${block.color}50, 0 4px 12px ${block.color}30` : isHovered ? `0 4px 12px ${block.color}25` : 'none',
                        filter: block.done ? 'grayscale(0.4)' : 'none',
                      }}
                      onMouseEnter={() => setHoveredBlock(block.id)}
                      onMouseLeave={() => setHoveredBlock(null)}
                      onClick={(e) => { e.stopPropagation(); handleBlockClick(block); }}
                    >
                      <div className={`font-medium truncate leading-tight ${block.done ? 'line-through' : ''}`} style={{ fontSize: height < 30 ? 10 : 11 }}>
                        {block.title}
                      </div>
                      {height >= 32 && (
                        <div className="text-[10px] opacity-70 mt-0.5 font-mono">
                          {fmt24(Math.floor(block.startMin / 60), block.startMin % 60)}
                          {block.duration && ` · ${block.duration}m`}
                        </div>
                      )}

                      {isHovered && (
                        <div
                          className="absolute z-50 rounded-lg px-3 py-2 shadow-2xl border pointer-events-none"
                          style={{
                            top: height + 4,
                            left: 0,
                            minWidth: 160,
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: `${block.color}50`,
                            color: 'hsl(var(--popover-foreground))',
                          }}
                        >
                          <p className="text-xs font-semibold">{block.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {fmt24(Math.floor(block.startMin / 60), block.startMin % 60)} · {block.duration}m
                          </p>
                          {active && <p className="text-[10px] text-primary mt-0.5 font-medium">▶ In progress</p>}
                          {block.locked && <p className="text-[10px] text-amber-400 mt-0.5">Locked event</p>}
                          {block.item?.notes && <p className="text-[10px] text-muted-foreground mt-1">{block.item.notes}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isToday && nowTop > 0 && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
                    <div className="flex items-center">
                      <div className="relative shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-md" />
                        <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-40" />
                      </div>
                      <div className="flex-1 h-px bg-primary/60" />
                      <div className="text-[9px] font-mono text-primary bg-background/90 px-1.5 py-0.5 rounded shrink-0 ml-1">
                        {fmt24(now.getHours(), now.getMinutes())}
                      </div>
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