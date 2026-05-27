import React from 'react';
import { format, addDays } from 'date-fns';
import { useTasks, usePillars, useCalendarEvents } from '@/lib/useSyncnData';
import { sortByTime, recurringOccursOnDate, offsetToDate } from '@/lib/syncn';
import { Circle, Calendar } from 'lucide-react';

export default function TomorrowView({ onItemClick }) {
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();

  const tomorrow = addDays(new Date(), 1);

  const buildItems = () => {
    const dayOffset = 1;
    const date = offsetToDate(dayOffset);
    const items = [];

    tasks.filter(t => t.scheduled && t.day_offset === dayOffset && !t.archived).forEach(t => {
      items.push({ ...t, _itemType: 'task', _key: `task-${t.id}` });
    });

    tasks.filter(t => t.is_recurring && !t.archived && !t.done).forEach(t => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const exception = t.recurring_exceptions?.[dateKey];
      if (exception === 'skip') return;
      if (!recurringOccursOnDate(t, date)) return;
      if (items.some(i => i.id === t.id)) return;
      const hour = exception?.startHour ?? t.recurring_start_hour ?? 9;
      const min = exception?.startMin ?? t.recurring_start_min ?? 0;
      items.push({ ...t, _itemType: 'task', _key: `rec-task-${t.id}-1`, start_hour: hour, start_min: min });
    });

    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      items.push({ ...e, _itemType: 'event', _key: `event-${e.id}` });
    });

    return sortByTime(items);
  };

  const items = buildItems();
  const unscheduledTasks = tasks.filter(t => !t.scheduled && !t.is_recurring && !t.done && !t.archived && t.status === 'upcoming');

  return (
    <div className="space-y-6">
      {/* Scheduled tomorrow */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {format(tomorrow, 'EEEE d MMMM')}
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled yet</p>
        ) : (
          <div className="space-y-1">
            {items.map(item => {
              const pillar = pillars.find(p => p.id === item.pillar_id);
              const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
              const min = item.start_min ?? item.recurring_start_min ?? 0;
              const timeStr = format(new Date(2000, 0, 1, hour, min), 'h:mm a');
              const isEvent = item._itemType === 'event';
              return (
                <div
                  key={item._key}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => onItemClick?.(item)}
                >
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{timeStr}</span>
                  <div
                    className="w-0.5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: pillar?.color || (isEvent ? '#00b4d8' : '#94a3b8') }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.title}</p>
                    {pillar && <p className="text-xs text-muted-foreground">{pillar.icon} {pillar.label}</p>}
                  </div>
                  {item.duration_mins && (
                    <span className="text-xs text-muted-foreground font-mono">{item.duration_mins}m</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming tasks */}
      {unscheduledTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Upcoming Tasks
          </h3>
          <div className="space-y-1">
            {unscheduledTasks.slice(0, 8).map(t => {
              const pillar = pillars.find(p => p.id === t.pillar_id);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => onItemClick?.({ ...t, _itemType: 'task' })}
                >
                  <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{t.title}</span>
                  {pillar && <span className="text-xs text-muted-foreground">{pillar.icon}</span>}
                  {t.duration_mins && <span className="text-xs text-muted-foreground font-mono">{t.duration_mins}m</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}