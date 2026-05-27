import { useTasks, useTaskMutations, useCalendarEvents, useReminders, useUserSettings } from './useSyncnData';
import { getEnergyPeriod, dateToOffset } from './syncn';
import { useToast } from '@/components/ui/use-toast';

export function useScheduler() {
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: reminders } = useReminders();
  const { data: settings } = useUserSettings();
  const { update: updateTask } = useTaskMutations();
  const { toast } = useToast();

  // Build a mutable in-memory timeline for a day (used during a scheduling run)
  function buildTimeline(dayOffset) {
    const occupied = [];

    // Calendar events — 10min buffer each side
    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      const startMin = (e.start_hour || 0) * 60 + (e.start_min || 0);
      const duration = e.duration_mins || 60;
      occupied.push({ start: Math.max(0, startMin - 10), end: startMin + duration + 10 });
    });

    // Blocking reminders
    reminders.filter(r => r.block_time && r.day_offset === dayOffset).forEach(r => {
      const startMin = (r.start_hour || 0) * 60 + (r.start_min || 0);
      occupied.push({ start: startMin, end: startMin + (r.duration_mins || 30) + 10 });
    });

    // Already-scheduled tasks (not done)
    tasks.filter(t => t.scheduled && t.day_offset === dayOffset && !t.done && !t.archived).forEach(t => {
      const startMin = (t.start_hour || 0) * 60 + (t.start_min || 0);
      occupied.push({ start: startMin, end: startMin + (t.duration_mins || 30) + 10 });
    });

    return occupied.sort((a, b) => a.start - b.start);
  }

  // Find next free slot — uses a live array so newly placed tasks block future ones
  function findFreeSlot(durationMins, startFromMin, liveTimeline) {
    const endOfDay = 20 * 60; // 8pm hard stop

    for (let candidate = startFromMin; candidate + durationMins <= endOfDay; candidate += 15) {
      const candidateEnd = candidate + durationMins;
      const conflict = liveTimeline.some(slot => candidate < slot.end && candidateEnd > slot.start);
      if (!conflict) return candidate;
    }
    return null;
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

    // Get unscheduled active tasks
    let unscheduled = tasks.filter(t => !t.scheduled && !t.done && !t.archived && t.status === 'active');

    if (action === 'resync') {
      const todayScheduled = tasks.filter(t => t.scheduled && t.day_offset === 0 && !t.done && !t.archived);
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

          // Commit: save to DB
          await updateTask.mutateAsync({
            id: task.id,
            data: { scheduled: true, day_offset: dayOff, start_hour: hour, start_min: min }
          });

          // Immediately add to live timeline so the next task can't use this slot
          liveTimelines[dayOff].push({ start: slot, end: slot + duration + 10 });
          liveTimelines[dayOff].sort((a, b) => a.start - b.start);

          dayMinutesUsed[dayOff] += duration + 10;
          scheduledCount++;
          placed = true;
          break;
        }
      }
    }

    toast({
      title: scheduledCount > 0 ? `✨ ${scheduledCount} tasks scheduled` : 'No tasks to schedule',
      description: scheduledCount > 0 ? 'Your schedule has been optimized.' : 'All tasks are already scheduled or completed.',
    });
  }

  return { runSchedule, buildTimeline, findFreeSlot };
}