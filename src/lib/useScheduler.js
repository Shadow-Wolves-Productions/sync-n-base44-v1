import { useTasks, useTaskMutations, useCalendarEvents, useReminders, useUserSettings } from './useSyncnData';
import { getEnergyPeriod, dateToOffset, offsetToDate, recurringOccursOnDate } from './syncn';
import { useToast } from '@/components/ui/use-toast';

export function useScheduler() {
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: reminders } = useReminders();
  const { data: settings } = useUserSettings();
  const { update: updateTask } = useTaskMutations();
  const { toast } = useToast();

  const BUFFER = 10; // minutes buffer between items

  // Check if two time ranges overlap
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
  }

  // Build a mutable in-memory timeline for a day — includes ALL blocking sources
  function buildTimeline(dayOffset) {
    const occupied = [];
    const date = offsetToDate(dayOffset);

    // Calendar events (locked) — with buffer
    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      const startMin = (e.start_hour || 0) * 60 + (e.start_min || 0);
      const duration = e.duration_mins || 60;
      occupied.push({ start: Math.max(0, startMin - BUFFER), end: startMin + duration + BUFFER, label: e.title });
    });

    // One-off blocking reminders
    reminders.filter(r => r.block_time && !r.is_recurring && r.day_offset === dayOffset).forEach(r => {
      const startMin = (r.start_hour || 0) * 60 + (r.start_min || 0);
      occupied.push({ start: startMin, end: startMin + (r.duration_mins || 30) + BUFFER, label: r.title });
    });

    // Recurring blocking reminders
    reminders.filter(r => r.block_time && r.is_recurring && recurringOccursOnDate(r, date)).forEach(r => {
      const startMin = (r.recurring_start_hour || 0) * 60 + (r.recurring_start_min || 0);
      occupied.push({ start: startMin, end: startMin + (r.duration_mins || 30) + BUFFER, label: r.title });
    });

    // Recurring tasks that land on this day (treat as locked blocks)
    tasks.filter(t => t.is_recurring && !t.archived && recurringOccursOnDate(t, date)).forEach(t => {
      const startMin = (t.recurring_start_hour || 9) * 60 + (t.recurring_start_min || 0);
      occupied.push({ start: startMin, end: startMin + (t.duration_mins || 30) + BUFFER, label: t.title });
    });

    // Already-scheduled one-off tasks (not done)
    tasks.filter(t => t.scheduled && !t.is_recurring && t.day_offset === dayOffset && !t.done && !t.archived).forEach(t => {
      const startMin = (t.start_hour || 0) * 60 + (t.start_min || 0);
      occupied.push({ start: startMin, end: startMin + (t.duration_mins || 30) + BUFFER, label: t.title });
    });

    return occupied.sort((a, b) => a.start - b.start);
  }

  // Generate free windows from occupied blocks within working hours
  function getFreeWindows(timeline, dayStartMin, dayEndMin = 20 * 60) {
    const windows = [];
    let cursor = dayStartMin;

    for (const block of timeline) {
      if (block.start > cursor) {
        windows.push({ start: cursor, end: block.start });
      }
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < dayEndMin) {
      windows.push({ start: cursor, end: dayEndMin });
    }
    return windows;
  }

  // Find the first free window that fits durationMins, starting from startFromMin
  function findFreeSlot(durationMins, startFromMin, liveTimeline, dayEndMin = 20 * 60) {
    const windows = getFreeWindows(liveTimeline, startFromMin, dayEndMin);
    for (const w of windows) {
      if (w.end - w.start >= durationMins) {
        return w.start; // fits inside this window
      }
    }
    return null;
  }

  // Validate that a proposed slot has zero conflicts against the live timeline
  function validateSlot(startMin, durationMins, liveTimeline) {
    const endMin = startMin + durationMins;
    return !liveTimeline.some(b => overlaps(startMin, endMin, b.start, b.end));
  }

  function getEnergyLevel(hour) {
    if (!settings?.energy_rhythm) return 'medium';
    const period = getEnergyPeriod(hour);
    return settings.energy_rhythm[period] || 'medium';
  }

  function scoreTask(task) {
    let score = 0;
    if (task.priority === 'High') score += 100;
    else if (task.priority === 'Medium') score += 50;
    else score += 20;

    if (task.deadline) {
      const daysUntil = dateToOffset(new Date(task.deadline));
      if (daysUntil <= 0) score += 200;
      else if (daysUntil <= 2) score += 100;
      else if (daysUntil <= 7) score += 50;
    }

    return score;
  }

  async function runSchedule(action) {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    let targetDays = [];
    let todayStartMin = 6 * 60;

    if (action === 'schedule-remaining') {
      targetDays = [0];
      todayStartMin = currentMinute + 15;
    } else if (action === 'resync') {
      targetDays = [0];
      todayStartMin = currentMinute + 15;
    } else if (action === 'plan-tomorrow') {
      targetDays = [1];
    } else if (action === 'plan-week') {
      targetDays = now.getHours() >= 20 ? [1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6];
      todayStartMin = currentMinute + 15;
    }

    // Get unscheduled active tasks — skip manually scheduled ones entirely
    let unscheduled = tasks.filter(t => !t.scheduled && !t.done && !t.archived && t.status === 'active' && !t.manually_scheduled);

    if (action === 'resync') {
      // Only resync tasks that are NOT manually scheduled
      const todayScheduled = tasks.filter(t => t.scheduled && t.day_offset === 0 && !t.done && !t.archived && !t.manually_scheduled);
      for (const t of todayScheduled) {
        await updateTask.mutateAsync({ id: t.id, data: { scheduled: false, day_offset: null, start_hour: null, start_min: null } });
      }
      unscheduled = [...unscheduled, ...todayScheduled];
    }

    unscheduled.sort((a, b) => scoreTask(b) - scoreTask(a));

    // Live timelines per day — mutated as tasks are placed so no two tasks collide
    const liveTimelines = {};
    for (const day of targetDays) {
      liveTimelines[day] = buildTimeline(day);
    }

    // Per-day minute caps (4h per day max)
    const dayMinutesUsed = {};
    const MAX_PER_DAY = 240;

    let scheduledCount = 0;

    for (const task of unscheduled) {
      const duration = task.duration_mins || 30;
      let placed = false;

      for (const dayOff of targetDays) {
        if (!dayMinutesUsed[dayOff]) dayMinutesUsed[dayOff] = 0;
        if (dayMinutesUsed[dayOff] + duration > MAX_PER_DAY) continue;

        const dayStart = dayOff === 0 ? Math.max(todayStartMin, 6 * 60) : 6 * 60;
        const slot = findFreeSlot(duration, dayStart, liveTimelines[dayOff]);

        if (slot !== null) {
          const hour = Math.floor(slot / 60);
          const min = slot % 60;

          // For high-priority tasks, skip low-energy slots if there are more days
          const energy = getEnergyLevel(hour);
          const hasMoreDays = targetDays.indexOf(dayOff) < targetDays.length - 1;
          if (task.priority === 'High' && energy === 'low' && hasMoreDays) continue;

          // Final validation — must pass before writing to DB
          if (!validateSlot(slot, duration, liveTimelines[dayOff])) continue;

          // Commit: save to DB
          await updateTask.mutateAsync({
            id: task.id,
            data: { scheduled: true, day_offset: dayOff, start_hour: hour, start_min: min }
          });

          // Immediately add to live timeline so the next task can't use this slot
          liveTimelines[dayOff].push({ start: slot, end: slot + duration + BUFFER, label: task.title });
          liveTimelines[dayOff].sort((a, b) => a.start - b.start);

          dayMinutesUsed[dayOff] += duration + BUFFER;
          scheduledCount++;
          placed = true;
          break;
        }
      }
    }

    toast({
      title: scheduledCount > 0 ? `✨ ${scheduledCount} tasks scheduled` : 'No tasks to schedule',
      description: scheduledCount > 0 ? 'Your schedule has been optimized.' : 'All tasks are already scheduled or completed.',
      duration: 3000,
    });
  }

  return { runSchedule, buildTimeline, findFreeSlot, getFreeWindows, validateSlot };
}