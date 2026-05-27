import React, { useState } from 'react';
import { useTasks, useTaskMutations, usePillars } from '@/lib/useSyncnData';
import { recurringOccursOnDate } from '@/lib/syncn';
import { Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Pre-defined quick-add templates
const QUICK_TEMPLATES = [
  { label: 'Morning Routine', icon: '🌅', duration_mins: 60, start_hour: 6, start_min: 0, priority: 'High', status: 'active' },
  { label: 'Deep Work Block', icon: '🧠', duration_mins: 120, start_hour: 9, start_min: 0, priority: 'High', status: 'active' },
  { label: 'Lunch Break', icon: '🥗', duration_mins: 45, start_hour: 12, start_min: 30, priority: 'Low', status: 'active' },
  { label: 'Work Block', icon: '💼', duration_mins: 90, start_hour: 14, start_min: 0, priority: 'Medium', status: 'active' },
  { label: 'Exercise', icon: '🏋️', duration_mins: 60, start_hour: 17, start_min: 0, priority: 'Medium', status: 'active' },
  { label: 'Evening Wind-down', icon: '🌙', duration_mins: 30, start_hour: 21, start_min: 0, priority: 'Low', status: 'active' },
];

export default function QuickAddBar() {
  const { data: tasks } = useTasks();
  const { create: createTask } = useTaskMutations();
  const { data: pillars } = usePillars();
  const [adding, setAdding] = useState(null);

  // Check if a template is already scheduled today (by matching title)
  const isAlreadyToday = (label) =>
    tasks.some(t => t.title === label && t.scheduled && t.day_offset === 0 && !t.archived);

  const handleQuickAdd = async (template) => {
    if (isAlreadyToday(template.label)) {
      toast.info(`${template.label} is already on today's schedule`);
      return;
    }
    setAdding(template.label);
    try {
      await createTask.mutateAsync({
        title: template.label,
        duration_mins: template.duration_mins,
        priority: template.priority,
        status: template.status,
        scheduled: true,
        day_offset: 0,
        start_hour: template.start_hour,
        start_min: template.start_min,
        manually_scheduled: true,
      });
      toast.success(`${template.icon} ${template.label} added to today`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3 h-3 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Quick add</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_TEMPLATES.map(t => {
          const done = isAlreadyToday(t.label);
          const loading = adding === t.label;
          return (
            <button
              key={t.label}
              onClick={() => handleQuickAdd(t)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 ${
                done
                  ? 'border-primary/30 bg-primary/10 text-primary cursor-default'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50 active:scale-95'
              }`}
            >
              <span>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              <span className="font-mono text-[10px] opacity-60">{t.duration_mins}m</span>
              {done ? (
                <span className="text-[10px] text-primary">✓</span>
              ) : (
                <Plus className="w-3 h-3 opacity-50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}