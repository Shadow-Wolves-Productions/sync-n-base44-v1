import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatTime } from '@/lib/syncn';
import { Lock } from 'lucide-react';

export default function TimeItem({ item, pillar, onToggleDone, onItemClick }) {
  const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
  const min = item.start_min ?? item.recurring_start_min ?? 0;
  const isEvent = item._itemType === 'event';
  const isTask = item._itemType === 'task';
  const isMissed = isTask && item.status === 'missed';
  const isCompleted = isTask && (item.done || item.status === 'completed');

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer group ${
        isMissed ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-muted/50'
      }`}
      onClick={() => onItemClick?.(item)}
    >
      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
        {formatTime(hour, min)}
      </span>
      <div
        className="w-0.5 h-6 rounded-full shrink-0"
        style={{ backgroundColor: isMissed ? '#ef4444' : (pillar?.color || (isEvent ? '#00b4d8' : '#6b7280')) }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {item.title}
          </p>
          {isMissed && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
              Missed
            </span>
          )}
          {item.manually_scheduled && (
            <Lock className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
          )}
        </div>
        {pillar && (
          <p className="text-xs text-muted-foreground">{pillar.icon} {pillar.label}</p>
        )}
      </div>
      {isTask && (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => onToggleDone(item, checked)}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      )}
      {isEvent && (
        <span className="text-xs text-muted-foreground font-mono">{item.duration_mins}m</span>
      )}
    </div>
  );
}