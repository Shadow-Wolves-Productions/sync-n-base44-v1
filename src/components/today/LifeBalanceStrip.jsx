import React from 'react';
import { usePillars, useTasks } from '@/lib/useSyncnData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LifeBalanceStrip() {
  const { data: pillars } = usePillars();
  const { data: tasks } = useTasks();

  // Count scheduled/done tasks per pillar this week (day_offset 0-6)
  const weekTasks = tasks.filter(t => !t.archived && t.scheduled && t.day_offset >= 0 && t.day_offset <= 6);
  const total = weekTasks.length || 1;

  const pillarCounts = pillars.map(p => ({
    ...p,
    count: weekTasks.filter(t => t.pillar_id === p.id).length,
  })).filter(p => p.count > 0);

  const unassigned = weekTasks.filter(t => !t.pillar_id).length;

  // Find pillar with fewest tasks for neutral message
  const quietPillar = pillars.length > 0
    ? pillars.reduce((min, p) => {
        const c = weekTasks.filter(t => t.pillar_id === p.id).length;
        return c < min.count ? { ...p, count: c } : min;
      }, { ...pillars[0], count: weekTasks.filter(t => t.pillar_id === pillars[0]?.id).length })
    : null;

  return (
    <div className="mt-6">
      <TooltipProvider>
        <div className="h-2 rounded-full overflow-hidden flex bg-muted">
          {pillarCounts.map(p => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(p.count / total) * 100}%`,
                    backgroundColor: p.color,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{p.icon} {p.label}: {p.count} tasks</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {unassigned > 0 && (
            <div className="h-full bg-muted-foreground/30" style={{ width: `${(unassigned / total) * 100}%` }} />
          )}
        </div>
      </TooltipProvider>
      {quietPillar && quietPillar.count === 0 && (
        <p className="text-xs text-muted-foreground mt-2">{quietPillar.icon} {quietPillar.label} quiet this week</p>
      )}
    </div>
  );
}