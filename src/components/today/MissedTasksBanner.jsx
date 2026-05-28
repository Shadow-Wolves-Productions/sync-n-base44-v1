import React from 'react';
import { AlertCircle, RotateCcw, Check, SkipForward, CalendarArrowUp } from 'lucide-react';
import { useScheduler } from '@/lib/useScheduler';
import { useTasks } from '@/lib/useSyncnData';

export default function MissedTasksBanner({ pillars, onItemClick }) {
  const { data: tasks } = useTasks();
  const { handleMissedTask } = useScheduler();

  const missedTasks = tasks.filter(t =>
    t.status === 'missed' &&
    !t.done &&
    !t.archived
  );

  if (missedTasks.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/15">
        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">
          Needs Reschedule · {missedTasks.length}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-red-500/10">
        {missedTasks.map(task => {
          const pillar = pillars?.find(p => p.id === task.pillar_id);
          const missedTime = task.start_hour != null
            ? `Missed ${task.start_hour % 12 || 12}:${String(task.start_min || 0).padStart(2, '0')}${task.start_hour >= 12 ? 'pm' : 'am'} slot`
            : 'Missed scheduled slot';

          return (
            <div key={task.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Dot */}
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: pillar?.color || '#ef4444' }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    className="text-sm font-medium text-left hover:text-primary transition-colors truncate w-full"
                    onClick={() => onItemClick?.({ ...task, _itemType: 'task' })}
                  >
                    {task.title}
                  </button>
                  <p className="text-xs text-red-400/70 mt-0.5">{missedTime}</p>
                  {pillar && (
                    <p className="text-xs text-muted-foreground mt-0.5">{pillar.icon} {pillar.label}</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 mt-2.5 ml-5">
                <ActionBtn
                  icon={<RotateCcw className="w-3 h-3" />}
                  label="Reschedule"
                  onClick={() => handleMissedTask(task.id, 'reschedule')}
                  variant="primary"
                />
                <ActionBtn
                  icon={<Check className="w-3 h-3" />}
                  label="Done"
                  onClick={() => handleMissedTask(task.id, 'done')}
                  variant="success"
                />
                <ActionBtn
                  icon={<CalendarArrowUp className="w-3 h-3" />}
                  label="Tomorrow"
                  onClick={() => handleMissedTask(task.id, 'tomorrow')}
                  variant="neutral"
                />
                <ActionBtn
                  icon={<SkipForward className="w-3 h-3" />}
                  label="Skip"
                  onClick={() => handleMissedTask(task.id, 'skip')}
                  variant="ghost"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, variant }) {
  const styles = {
    primary: 'bg-primary/15 text-primary hover:bg-primary/25',
    success: 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25',
    neutral: 'bg-muted/60 text-muted-foreground hover:bg-muted',
    ghost:   'text-muted-foreground hover:text-foreground hover:bg-muted/60',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${styles[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}