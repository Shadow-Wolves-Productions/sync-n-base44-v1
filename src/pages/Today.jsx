import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { useTasks, useTaskMutations, usePillars, useCalendarEvents, useSeedPillars } from '@/lib/useSyncnData';
import { getGreeting, getCurrentPeriod, getPeriodForHour, sortByTime, offsetToDate, recurringOccursOnDate } from '@/lib/syncn';
import PeriodAccordion from '@/components/today/PeriodAccordion';
import ReminderStrip from '@/components/today/ReminderStrip';
import LifeBalanceStrip from '@/components/today/LifeBalanceStrip';
import AddModal from '@/components/modals/AddModal';
import { AlertTriangle } from 'lucide-react';

export default function Today() {
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();
  const { update: updateTask } = useTaskMutations();
  const seedPillars = useSeedPillars();
  const [viewMode, setViewMode] = useState('day');
  const [openPeriod, setOpenPeriod] = useState(getCurrentPeriod());
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // Seed default pillars only if none exist
  useEffect(() => {
    if (pillars && pillars.length === 0) seedPillars();
  }, [pillars?.length]);

  const today = new Date();

  // Build today's items (tasks + events)
  const buildDayItems = (dayOffset) => {
    const date = offsetToDate(dayOffset);
    const items = [];

    // Scheduled tasks
    tasks.filter(t => t.scheduled && t.day_offset === dayOffset && !t.archived).forEach(t => {
      items.push({ ...t, _itemType: 'task', _key: `task-${t.id}` });
    });

    // Recurring tasks for this date
    tasks.filter(t => t.is_recurring && !t.archived && !t.done).forEach(t => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const exception = t.recurring_exceptions?.[dateKey];
      if (exception === 'skip') return;
      if (!recurringOccursOnDate(t, date)) return;
      // Don't duplicate if already scheduled for this day
      if (items.some(i => i.id === t.id)) return;
      const hour = exception?.startHour ?? t.recurring_start_hour ?? 9;
      const min = exception?.startMin ?? t.recurring_start_min ?? 0;
      items.push({ ...t, _itemType: 'task', _key: `rec-task-${t.id}-${dayOffset}`, start_hour: hour, start_min: min });
    });

    // Calendar events
    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      items.push({ ...e, _itemType: 'event', _key: `event-${e.id}` });
    });

    return sortByTime(items);
  };

  const todayItems = buildDayItems(0);

  const getItemsByPeriod = (period, items) => {
    return items.filter(item => {
      const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
      return getPeriodForHour(hour) === period;
    });
  };

  const handleToggleDone = async (item, checked) => {
    await updateTask.mutateAsync({
      id: item.id,
      data: {
        done: checked,
        done_at: checked ? new Date().toISOString() : null,
      }
    });
  };

  const handleItemClick = (item) => {
    if (item._itemType === 'task') {
      setEditItem({ ...item, _type: 'task' });
    } else {
      setEditItem({ ...item, _type: 'meeting' });
    }
    setEditOpen(true);
  };

  // Stats
  const urgentCount = tasks.filter(t => t.priority === 'High' && !t.done && !t.archived && t.status === 'active').length;
  const scheduledToday = tasks.filter(t => t.scheduled && t.day_offset === 0 && !t.archived).length;
  const eventsToday = events.filter(e => e.day_offset === 0 && !e.ignored).length;

  // Unscheduled urgent tasks
  const unscheduledUrgent = tasks.filter(t =>
    t.priority === 'High' && !t.scheduled && !t.done && !t.archived && t.status === 'active'
  );

  return (
    <div className="max-w-[720px] mx-auto px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{format(today, 'EEEE d MMMM')}</h1>
        <p className="text-muted-foreground mt-1">{getGreeting()}, Brendan.</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {urgentCount > 0 && <span className="text-red-400">{urgentCount} urgent</span>}
          <span>{scheduledToday} scheduled today</span>
          <span>{eventsToday} calendar events</span>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setViewMode('day')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            viewMode === 'day' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            viewMode === 'week' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Week
        </button>
      </div>

      {/* Reminders */}
      <ReminderStrip dayOffset={0} />

      {viewMode === 'day' ? (
        <>
          {/* Period Accordions */}
          <div className="space-y-1">
            {['morning', 'afternoon', 'evening'].map(period => (
              <PeriodAccordion
                key={period}
                period={period}
                items={getItemsByPeriod(period, todayItems)}
                pillars={pillars}
                isOpen={openPeriod === period}
                onToggle={() => setOpenPeriod(openPeriod === period ? null : period)}
                onToggleDone={handleToggleDone}
                onItemClick={handleItemClick}
              />
            ))}
          </div>

          {/* Unscheduled urgent */}
          {unscheduledUrgent.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-400">Unscheduled urgent tasks</span>
              </div>
              <div className="space-y-1">
                {unscheduledUrgent.map(t => {
                  const pillar = pillars.find(p => p.id === t.pillar_id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleItemClick({ ...t, _itemType: 'task' })}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-sm flex-1 truncate">{t.title}</span>
                      {pillar && <span className="text-xs text-muted-foreground">{pillar.icon}</span>}
                      {t.duration_mins && <span className="text-xs text-muted-foreground font-mono">{t.duration_mins}m</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Week View */
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(today, i);
            const dayItems = buildDayItems(i);
            const isToday = i === 0;
            return (
              <div key={i} className="rounded-lg bg-card/80 border border-border/50 p-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-sm font-mono ${isToday ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center' : 'text-muted-foreground'}`}>
                    {format(date, 'd')}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{dayItems.length} items</span>
                </div>
                {dayItems.length > 0 ? (
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 6).map(item => {
                      const pillar = pillars.find(p => p.id === item.pillar_id);
                      const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
                      const min = item.start_min ?? item.recurring_start_min ?? 0;
                      return (
                        <div key={item._key} className="flex items-center gap-2 text-xs py-0.5">
                          <span className="font-mono text-muted-foreground w-12">{format(new Date(2000, 0, 1, hour, min), 'h:mma').toLowerCase()}</span>
                          <div className="w-0.5 h-3 rounded-full" style={{ backgroundColor: pillar?.color || '#00b4d8' }} />
                          <span className={`truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                        </div>
                      );
                    })}
                    {dayItems.length > 6 && <p className="text-xs text-muted-foreground">+{dayItems.length - 6} more</p>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Clear</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LifeBalanceStrip />

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}