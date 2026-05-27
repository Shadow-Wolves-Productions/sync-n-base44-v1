import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useReminderMutations, usePillars } from '@/lib/useSyncnData';
import DayPicker from './DayPicker';
import RecurringFields from './RecurringFields';
import { Trash2 } from 'lucide-react';

export default function ReminderForm({ editItem, onDone }) {
  const { create, update, remove } = useReminderMutations();
  const { data: pillars } = usePillars();

  const [form, setForm] = useState({
    title: editItem?.title || '',
    day_offset: editItem?.day_offset ?? 0,
    start_hour: editItem?.start_hour ?? 9,
    start_min: editItem?.start_min ?? 0,
    block_time: editItem?.block_time || false,
    duration_mins: editItem?.duration_mins || 30,
    notes: editItem?.notes || '',
    pillar_id: editItem?.pillar_id || '',
    is_recurring: editItem?.is_recurring || false,
    recurring_type: editItem?.recurring_type || 'daily',
    recurring_days: editItem?.recurring_days || [],
    recurring_start_hour: editItem?.recurring_start_hour || 9,
    recurring_start_min: editItem?.recurring_start_min || 0,
    recurring_end_date: editItem?.recurring_end_date || '',
    done_dates: editItem?.done_dates || [],
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = { ...form };
    if (!data.recurring_end_date) delete data.recurring_end_date;
    if (editItem) {
      await update.mutateAsync({ id: editItem.id, data });
    } else {
      await create.mutateAsync(data);
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
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Reminder title" />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Recurring?</Label>
        <Switch checked={form.is_recurring} onCheckedChange={v => set('is_recurring', v)} />
      </div>
      {form.is_recurring && <RecurringFields data={form} onChange={setForm} />}

      {!form.is_recurring && (
        <div className="space-y-1.5">
          <Label>Day</Label>
          <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
        </div>
      )}

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

      <div className="flex items-center justify-between">
        <Label className="text-sm">Block time on calendar</Label>
        <Switch checked={form.block_time} onCheckedChange={v => set('block_time', v)} />
      </div>
      {form.block_time && (
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" value={form.duration_mins} onChange={e => set('duration_mins', Number(e.target.value))} min={5} step={5} className="h-9" />
        </div>
      )}

      {/* Pillar association */}
      {pillars.length > 0 && (
        <div className="space-y-1.5">
          <Label>Pillar (optional)</Label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => set('pillar_id', '')}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${!form.pillar_id ? 'bg-muted border-border text-foreground' : 'border-border/50 text-muted-foreground hover:bg-muted/50'}`}>
              None
            </button>
            {pillars.map(p => (
              <button key={p.id} type="button" onClick={() => set('pillar_id', form.pillar_id === p.id ? '' : p.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all"
                style={form.pillar_id === p.id
                  ? { borderColor: p.color + '70', backgroundColor: p.color + '20', color: p.color }
                  : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
          <Button type="submit" size="sm">{editItem ? 'Update' : 'Create Reminder'}</Button>
        </div>
      </div>
    </form>
  );
}