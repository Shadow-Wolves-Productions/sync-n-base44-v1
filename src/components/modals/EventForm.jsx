import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCalendarEventMutations } from '@/lib/useSyncnData';
import DayPicker from './DayPicker';
import RecurringFields from './RecurringFields';
import { Trash2 } from 'lucide-react';

export default function EventForm({ editItem, onDone }) {
  const { create, update, remove } = useCalendarEventMutations();

  const [form, setForm] = useState({
    title: editItem?.title || '',
    day_offset: editItem?.day_offset ?? 0,
    start_hour: editItem?.start_hour ?? 10,
    start_min: editItem?.start_min ?? 0,
    duration_mins: editItem?.duration_mins || 60,
    location: editItem?.location || '',
    notes: editItem?.notes || '',
    cal_type: editItem?.cal_type || 'manual',
    is_recurring: editItem?.is_recurring || false,
    recurring_type: editItem?.recurring_type || 'weekly',
    recurring_days: editItem?.recurring_days || [],
    recurring_start_hour: editItem?.recurring_start_hour ?? 10,
    recurring_start_min: editItem?.recurring_start_min ?? 0,
    recurring_end_date: editItem?.recurring_end_date || '',
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editItem) {
      await update.mutateAsync({ id: editItem.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
    onDone();
  };

  const handleDelete = async () => {
    if (editItem) {
      await remove.mutateAsync(editItem.id);
      onDone();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Footy on Saturday" />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_recurring}
          onCheckedChange={v => set('is_recurring', v)}
          id="event-recurring"
        />
        <Label htmlFor="event-recurring" className="cursor-pointer">Recurring event</Label>
      </div>

      {!form.is_recurring && (
        <div className="space-y-1.5">
          <Label>Day</Label>
          <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" value={form.duration_mins} onChange={e => set('duration_mins', Number(e.target.value))} min={15} step={15} className="h-9" />
        </div>
        {!form.is_recurring && (
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input
              type="time"
              className="h-9"
              value={`${String(form.start_hour).padStart(2, '0')}:${String(form.start_min).padStart(2, '0')}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setForm(f => ({ ...f, start_hour: h, start_min: m }));
              }}
            />
          </div>
        )}
      </div>

      {form.is_recurring && (
        <RecurringFields
          data={form}
          onChange={updated => setForm(f => ({ ...f, ...updated }))}
        />
      )}

      <div className="space-y-1.5">
        <Label>Location</Label>
        <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Venue, address..." />
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>

      <div className="flex items-center justify-between pt-2">
        {editItem && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm">{editItem ? 'Update' : 'Create Event'}</Button>
        </div>
      </div>
    </form>
  );
}