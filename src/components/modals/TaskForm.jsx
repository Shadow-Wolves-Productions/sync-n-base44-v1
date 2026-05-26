import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePillars, useTaskMutations } from '@/lib/useSyncnData';
import DayPicker from './DayPicker';
import RecurringFields from './RecurringFields';
import { Trash2 } from 'lucide-react';

export default function TaskForm({ editItem, onDone }) {
  const { data: pillars } = usePillars();
  const { create, update, remove } = useTaskMutations();

  const [form, setForm] = useState({
    title: editItem?.title || '',
    pillar_id: editItem?.pillar_id || '',
    sub_pillar: editItem?.sub_pillar || '',
    priority: editItem?.priority || 'Medium',
    status: editItem?.status || 'active',
    duration_mins: editItem?.duration_mins || 30,
    deadline: editItem?.deadline || '',
    notes: editItem?.notes || '',
    is_recurring: editItem?.is_recurring || false,
    recurring_type: editItem?.recurring_type || 'daily',
    recurring_days: editItem?.recurring_days || [],
    recurring_start_hour: editItem?.recurring_start_hour || 9,
    recurring_start_min: editItem?.recurring_start_min || 0,
    recurring_end_date: editItem?.recurring_end_date || '',
    scheduled: editItem?.scheduled || false,
    day_offset: editItem?.day_offset ?? null,
    start_hour: editItem?.start_hour ?? null,
    start_min: editItem?.start_min ?? null,
  });

  const selectedPillar = pillars.find(p => p.id === form.pillar_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const data = { ...form };
    if (!data.deadline) delete data.deadline;
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

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to happen?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Pillar</Label>
          <Select value={form.pillar_id} onValueChange={v => { set('pillar_id', v); set('sub_pillar', ''); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select pillar" /></SelectTrigger>
            <SelectContent>
              {pillars.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.icon} {p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sub-pillar</Label>
          <Select value={form.sub_pillar} onValueChange={v => set('sub_pillar', v)} disabled={!selectedPillar}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(selectedPillar?.sub_pillars || []).map(sp => (
                <SelectItem key={sp} value={sp}>{sp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Priority</Label>
        <div className="flex gap-2">
          {['High', 'Medium', 'Low'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => set('priority', p)}
              className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                form.priority === p
                  ? p === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : p === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                  : 'bg-card border-border hover:bg-muted text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">🔥 Active</SelectItem>
              <SelectItem value="upcoming">🟡 Upcoming</SelectItem>
              <SelectItem value="parked">❄️ Parked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Duration</Label>
          <Input type="number" value={form.duration_mins} onChange={e => set('duration_mins', Number(e.target.value))} min={5} step={5} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label>Deadline</Label>
          <Input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className="h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional details..." />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Recurring task?</Label>
        <Switch checked={form.is_recurring} onCheckedChange={v => set('is_recurring', v)} />
      </div>
      {form.is_recurring && <RecurringFields data={form} onChange={setForm} />}

      <div className="flex items-center justify-between">
        <Label className="text-sm">Schedule manually now</Label>
        <Switch checked={form.scheduled} onCheckedChange={v => set('scheduled', v)} />
      </div>
      {form.scheduled && (
        <div className="space-y-3 p-3 bg-surface/50 rounded-lg border border-border/50">
          <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
          <div className="space-y-1.5">
            <Label className="text-xs">Time</Label>
            <Input
              type="time"
              className="h-8 text-sm"
              value={`${String(form.start_hour || 9).padStart(2, '0')}:${String(form.start_min || 0).padStart(2, '0')}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setForm(f => ({ ...f, start_hour: h, start_min: m }));
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {editItem && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm">{editItem ? 'Update' : 'Create Task'}</Button>
        </div>
      </div>
    </form>
  );
}