import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCalendarEventMutations, usePillars } from '@/lib/useSyncnData';
import DayPicker from './DayPicker';
import RecurringFields from './RecurringFields';
import { Trash2 } from 'lucide-react';

export default function MeetingForm({ editItem, onDone }) {
  const { create, update, remove } = useCalendarEventMutations();
  const { data: pillars } = usePillars();

  const [form, setForm] = useState({
    title: editItem?.title || '',
    day_offset: editItem?.day_offset ?? 0,
    start_hour: editItem?.start_hour ?? 10,
    start_min: editItem?.start_min ?? 0,
    duration_mins: editItem?.duration_mins || 60,
    location: editItem?.location || '',
    attendees: editItem?.attendees || '',
    notes: editItem?.notes || '',
    cal_type: editItem?.cal_type || 'manual',
    pillar_id: editItem?.pillar_id || '',
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
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Meeting title" />
      </div>

      <div className="space-y-1.5">
        <Label>Participants</Label>
        <Input value={form.attendees} onChange={e => set('attendees', e.target.value)} placeholder="Name, name..." />
      </div>

      <div className="space-y-1.5">
        <Label>Day</Label>
        <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" value={form.duration_mins} onChange={e => set('duration_mins', Number(e.target.value))} min={15} step={15} className="h-9" />
        </div>
      </div>

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
        <Label>Location / Link</Label>
        <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Zoom link, office..." />
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
          <Button type="submit" size="sm">{editItem ? 'Update' : 'Create Meeting'}</Button>
        </div>
      </div>
    </form>
  );
}