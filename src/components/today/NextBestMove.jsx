import React, { useMemo } from 'react';
import { useTasks, usePillars, useCalendarEvents } from '@/lib/useSyncnData';
import { getPeriodForHour, getCurrentPeriod } from '@/lib/syncn';
import { format } from 'date-fns';
import { ArrowRight, Clock, AlertCircle } from 'lucide-react';

export default function NextBestMove({ onTaskClick }) {
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { data: events } = useCalendarEvents();

  const now = new Date();
  const currentPeriod = getCurrentPeriod();

  const { nextTask, waiting, canWait, nextEvent } = useMemo(() => {
    const active = tasks.filter(t => !t.done && !t.archived && t.status === 'active');

    // Next scheduled task today that isn't done
    const scheduledToday = active
      .filter(t => t.scheduled && t.day_offset === 0)
      .sort((a, b) => (a.start_hour * 60 + (a.start_min || 0)) - (b.start_hour * 60 + (b.start_min || 0)));

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nextSched = scheduledToday.find(t => (t.start_hour * 60 + (t.start_min || 0)) >= nowMin);

    // Best unscheduled task by priority
    const unscheduled = active.filter(t => !t.scheduled).sort((a, b) => {
      const pMap = { High: 3, Medium: 2, Low: 1 };
      return (pMap[b.priority] || 1) - (pMap[a.priority] || 1);
    });

    const nextTask = nextSched || unscheduled[0] || null;

    // Waiting (high priority, unscheduled)
    const waiting = unscheduled.filter(t => t.priority === 'High' && t !== nextTask).slice(0, 3);

    // Can wait (low/medium parked or upcoming)
    const canWait = tasks.filter(t => !t.done && !t.archived && (t.status === 'parked' || t.priority === 'Low')).slice(0, 3);

    // Next calendar event today
    const nextEvent = events
      .filter(e => e.day_offset === 0 && !e.ignored)
      .sort((a, b) => (a.start_hour * 60 + (a.start_min || 0)) - (b.start_hour * 60 + (b.start_min || 0)))
      .find(e => (e.start_hour * 60 + (e.start_min || 0)) >= nowMin);

    return { nextTask, waiting, canWait, nextEvent };
  }, [tasks, events]);

  const getPillar = (task) => pillars.find(p => p.id === task?.pillar_id);

  return (
    <div className="space-y-3 w-64 shrink-0">

      {/* Next Best Move */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Next best move</p>
          {nextTask ? (
            <button
              onClick={() => onTaskClick({ ...nextTask, _itemType: 'task' })}
              className="w-full text-left group"
            >
              <div className="flex items-start gap-2.5">
                {(() => { const p = getPillar(nextTask); return p ? (
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: p.color }} />
                ) : <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-muted-foreground/30" />; })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug">{nextTask.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {nextTask.duration_mins && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />{nextTask.duration_mins}m
                      </span>
                    )}
                    {nextTask.priority === 'High' && (
                      <span className="text-[11px] text-red-400 font-medium">Urgent</span>
                    )}
                    {nextTask.scheduled && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {format(new Date(2000, 0, 1, nextTask.start_hour, nextTask.start_min || 0), 'h:mma').toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors mt-0.5 shrink-0" />
              </div>
            </button>
          ) : (
            <p className="text-sm text-muted-foreground/60">All clear — you're ahead.</p>
          )}
        </div>

        {/* Next event */}
        {nextEvent && (
          <div className="px-4 py-2.5 border-t border-border/30 bg-muted/20">
            <p className="text-[10px] text-muted-foreground/50 mb-1">Upcoming</p>
            <p className="text-xs font-medium truncate">{nextEvent.title}</p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {format(new Date(2000, 0, 1, nextEvent.start_hour, nextEvent.start_min || 0), 'h:mma').toLowerCase()}
              {nextEvent.duration_mins && ` · ${nextEvent.duration_mins}m`}
            </p>
          </div>
        )}
      </div>

      {/* Waiting */}
      {waiting.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2.5">Needs scheduling</p>
          <div className="space-y-2">
            {waiting.map(t => {
              const p = getPillar(t);
              return (
                <button key={t.id} onClick={() => onTaskClick({ ...t, _itemType: 'task' })} className="w-full text-left flex items-center gap-2 group">
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span className="text-xs truncate group-hover:text-primary transition-colors">{t.title}</span>
                  {p && <div className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ backgroundColor: p.color }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Can wait */}
      {canWait.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Can safely wait</p>
          <div className="space-y-1.5">
            {canWait.map(t => (
              <button key={t.id} onClick={() => onTaskClick({ ...t, _itemType: 'task' })} className="w-full text-left">
                <span className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors truncate block">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}