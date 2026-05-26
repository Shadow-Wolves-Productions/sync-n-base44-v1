import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_PILLARS, DEFAULT_ENERGY } from './syncn';

// Pillars
export function usePillars() {
  return useQuery({
    queryKey: ['pillars'],
    queryFn: () => base44.entities.Pillar.list('order'),
    initialData: [],
  });
}

export function usePillarMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['pillars'] });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Pillar.create(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pillar.update(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Pillar.delete(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// Tasks
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
    initialData: [],
  });
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: invalidate,
  });
  const bulkCreate = useMutation({
    mutationFn: (items) => base44.entities.Task.bulkCreate(items),
    onSuccess: invalidate,
  });

  return { create, update, remove, bulkCreate };
}

// Calendar Events
export function useCalendarEvents() {
  return useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-created_date', 500),
    initialData: [],
  });
}

export function useCalendarEventMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['calendarEvents'] });

  const create = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// Reminders
export function useReminders() {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.list('-created_date', 200),
    initialData: [],
  });
}

export function useReminderMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['reminders'] });

  const create = useMutation({
    mutationFn: (data) => base44.entities.Reminder.create(data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reminder.update(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Reminder.delete(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// User Settings
export function useUserSettings() {
  return useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const list = await base44.entities.UserSettings.list();
      if (list.length === 0) {
        const created = await base44.entities.UserSettings.create({
          theme: 'dark',
          energy_rhythm: DEFAULT_ENERGY,
          compass_memory: { stated_priorities: [], last_week_review: '', last_updated: '' },
          onboarding_complete: false,
        });
        return created;
      }
      return list[0];
    },
  });
}

export function useSettingsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['userSettings'] });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserSettings.update(id, data),
    onSuccess: invalidate,
  });

  return { update };
}

// Seed default pillars if none exist — guarded by a flag to prevent duplicate seeding
let _seeding = false;
export function useSeedPillars() {
  const { data: pillars } = usePillars();
  const { create } = usePillarMutations();

  const seed = async () => {
    if (_seeding) return;
    if (pillars && pillars.length === 0) {
      _seeding = true;
      for (const p of DEFAULT_PILLARS) {
        await create.mutateAsync(p);
      }
    }
  };

  return seed;
}