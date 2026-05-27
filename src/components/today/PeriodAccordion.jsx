import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import TimeItem from './TimeItem';
import { getCurrentPeriod } from '@/lib/syncn';
import { format } from 'date-fns';

const PERIOD_CONFIG = {
  morning:   { label: 'Morning',   range: '6am – noon', accent: 'from-amber-500/8 to-transparent',   dot: 'bg-amber-400',   border: 'border-amber-500/20' },
  afternoon: { label: 'Afternoon', range: 'noon – 5pm', accent: 'from-cyan-500/8 to-transparent',    dot: 'bg-cyan-400',    border: 'border-cyan-500/20'  },
  evening:   { label: 'Evening',   range: '5pm+',        accent: 'from-violet-500/8 to-transparent', dot: 'bg-violet-400',  border: 'border-violet-500/20'},
};

const STATUS_CHIP = (count) => {
  if (count === 0) return { label: 'Clear', cls: 'text-muted-foreground/60' };
  if (count <= 2)  return { label: 'Open',  cls: 'text-emerald-500' };
  if (count <= 4)  return { label: 'Busy',  cls: 'text-amber-500' };
  return              { label: 'Full',  cls: 'text-red-400' };
};

function getNextItem(items) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const upcoming = items.filter(i => {
    const h = i.start_hour ?? i.recurring_start_hour ?? 0;
    const m = i.start_min ?? i.recurring_start_min ?? 0;
    return h * 60 + m >= nowMin;
  });
  return upcoming[0] || items[0];
}

export default function PeriodAccordion({ period, items, pillars, isOpen, onToggle, onToggleDone, onItemClick }) {
  const config = PERIOD_CONFIG[period];
  const current = getCurrentPeriod();
  const isCurrent = current === period;
  const status = STATUS_CHIP(items.length);
  const nextItem = !isOpen ? getNextItem(items) : null;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? `border-border/60 bg-card shadow-sm`
          : `border-border/30 hover:border-border/60 bg-card/40`
      }`}>

        {/* Header */}
        <CollapsibleTrigger className="w-full text-left">
          <div className={`flex items-center gap-3 px-4 py-3.5 ${isOpen ? `bg-gradient-to-r ${config.accent}` : ''}`}>
            {/* Period dot */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot} ${isCurrent ? 'animate-pulse' : 'opacity-60'}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{config.label}</span>
                <span className="text-xs text-muted-foreground/60">{config.range}</span>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded-md bg-primary/15 text-primary">now</span>
                )}
              </div>

              {/* Collapsed preview */}
              {!isOpen && nextItem && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Next: {nextItem.title}
                </p>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2.5 shrink-0">
              {items.length > 0 && (
                <span className="text-xs font-mono text-muted-foreground">{items.length}</span>
              )}
              <span className={`text-[11px] font-medium ${status.cls}`}>{status.label}</span>
              <svg
                className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="border-t border-border/30"
              >
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 py-5 text-center">Nothing scheduled — space to breathe.</p>
                ) : (
                  <div className="py-1">
                    {items.map(item => (
                      <TimeItem
                        key={item._key || item.id}
                        item={item}
                        pillar={pillars.find(p => p.id === item.pillar_id)}
                        onToggleDone={onToggleDone}
                        onItemClick={onItemClick}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}