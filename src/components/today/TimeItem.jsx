import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatTime } from '@/lib/syncn';

export default function TimeItem({ item, pillar, onToggleDone, onItemClick }) {
  const hour = item.start_hour ?? item.recurring_start_hour ?? 0;
  const min = item.start_min ?? item.recurring_start_min ?? 0;
  const isEvent = item._itemType === 'event';
  const isTask = item._itemType === 'task';

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={() => onItemClick?.(item)}
    >
      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
        {formatTime(hour, min)}
      </span>
      <div
        className="w-0.5 h-6 rounded-full shrink-0"
        style={{ backgroundColor: pillar?.color || (isEvent ? '#00b4d8' : '#6b7280') }}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${item.done ? 'line-through text-muted-foreground' : ''}`}>
          {item.title}
        </p>
        {pillar && (
          <p className="text-xs text-muted-foreground">{pillar.icon} {pillar.label}</p>
        )}
      </div>
      {isTask && (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={item.done}
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