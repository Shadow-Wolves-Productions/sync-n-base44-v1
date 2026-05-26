import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RecurringFields({ data, onChange }) {
  const updateField = (field, val) => onChange({ ...data, [field]: val });

  const toggleDay = (dayIndex) => {
    const days = data.recurring_days || [];
    if (days.includes(dayIndex)) {
      updateField('recurring_days', days.filter(d => d !== dayIndex));
    } else {
      updateField('recurring_days', [...days, dayIndex]);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-surface/50 rounded-lg border border-border/50">
      <div className="space-y-1.5">
        <Label className="text-xs">Frequency</Label>
        <Select value={data.recurring_type || 'daily'} onValueChange={v => updateField('recurring_type', v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekday">Weekdays</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="weekend">Weekends</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.recurring_type === 'weekly' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Days</Label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-9 h-8 text-xs rounded-md border transition-colors ${
                  (data.recurring_days || []).includes(i)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Time</Label>
          <Input
            type="time"
            className="h-8 text-sm"
            value={`${String(data.recurring_start_hour || 9).padStart(2, '0')}:${String(data.recurring_start_min || 0).padStart(2, '0')}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              onChange({ ...data, recurring_start_hour: h, recurring_start_min: m });
            }}
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">End date (optional)</Label>
          <Input
            type="date"
            className="h-8 text-sm"
            value={data.recurring_end_date || ''}
            onChange={(e) => updateField('recurring_end_date', e.target.value || null)}
          />
        </div>
      </div>
    </div>
  );
}