import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePillars, useTasks } from '@/lib/useSyncnData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Sidebar({ mode }) {
  const { data: pillars } = usePillars();
  const { data: tasks } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();

  if (mode === 'hidden') return null;

  const collapsed = mode === 'collapsed';

  const getTaskCount = (pillarId) =>
    tasks.filter(t => t.pillar_id === pillarId && !t.done && !t.archived && t.status !== 'parked').length;

  const handlePillarClick = (pillarId) => {
    navigate(`/life-map?pillar=${pillarId}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="shrink-0 flex flex-col pt-4 pb-6 gap-1 bg-background border-r border-border/50 overflow-hidden transition-all duration-200"
        style={{ width: collapsed ? 48 : 180 }}
      >
        {pillars.map(pillar => {
          const count = getTaskCount(pillar.id);
          const isActive = location.search.includes(pillar.id);

          const inner = (
            <button
              key={pillar.id}
              onClick={() => handlePillarClick(pillar.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md mx-1 transition-colors text-left group
                ${isActive ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
              style={{ width: collapsed ? 36 : 'calc(100% - 8px)' }}
            >
              {collapsed ? (
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mx-auto"
                  style={{ backgroundColor: pillar.color }}
                />
              ) : (
                <>
                  <span className="text-base leading-none shrink-0">{pillar.icon}</span>
                  <span className="text-sm truncate flex-1 text-foreground/80 group-hover:text-foreground">
                    {pillar.label}
                  </span>
                  {count > 0 && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 text-white"
                      style={{ backgroundColor: pillar.color + 'cc' }}
                    >
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );

          if (collapsed) {
            return (
              <Tooltip key={pillar.id}>
                <TooltipTrigger asChild>{inner}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {pillar.label}{count > 0 ? ` · ${count}` : ''}
                </TooltipContent>
              </Tooltip>
            );
          }

          return inner;
        })}
      </aside>
    </TooltipProvider>
  );
}