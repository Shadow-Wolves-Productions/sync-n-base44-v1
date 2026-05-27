import React, { useMemo } from 'react';
import { useTasks, usePillars, useCalendarEvents } from '@/lib/useSyncnData';
import { recurringOccursOnDate, offsetToDate } from '@/lib/syncn';
import { format } from 'date-fns';

const MAX_DAILY_HOURS = 12; // cap for bar scaling

export default function PillarTimeStrip() {
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const pillarMinutes = useMemo(() => {
    const map = {};

    // Scheduled tasks today
    tasks.filter(t => !t.archived && t.scheduled && t.day_offset === 0 && t.duration_mins && t.pillar_id).forEach(t => {
      map[t.pillar_id] = (map[t.pillar_id] || 0) + t.duration_mins;
    });

    // Recurring tasks that occur today
    tasks.filter(t => !t.archived && !t.done && t.is_recurring && t.duration_mins && t.pillar_id).forEach(t => {
      if (!recurringOccursOnDate(t, today)) return;
      // Don't double-count if already scheduled for today
      if (tasks.some(s => s.id === t.id && s.scheduled && s.day_offset === 0)) return;
      map[t.pillar_id] = (map[t.pillar_id] || 0) + t.duration_mins;
    });

    // Calendar events with pillar
    events.filter(e => e.day_offset === 0 && !e.ignored && e.duration_mins && e.pillar_id).forEach(e => {
      map[e.pillar_id] = (map[e.pillar_id] || 0) + e.duration_mins;
    });

    return map;
  }, [tasks, events]);

  // Only show pillars that have time committed today
  const activePillars = pillars
    .filter(p => pillarMinutes[p.id] > 0)
    .sort((a, b) => (pillarMinutes[b.id] || 0) - (pillarMinutes[a.id] || 0));

  const totalMins = Object.values(pillarMinutes).reduce((a, b) => a + b, 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const isOverScheduled = totalMins > MAX_DAILY_HOURS * 60;

  if (activePillars.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-foreground">Today's focus time</p>
        <span className={`text-xs font-mono font-semibold ${isOverScheduled ? 'text-red-400' : 'text-muted-foreground'}`}>
          {totalHours}h {isOverScheduled ? '⚠ over-scheduled' : 'committed'}
        </span>
      </div>
      <div className="space-y-2">
        {activePillars.map(p => {
          const mins = pillarMinutes[p.id] || 0;
          const hours = (mins / 60).toFixed(1);
          const pct = Math.min(100, (mins / (MAX_DAILY_HOURS * 60)) * 100);
          const isHeavy = mins > 3 * 60;
          return (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-sm w-5 shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-muted-foreground truncate">{p.label}</span>
                  <span className={`text-[10px] font-mono shrink-0 ml-2 ${isHeavy ? 'text-amber-400' : 'text-muted-foreground'}`}>{hours}h</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}