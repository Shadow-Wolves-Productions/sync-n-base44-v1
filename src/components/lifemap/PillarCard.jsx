import React from 'react';
import { Pencil } from 'lucide-react';

export default function PillarCard({ pillar, tasks, onClick, onEdit }) {
  const pillarTasks = tasks.filter(t => t.pillar_id === pillar.id && !t.archived);
  const done = pillarTasks.filter(t => t.done).length;
  const total = pillarTasks.length;
  const active = pillarTasks.filter(t => t.status === 'active' && !t.done).length;
  const urgent = pillarTasks.filter(t => t.priority === 'High' && !t.done).length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  // Health: green if progress > 50%, yellow if > 25%, red otherwise
  const health = total === 0 ? 'neutral' : progress > 50 ? 'green' : progress > 25 ? 'yellow' : 'red';
  const healthColor = health === 'green' ? '#4db88a' : health === 'yellow' ? '#f59e0b' : health === 'red' ? '#ef4444' : '#6b7280';

  return (
    <div
      className="relative bg-card/90 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card transition-colors group"
      onClick={onClick}
    >
      <button
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{pillar.icon}</span>
        <div>
          <h3 className="text-sm font-medium">{pillar.label}</h3>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: healthColor }} />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: pillar.color }}
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{done}/{total} done</span>
        {active > 0 && <span>{active} active</span>}
        {urgent > 0 && <span className="text-red-400">{urgent} urgent</span>}
      </div>
    </div>
  );
}