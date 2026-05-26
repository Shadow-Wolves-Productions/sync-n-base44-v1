import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserSettings, useSettingsMutations } from '@/lib/useSyncnData';
import { DEFAULT_ENERGY } from '@/lib/syncn';

const PERIODS = [
  { key: 'morning', label: '🌅 Morning', time: '6-11am' },
  { key: 'midday', label: '☀️ Midday', time: '11am-1pm' },
  { key: 'afternoon', label: '🌤️ Afternoon', time: '1-5pm' },
  { key: 'evening', label: '🌆 Evening', time: '5-8pm' },
  { key: 'night', label: '🌙 Night', time: '8pm+' },
];

const LEVELS = ['low', 'medium', 'high', 'peak'];
const LEVEL_COLORS = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-emerald-500/20 text-emerald-400',
  peak: 'bg-primary/20 text-primary',
};

export default function EnergyModal({ open, onOpenChange }) {
  const { data: settings } = useUserSettings();
  const { update } = useSettingsMutations();
  const [rhythm, setRhythm] = useState(DEFAULT_ENERGY);

  useEffect(() => {
    if (settings?.energy_rhythm) setRhythm(settings.energy_rhythm);
  }, [settings]);

  const handleSave = async () => {
    if (settings?.id) {
      await update.mutateAsync({ id: settings.id, data: { energy_rhythm: rhythm } });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Energy Rhythm</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-4">Set your energy levels. AI scheduling uses this to place tasks at optimal times.</p>
        <div className="space-y-3">
          {PERIODS.map(period => (
            <div key={period.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm">{period.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{period.time}</span>
              </div>
              <div className="flex gap-1">
                {LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRhythm(r => ({ ...r, [period.key]: level }))}
                    className={`flex-1 py-1 text-xs rounded-md border transition-colors capitalize ${
                      rhythm[period.key] === level ? LEVEL_COLORS[level] + ' border-current' : 'bg-card border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} className="w-full mt-4">Save</Button>
      </DialogContent>
    </Dialog>
  );
}