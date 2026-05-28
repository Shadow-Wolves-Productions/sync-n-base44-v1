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
  const DAY_START = 6 * 60;   // 6:00am
  const DAY_END   = 20 * 60;  // 8:00pm
  const MAX_PER_DAY = 240;    // 4h cap per day

  // ─── Overlap helpers ────────────────────────────────────────────────────────
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
  }

  // ─── Timeline builder ────────────────────────────────────────────────────────
  // Returns a mutable array of { start, end, label, locked } blocks for a day.
  // `excludeTaskIds` — task IDs whose blocks should be removed (flexible re-slots).
  function buildTimeline(dayOffset, excludeTaskIds = []) {
    const occupied = [];
    const date = offsetToDate(dayOffset);
    const excSet = new Set(excludeTaskIds);

    // Calendar events — always locked
    events.filter(e => e.day_offset === dayOffset && !e.ignored).forEach(e => {
      const startMin = (e.start_hour || 0) * 60 + (e.start_min || 0);
      const duration = e.duration_mins || 60;
      occupied.push({ start: startMin - BUFFER, end: startMin + duration + BUFFER, label: e.title, locked: true });
    });

    // One-off blocking reminders
    reminders.filter(r => r.block_time && !r.is_recurring && r.day_offset === dayOffset).forEach(r => {
      const startMin = (r.start_hour || 0) * 60 + (r.start_min || 0);
      occupied.push({ start: startMin, end: startMin + (r.duration_mins || 30) + BUFFER, label: r.title, locked: true });
    });

    // Recurring blocking reminders
    reminders.filter(r => r.block_time && r.is_recurring && recurringOccursOnDate(r, date)).forEach(r => {
      const startMin = (r.recurring_start_hour || 0) * 60 + (r.recurring_start_min || 0);
      occupied.push({ start: startMin, end: startMin + (r.duration_mins || 30) + BUFFER, label: r.title, locked: true });
    });

    // Recurring tasks (treat as locked)
    tasks.filter(t => t.is_recurring && !t.archived && recurringOccursOnDate(t, date)).forEach(t => {
      const startMin = (t.recurring_start_hour || 9) * 60 + (t.recurring_start_min || 0);
      occupied.push({ start: startMin, end: startMin + (t.duration_mins || 30) + BUFFER, label: t.title, locked: true });
    });

    // Scheduled tasks — skip excluded (flexible) ones, skip completed/archived
    tasks.filter(t =>
      t.scheduled && !t.is_recurring &&
      t.day_offset === dayOffset &&
      !t.done && t.status !== 'completed' &&
      !t.archived &&
      !excSet.has(t.id)
    ).forEach(t => {
      const startMin = (t.start_hour || 0) * 60 + (t.start_min || 0);
      const locked = !!(t.manually_scheduled);
      occupied.push({ start: startMin, end: startMin + (t.duration_mins || 30) + BUFFER, label: t.title, locked });
    });

    return occupied.sort((a, b) => a.start - b.start);
  }

  // ─── Slot helpers ────────────────────────────────────────────────────────────
  function getFreeWindows(timeline, startMin, endMin = DAY_END) {
    const windows = [];
    let cursor = Math.max(startMin, DAY_START);
    for (const block of timeline) {
      if (block.start > cursor) windows.push({ start: cursor, end: block.start });
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < endMin) windows.push({ start: cursor, end: endMin });
    return windows;
  }

  function findFreeSlot(durationMins, startFromMin, liveTimeline, endMin = DAY_END) {
    const windows = getFreeWindows(liveTimeline, startFromMin, endMin);
    for (const w of windows) {
      if (w.end - w.start >= durationMins) return w.start;
    }
    return null;
  }

  function validateSlot(startMin, durationMins, liveTimeline) {
    const endMin = startMin + durationMins;
    return !liveTimeline.some(b => overlaps(startMin, endMin, b.start, b.end));
  }

  // ─── Scoring ─────────────────────────────────────────────────────────────────
  function getEnergyLevel(hour) {
    if (!settings?.energy_rhythm) return 'medium';
    return settings.energy_rhythm[getEnergyPeriod(hour)] || 'medium';
  }

  function scoreTask(task) {
    let score = 0;
    if (task.status === 'missed') score += 300;           // missed tasks come first
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

  // ─── Missed Task Detection ────────────────────────────────────────────────────
  // Call this on an interval or on page focus to detect tasks whose window has passed.
  async function checkMissedTasks() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const candidates = tasks.filter(t =>
      t.scheduled &&
      t.day_offset === 0 &&          // today only
      !t.archived &&
      !t.done &&
      t.status !== 'completed' &&
      t.status !== 'missed' &&
      t.status !== 'skipped'
    );

    for (const t of candidates) {
      const startMin = (t.start_hour || 0) * 60 + (t.start_min || 0);
      const endMin = startMin + (t.duration_mins || 30);
      if (nowMin > endMin) {
        // Task window has passed — mark missed, do NOT mark done
        await updateTask.mutateAsync({
          id: t.id,
          data: {
            status: 'missed',
            missed_at: new Date().toISOString(),
          }
        });
      }
    }
  }

  // ─── Handle a single missed task ──────────────────────────────────────────────
  // Clears its old slot then runs rollingReschedule.
  async function handleMissedTask(taskId, action = 'reschedule') {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (action === 'done') {
      await updateTask.mutateAsync({
        id: taskId,
        data: { done: true, done_at: new Date().toISOString(), status: 'completed', scheduled: false }
      });
      toast({ title: '✅ Marked done', duration: 2000 });
      return;
    }

    if (action === 'skip') {
      await updateTask.mutateAsync({
        id: taskId,
        data: { status: 'skipped', scheduled: false, day_offset: null, start_hour: null, start_min: null }
      });
      toast({ title: '⏭ Skipped', duration: 2000 });
      return;
    }

    if (action === 'tomorrow') {
      // Place at first available tomorrow slot
      const tomorrowTimeline = buildTimeline(1);
      const slot = findFreeSlot(task.duration_mins || 30, DAY_START, tomorrowTimeline);
      if (slot !== null) {
        await updateTask.mutateAsync({
          id: taskId,
          data: {
            status: 'scheduled',
            day_offset: 1,
            start_hour: Math.floor(slot / 60),
            start_min: slot % 60,
            scheduled: true,
            missed_at: null,
          }
        });
        toast({ title: '📅 Moved to tomorrow', duration: 2000 });
      } else {
        toast({ title: 'No room tomorrow — left unscheduled', duration: 3000 });
        await updateTask.mutateAsync({
          id: taskId,
          data: { status: 'active', scheduled: false, day_offset: null, start_hour: null, start_min: null, missed_at: null }
        });
      }
      return;
    }

    // action === 'reschedule': clear old slot and run rolling reschedule
    await updateTask.mutateAsync({
      id: taskId,
      data: {
        status: 'missed',
        scheduled: false,
        day_offset: null,
        start_hour: null,
        start_min: null,
      }
    });

    await rollingReschedule();
  }

  // ─── Rolling Reschedule ───────────────────────────────────────────────────────
  // Reschedules all missed + flexible tasks from now onward without touching
  // locked events, completed tasks, or manually pinned tasks.
  async function rollingReschedule() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startFromMin = nowMin + 5;

    // Flexible today tasks = scheduled today, not done, not completed, not manually pinned, not recurring
    const flexibleToday = tasks.filter(t =>
      t.scheduled &&
      !t.is_recurring &&
      t.day_offset === 0 &&
      !t.done &&
      t.status !== 'completed' &&
      t.status !== 'skipped' &&
      !t.manually_scheduled &&
      !t.archived
    );

    // Missed tasks (may already be unscheduled after handleMissedTask)
    const missedTasks = tasks.filter(t =>
      t.status === 'missed' &&
      !t.done &&
      !t.archived
    );

    // Unscheduled active tasks
    const unscheduledActive = tasks.filter(t =>
      !t.scheduled &&
      !t.done &&
      !t.archived &&
      t.status === 'active' &&
      !t.manually_scheduled &&
      !t.is_recurring
    );

    // Build timeline excluding flexible today tasks so we can re-slot them
    const flexibleIds = flexibleToday.map(t => t.id);
    const liveTimeline = buildTimeline(0, flexibleIds);

    // Build queue: missed first, then flexible, then unscheduled — all sorted by score
    const queue = [
      ...missedTasks,
      ...flexibleToday,
      ...unscheduledActive,
    ].sort((a, b) => scoreTask(b) - scoreTask(a));

    // Deduplicate
    const seen = new Set();
    const dedupedQueue = queue.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    // Clear flexible today tasks from their slots first
    for (const t of flexibleToday) {
      await updateTask.mutateAsync({
        id: t.id,
        data: { scheduled: false, day_offset: null, start_hour: null, start_min: null, status: 'active' }
      });
    }

    let scheduledCount = 0;
    let pushedTomorrow = 0;

    // Build tomorrow's timeline once, outside the loop, so it stays updated
    const tomorrowTimeline = buildTimeline(1);

    for (const task of dedupedQueue) {
      const duration = task.duration_mins || 30;

      // Try today first (from nowMin onward)
      const slotToday = findFreeSlot(duration, startFromMin, liveTimeline);

      if (slotToday !== null && validateSlot(slotToday, duration, liveTimeline)) {
        await updateTask.mutateAsync({
          id: task.id,
          data: {
            scheduled: true,
            status: 'scheduled',
            day_offset: 0,
            start_hour: Math.floor(slotToday / 60),
            start_min: slotToday % 60,
            missed_at: null,
          }
        });
        liveTimeline.push({ start: slotToday, end: slotToday + duration + BUFFER, label: task.title, locked: false });
        liveTimeline.sort((a, b) => a.start - b.start);
        scheduledCount++;
      } else {
        // Try tomorrow (reuse the single shared tomorrow timeline)
        const slotTomorrow = findFreeSlot(duration, DAY_START, tomorrowTimeline);

        if (slotTomorrow !== null) {
          await updateTask.mutateAsync({
            id: task.id,
            data: {
              scheduled: true,
              status: 'scheduled',
              day_offset: 1,
              start_hour: Math.floor(slotTomorrow / 60),
              start_min: slotTomorrow % 60,
              missed_at: null,
            }
          });
          // Update tomorrow's timeline so the next task sees the occupied slot
          tomorrowTimeline.push({ start: slotTomorrow, end: slotTomorrow + duration + BUFFER, label: task.title, locked: false });
          tomorrowTimeline.sort((a, b) => a.start - b.start);
          pushedTomorrow++;
        } else {
          // Leave unscheduled
          await updateTask.mutateAsync({
            id: task.id,
            data: { scheduled: false, status: 'active', day_offset: null, start_hour: null, start_min: null }
          });
        }
      }
    }

    const parts = [];
    if (scheduledCount > 0) parts.push(`${scheduledCount} rescheduled today`);
    if (pushedTomorrow > 0) parts.push(`${pushedTomorrow} moved to tomorrow`);

    toast({
      title: parts.length > 0 ? `🔄 ${parts.join(', ')}` : 'Schedule is up to date',
      description: 'Missed tasks have been handled. Fixed events untouched.',
      duration: 3500,
    });
  }

  // ─── Original runSchedule ─────────────────────────────────────────────────────
  async function runSchedule(action) {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    let targetDays = [];
    let todayStartMin = DAY_START;

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

    // Get unscheduled active tasks — skip manually scheduled and missed ones
    let unscheduled = tasks.filter(t =>
      !t.scheduled && !t.done && !t.archived &&
      (t.status === 'active' || t.status === 'missed') &&
      !t.manually_scheduled && !t.is_recurring
    );

    if (action === 'resync') {
      const todayScheduled = tasks.filter(t =>
        t.scheduled && t.day_offset === 0 && !t.done &&
        !t.archived && !t.manually_scheduled && t.status !== 'completed'
      );
      for (const t of todayScheduled) {
        await updateTask.mutateAsync({ id: t.id, data: { scheduled: false, day_offset: null, start_hour: null, start_min: null, status: 'active' } });
      }
      unscheduled = [...unscheduled, ...todayScheduled];
    }

    unscheduled.sort((a, b) => scoreTask(b) - scoreTask(a));

    const liveTimelines = {};
    for (const day of targetDays) {
      liveTimelines[day] = buildTimeline(day);
    }

    const dayMinutesUsed = {};
    let scheduledCount = 0;

    for (const task of unscheduled) {
      const duration = task.duration_mins || 30;
      let placed = false;

      for (const dayOff of targetDays) {
        if (!dayMinutesUsed[dayOff]) dayMinutesUsed[dayOff] = 0;
        if (dayMinutesUsed[dayOff] + duration > MAX_PER_DAY) continue;

        const dayStart = dayOff === 0 ? Math.max(todayStartMin, DAY_START) : DAY_START;
        const slot = findFreeSlot(duration, dayStart, liveTimelines[dayOff]);

        if (slot !== null) {
          const hour = Math.floor(slot / 60);
          const energy = getEnergyLevel(hour);
          const hasMoreDays = targetDays.indexOf(dayOff) < targetDays.length - 1;
          if (task.priority === 'High' && energy === 'low' && hasMoreDays) continue;

          if (!validateSlot(slot, duration, liveTimelines[dayOff])) continue;

          await updateTask.mutateAsync({
            id: task.id,
            data: {
              scheduled: true,
              status: 'scheduled',
              day_offset: dayOff,
              start_hour: hour,
              start_min: slot % 60,
              missed_at: null,
            }
          });

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

  return {
    runSchedule,
    rollingReschedule,
    handleMissedTask,
    checkMissedTasks,
    buildTimeline,
    findFreeSlot,
    getFreeWindows,
    validateSlot,
  };
}