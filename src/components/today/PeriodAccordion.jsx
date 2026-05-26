import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TimeItem from './TimeItem';
import { getCurrentPeriod } from '@/lib/syncn';

const PERIOD_CONFIG = {
  morning: { icon: '🌅', label: 'Morning', range: 'midnight–noon' },
  afternoon: { icon: '☀️', label: 'Afternoon', range: 'noon–5pm' },
  evening: { icon: '🌙', label: 'Evening', range: '5pm+' },
};

export default function PeriodAccordion({ period, items, pillars, isOpen, onToggle, onToggleDone, onItemClick }) {
  const config = PERIOD_CONFIG[period];
  const current = getCurrentPeriod();
  const isCurrent = current === period;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg">
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <span className="text-base">{config.icon}</span>
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground ml-1">{config.range}</span>
        {items.length > 0 && (
          <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
            {items.length}
          </span>
        )}
        {items.length === 0 && (
          <span className="ml-auto text-xs text-muted-foreground">Clear</span>
        )}
        {isCurrent && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-primary/20 text-primary">NOW</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-8 pr-2 pb-2"
            >
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 pl-3">Nothing scheduled</p>
              ) : (
                items.map(item => (
                  <TimeItem
                    key={item._key || item.id}
                    item={item}
                    pillar={pillars.find(p => p.id === item.pillar_id)}
                    onToggleDone={onToggleDone}
                    onItemClick={onItemClick}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}