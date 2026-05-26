import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReminders, useReminderMutations } from '@/lib/useSyncnData';
import { formatTime, recurringOccursOnDate, offsetToDate } from '@/lib/syncn';
import { format } from 'date-fns';

export default function ReminderStrip({ dayOffset = 0 }) {
  const { data: reminders } = useReminders();
  const { update, remove } = useReminderMutations();
  const targetDate = offsetToDate(dayOffset);
  const dateKey = format(targetDate, 'yyyy-MM-dd');

  const todayReminders = reminders.filter(r => {
    if (r.is_recurring) {
      if ((r.done_dates || []).includes(dateKey)) return false;
      return recurringOccursOnDate(r, targetDate);
    }
    return r.day_offset === dayOffset;
  });

  if (todayReminders.length === 0) return null;

  const handleDismiss = async (r) => {
    if (r.is_recurring) {
      await update.mutateAsync({
        id: r.id,
        data: { done_dates: [...(r.done_dates || []), dateKey] }
      });
    } else {
      await remove.mutateAsync(r.id);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Reminders</span>
      </div>
      <div className="space-y-1.5">
        {todayReminders.map(r => {
          const hour = r.is_recurring ? r.recurring_start_hour : r.start_hour;
          const min = r.is_recurring ? r.recurring_start_min : r.start_min;
          return (
            <div key={r.id} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-16">
                {formatTime(hour || 0, min || 0)}
              </span>
              <span className="flex-1 truncate">{r.title}</span>
              {r.notes && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{r.notes}</span>}
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDismiss(r)}>
                {r.is_recurring ? 'Done' : 'Dismiss'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}