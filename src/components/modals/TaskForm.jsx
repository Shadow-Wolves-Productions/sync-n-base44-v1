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
import { Trash2, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

export default function TaskForm({ editItem, onDone }) {
  const { data: pillars } = usePillars();
  const { create, update, remove } = useTaskMutations();
  const [showSchedule, setShowSchedule] = useState(editItem?.scheduled || false);

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
    start_hour: editItem?.start_hour ?? 9,
    start_min: editItem?.start_min ?? 0,
  });

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
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
    if (editItem) { await remove.mutateAsync(editItem.id); onDone(); }
  };

  const toggleSchedule = (v) => {
    setShowSchedule(v);
    set('scheduled', v);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">

      {/* Title — matches Meeting style */}
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to happen?" />
      </div>

      {/* Status + Priority + Duration in one row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">🔥 Active</SelectItem>
              <SelectItem value="upcoming">🕐 Upcoming</SelectItem>
              <SelectItem value="parked">❄️ Parked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set('priority', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="High">🔴 High</SelectItem>
              <SelectItem value="Medium">🟡 Medium</SelectItem>
              <SelectItem value="Low">🟢 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <Input type="number" value={form.duration_mins} onChange={e => set('duration_mins', Number(e.target.value))} min={5} step={5} className="h-9" />
        </div>
      </div>

      {/* Pillar pills */}
      <div className="space-y-2">
        <Label>Pillar</Label>
        <div className="flex flex-wrap gap-1.5">
          {pillars.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (form.pillar_id === p.id) { set('pillar_id', ''); set('sub_pillar', ''); }
                else { set('pillar_id', p.id); set('sub_pillar', ''); }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all"
              style={
                form.pillar_id === p.id
                  ? { borderColor: p.color + '70', backgroundColor: p.color + '20', color: p.color }
                  : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Sub-pillar pills — appear when pillar selected */}
        {selectedPillar?.sub_pillars?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1 pt-0.5">
            {selectedPillar.sub_pillars.map(sp => (
              <button
                key={sp}
                type="button"
                onClick={() => set('sub_pillar', form.sub_pillar === sp ? '' : sp)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-all ${
                  form.sub_pillar === sp
                    ? 'border-border bg-muted text-foreground'
                    : 'border-border/50 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {sp}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Deadline */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Deadline</Label>
          <Input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className="h-9" />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional context..." />
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between">
        <Label className="text-sm">Recurring task?</Label>
        <Switch checked={form.is_recurring} onCheckedChange={v => set('is_recurring', v)} />
      </div>
      {form.is_recurring && <RecurringFields data={form} onChange={setForm} />}

      {/* Schedule — collapsible */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSchedule(!showSchedule)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{showSchedule ? 'Scheduled on calendar' : 'Schedule on calendar'}</span>
          </div>
          {showSchedule ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {showSchedule && (
          <div className="px-3 pb-3 pt-2 space-y-3 border-t border-border/40 bg-muted/20">
            <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <Input
                type="time"
                className="h-9 w-32"
                value={`${String(form.start_hour ?? 9).padStart(2, '0')}:${String(form.start_min ?? 0).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  setForm(f => ({ ...f, start_hour: h, start_min: m }));
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {editItem ? (
          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        ) : <div />}
        <div className="flex gap-2 ml-auto">
          <Button type="button" variant="outline" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm">{editItem ? 'Update' : 'Create Task'}</Button>
        </div>
      </div>
    </form>
  );
}