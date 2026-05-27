import React from 'react';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Pencil } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ProjectCard({ name, tasks, pillarColor, onClick, onRename }) {
  const active = tasks.filter(t => !t.done && t.status === 'active').length;
  const scheduled = tasks.filter(t => t.scheduled && !t.done).length;
  const urgent = tasks.filter(t => t.priority === 'High' && !t.done && t.status === 'active').length;
  const total = tasks.filter(t => !t.archived).length;
  const done = tasks.filter(t => t.done).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  // Last touched
  const lastTask = tasks
    .filter(t => t.updated_date)
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];

  const lastTouched = lastTask
    ? (() => {
        const d = new Date(lastTask.updated_date);
        const today = new Date();
        const diff = Math.floor((today - d) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        return `${diff}d ago`;
      })()
    : null;

  // Next task
  const nextTask = tasks.filter(t => !t.done && t.status === 'active')[0];

  return (
    <div
      onClick={onClick}
      className="relative group rounded-2xl border border-border/40 bg-card hover:border-border/70 hover:shadow-sm transition-all duration-150 cursor-pointer p-4"
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-60" style={{ backgroundColor: pillarColor }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: pillarColor }} />
          <h3 className="text-sm font-semibold truncate">{name}</h3>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="w-3 h-3 mr-2" /> Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1 mb-3">
        {active === 0 ? (
          <p className="text-xs text-muted-foreground/60">Quiet this week</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{active}</span> active task{active !== 1 ? 's' : ''}
            {urgent > 0 && <span className="text-red-400 ml-1.5">· {urgent} urgent</span>}
          </p>
        )}
        {nextTask && (
          <p className="text-[11px] text-muted-foreground/60 truncate">Next: {nextTask.title}</p>
        )}
        {lastTouched && (
          <p className="text-[11px] text-muted-foreground/50">Last touched: {lastTouched}</p>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: pillarColor + 'cc' }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/50">{progress}% done · {total} total</p>
        </div>
      )}
    </div>
  );
}