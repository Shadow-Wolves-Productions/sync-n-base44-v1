import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { useTasks, useTaskMutations, usePillars, useCalendarEvents, useSeedPillars } from '@/lib/useSyncnData';
import { getGreeting, getCurrentPeriod, getPeriodForHour, sortByTime, offsetToDate, recurringOccursOnDate } from '@/lib/syncn';
import PeriodAccordion from '@/components/today/PeriodAccordion';
import ReminderStrip from '@/components/today/ReminderStrip';
import LifeBalanceStrip from '@/components/today/LifeBalanceStrip';
import TomorrowView from '@/components/today/TomorrowView';
import MiniCalendar from '@/components/today/MiniCalendar';
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
    <div className="px-4 pt-6 max-w-screen-xl mx-auto">
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-[680px]">
          {/* Header */}
          <div className="mb-5">
            <p className="text-xs text-muted-foreground mb-1">{getGreeting()}</p>
            <h1 className="text-2xl font-semibold">{format(today, 'EEEE, MMMM d')}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {urgentCount > 0 && <span className="text-red-400 font-medium">{urgentCount} urgent</span>}
              <span>{scheduledToday} scheduled</span>
              <span>{eventsToday} events</span>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex gap-0.5 mb-5 bg-muted/50 rounded-lg p-0.5 w-fit">
            {['day', 'tomorrow', 'week'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors capitalize font-medium ${
                  viewMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'day' ? 'Today' : mode === 'tomorrow' ? 'Tomorrow' : 'Week'}
              </button>
            ))}
          </div>

          {/* Reminders - only for today */}
          {viewMode === 'day' && <ReminderStrip dayOffset={0} />}

          {viewMode === 'day' && (
            <>
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

              {unscheduledUrgent.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-500">Unscheduled urgent</span>
                  </div>
                  <div className="space-y-0.5">
                    {unscheduledUrgent.map(t => {
                      const pillar = pillars.find(p => p.id === t.pillar_id);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 cursor-pointer"
                          onClick={() => handleItemClick({ ...t, _itemType: 'task' })}
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
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
          )}

          {viewMode === 'tomorrow' && (
            <TomorrowView onItemClick={handleItemClick} />
          )}

          {viewMode === 'week' && (
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(today, i);
                const dayItems = buildDayItems(i);
                const isTodayRow = i === 0;
                return (
                  <div key={i} className={`rounded-xl border p-3.5 transition-colors ${isTodayRow ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card/60'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isTodayRow ? 'text-primary' : 'text-foreground'}`}>
                          {format(date, 'EEE')}
                        </span>
                        <span className={`text-sm font-mono ${isTodayRow ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs' : 'text-muted-foreground'}`}>
                          {format(date, 'd')}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {dayItems.length > 0 ? `${dayItems.length} items` : 'Clear'}
                      </span>
                    </div>
                    {dayItems.length > 0 && (
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 5).map(item => {
                          const pillar = pillars.find(p => p.id === item.pillar_id);
                          const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
                          const min = item.start_min ?? item.recurring_start_min ?? 0;
                          return (
                            <div key={item._key} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer hover:text-foreground"
                              onClick={() => handleItemClick(item)}>
                              <span className="font-mono text-muted-foreground w-12">{format(new Date(2000, 0, 1, hour, min), 'h:mma').toLowerCase()}</span>
                              <div className="w-0.5 h-3 rounded-full" style={{ backgroundColor: pillar?.color || '#00b4d8' }} />
                              <span className={`truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                            </div>
                          );
                        })}
                        {dayItems.length > 5 && <p className="text-xs text-muted-foreground pl-14">+{dayItems.length - 5} more</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <LifeBalanceStrip />
          </div>
        </div>

        {/* Right: Mini Calendar — always visible on day/tomorrow views, hidden on week */}
        <div className="hidden lg:block pt-1">
          <MiniCalendar />
        </div>
      </div>

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}