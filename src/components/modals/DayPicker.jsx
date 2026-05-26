import React from 'react';
import { format, addDays } from 'date-fns';
import { dateToOffset, offsetToDate } from '@/lib/syncn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DayPicker({ value, onChange }) {
  const today = new Date();
  const chips = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    const offset = i;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE d');
    chips.push({ label, offset, date: d });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => (
          <button
            key={c.offset}
            type="button"
            onClick={() => onChange(c.offset)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              value === c.offset
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-muted text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Or pick a date:</Label>
        <Input
          type="date"
          className="h-8 text-xs"
          value={value !== null && value !== undefined ? format(offsetToDate(value), 'yyyy-MM-dd') : ''}
          onChange={(e) => {
            if (e.target.value) {
              onChange(dateToOffset(new Date(e.target.value)));
            }
          }}
        />
      </div>
    </div>
  );
}