import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePillars, useTasks } from '@/lib/useSyncnData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar({ mode }) {
  const { data: pillars } = usePillars();
  const { data: tasks } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState({});

  if (mode === 'hidden') return null;
  const collapsed = mode === 'collapsed';

  const getTaskCount = (pillarId) =>
    tasks.filter(t => t.pillar_id === pillarId && !t.done && !t.archived && t.status !== 'parked').length;

  const getSubPillarCount = (pillarId, subPillar) =>
    tasks.filter(t => t.pillar_id === pillarId && t.sub_pillar === subPillar && !t.done && !t.archived && t.status !== 'parked').length;

  const toggleExpand = (pillarId) => {
    setExpanded(prev => ({ ...prev, [pillarId]: !prev[pillarId] }));
  };

  const handlePillarClick = (pillarId) => {
    navigate(`/life-map?pillar=${pillarId}`);
  };

  const handleSubPillarClick = (pillarId, subPillar) => {
    navigate(`/life-map?pillar=${pillarId}&sub=${encodeURIComponent(subPillar)}`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="shrink-0 flex flex-col pt-4 pb-6 gap-0.5 bg-background border-r border-border/50 overflow-hidden transition-all duration-200"
        style={{ width: collapsed ? 48 : 180 }}
      >
        {pillars.map(pillar => {
          const count = getTaskCount(pillar.id);
          const isActive = location.search.includes(pillar.id);
          const hasSubPillars = !collapsed && (pillar.sub_pillars?.length > 0);
          const isExpanded = expanded[pillar.id];

          const pillarBtn = (
            <div key={pillar.id} className="flex flex-col">
              <div className={`flex items-center mx-1 rounded-md transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                style={{ width: collapsed ? 36 : 'calc(100% - 8px)' }}>
                <button
                  onClick={() => handlePillarClick(pillar.id)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-left flex-1 min-w-0 group"
                >
                  {collapsed ? (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 mx-auto" style={{ backgroundColor: pillar.color }} />
                  ) : (
                    <>
                      <span className="text-base leading-none shrink-0">{pillar.icon}</span>
                      <span className="text-sm truncate flex-1 text-foreground/80 group-hover:text-foreground">{pillar.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ backgroundColor: pillar.color + 'cc' }}>
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </button>
                {hasSubPillars && (
                  <button
                    onClick={() => toggleExpand(pillar.id)}
                    className="pr-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3" />
                      : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Sub-pillars */}
              {hasSubPillars && isExpanded && (
                <div className="ml-7 mr-2 mt-0.5 mb-1 space-y-0.5">
                  {pillar.sub_pillars.map(sp => {
                    const spCount = getSubPillarCount(pillar.id, sp);
                    return (
                      <button
                        key={sp}
                        onClick={() => handleSubPillarClick(pillar.id, sp)}
                        className="w-full flex items-center justify-between px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="truncate">{sp}</span>
                        {spCount > 0 && <span className="text-[10px] text-muted-foreground ml-1">{spCount}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={pillar.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handlePillarClick(pillar.id)}
                    className={`w-full flex items-center justify-center py-1.5 rounded-md mx-1 transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                    style={{ width: 36 }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pillar.color }} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {pillar.label}{count > 0 ? ` · ${count}` : ''}
                </TooltipContent>
              </Tooltip>
            );
          }

          return pillarBtn;
        })}
      </aside>
    </TooltipProvider>
  );
}