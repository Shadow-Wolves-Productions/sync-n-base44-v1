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

  // Build minute-accurate timeline for a given day_offset
  function buildTimeline(dayOffset) {
    const occupied = [];

    // Calendar events with 15min buffers before & after
    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      const startMin = (e.start_hour || 0) * 60 + (e.start_min || 0);
      const duration = e.duration_mins || 60;
      occupied.push({ start: startMin - 15, end: startMin + duration + 15, type: 'event' });
    });

    // Reminders with block_time
    reminders.filter(r => r.block_time && r.day_offset === dayOffset).forEach(r => {
      const startMin = (r.start_hour || 0) * 60 + (r.start_min || 0);
      const duration = r.duration_mins || 30;
      occupied.push({ start: startMin, end: startMin + duration + 15, type: 'reminder' });
    });

    // Already scheduled tasks with 15min buffer after
    tasks.filter(t => t.scheduled && t.day_offset === dayOffset && !t.done && !t.archived).forEach(t => {
      const startMin = (t.start_hour || 0) * 60 + (t.start_min || 0);
      const duration = t.duration_mins || 30;
      occupied.push({ start: startMin, end: startMin + duration + 15, type: 'task' });
    });

    return occupied.sort((a, b) => a.start - b.start);
  }

  // Find next free slot of given duration on a day
  function findFreeSlot(dayOffset, durationMins, startFromMin = 0, timeline = null) {
    const tl = timeline || buildTimeline(dayOffset);
    const endOfDay = 20 * 60; // 8pm

    for (let candidate = startFromMin; candidate + durationMins <= endOfDay; candidate += 15) {
      const candidateEnd = candidate + durationMins;
      const conflict = tl.some(slot => candidate < slot.end && candidateEnd > slot.start);
      if (!conflict) return candidate;
    }
    return null; // no slot
  }

  // Get energy level for a time
  function getEnergyLevel(hour) {
    if (!settings?.energy_rhythm) return 'medium';
    const period = getEnergyPeriod(hour);
    return settings.energy_rhythm[period] || 'medium';
  }

  // Score a task for scheduling priority
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

  // Main scheduling function
  async function runSchedule(action) {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    
    let targetDays = [];
    let startMin = 6 * 60; // 6am default

    if (action === 'schedule-remaining') {
      targetDays = [0];
      startMin = currentMinute + 15;
    } else if (action === 'resync') {
      targetDays = [0];
      startMin = currentMinute + 15;
    } else if (action === 'plan-tomorrow') {
      targetDays = [1];
    } else if (action === 'plan-week') {
      targetDays = [0, 1, 2, 3, 4, 5, 6];
      if (now.getHours() >= 20) targetDays = [1, 2, 3, 4, 5, 6, 7];
    }

    // Get unscheduled active tasks
    let unscheduled = tasks.filter(t => 
      !t.scheduled && !t.done && !t.archived && t.status === 'active'
    );

    if (action === 'resync') {
      // Also include scheduled-but-not-done tasks for today
      const todayScheduled = tasks.filter(t => 
        t.scheduled && t.day_offset === 0 && !t.done && !t.archived
      );
      // Unschedule them first
      for (const t of todayScheduled) {
        await updateTask.mutateAsync({ id: t.id, data: { scheduled: false, day_offset: null, start_hour: null, start_min: null } });
      }
      unscheduled = [...unscheduled, ...todayScheduled];
    }

    // Sort by score
    unscheduled.sort((a, b) => scoreTask(b) - scoreTask(a));

    // Cap at 4 hours per day
    const dayMinutesUsed = {};
    const MAX_PER_DAY = 240;

    let scheduledCount = 0;

    for (const task of unscheduled) {
      const duration = task.duration_mins || 30;
      let placed = false;

      for (const dayOff of targetDays) {
        if (!dayMinutesUsed[dayOff]) dayMinutesUsed[dayOff] = 0;
        if (dayMinutesUsed[dayOff] + duration > MAX_PER_DAY) continue;

        const dayStart = dayOff === 0 ? Math.max(startMin, 6 * 60) : 6 * 60;
        const timeline = buildTimeline(dayOff);
        const slot = findFreeSlot(dayOff, duration, dayStart, timeline);

        if (slot !== null) {
          const hour = Math.floor(slot / 60);
          const min = slot % 60;

          // Energy matching: prefer placing high-priority in peak energy
          const energy = getEnergyLevel(hour);
          if (task.priority === 'High' && (energy === 'low') && dayOff < 6) {
            // Try next day for better energy match
            continue;
          }

          await updateTask.mutateAsync({
            id: task.id,
            data: { scheduled: true, day_offset: dayOff, start_hour: hour, start_min: min }
          });
          dayMinutesUsed[dayOff] += duration + 15;
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