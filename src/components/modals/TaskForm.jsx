import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePillars, useTaskMutations } from '@/lib/useSyncnData';
import DayPicker from './DayPicker';
import RecurringFields from './RecurringFields';
import { Trash2, Flame, Clock, Archive, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';

const STATUSES = [
  { value: 'active',   label: 'Active',   icon: Flame,   color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  { value: 'upcoming', label: 'Upcoming', icon: Clock,   color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' },
  { value: 'parked',   label: 'Parked',   icon: Archive, color: 'text-muted-foreground border-border bg-muted/40' },
];

const PRIORITIES = [
  { value: 'High',   dot: 'bg-red-400',   active: 'border-red-400/50 bg-red-400/10 text-red-400' },
  { value: 'Medium', dot: 'bg-amber-400',  active: 'border-amber-400/50 bg-amber-400/10 text-amber-400' },
  { value: 'Low',    dot: 'bg-slate-400',  active: 'border-slate-400/50 bg-slate-400/10 text-slate-400' },
];

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
    <form onSubmit={handleSubmit} className="space-y-5 mt-1">

      {/* Title */}
      <Input
        value={form.title}
        onChange={e => set('title', e.target.value)}
        placeholder="What needs to happen?"
        className="text-base h-10 border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent font-medium placeholder:font-normal"
        autoFocus
      />

      {/* Status pills */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <div className="flex gap-2">
          {STATUSES.map(s => {
            const Icon = s.icon;
            const active = form.status === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => set('status', s.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  active ? s.color : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority + Duration row */}
      <div className="flex items-center gap-4">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('priority', p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all ${
                  form.priority === p.value ? p.active : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                {p.value}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 w-24">
          <Label className="text-xs text-muted-foreground">Duration</Label>
          <div className="relative">
            <Input
              type="number"
              value={form.duration_mins}
              onChange={e => set('duration_mins', Number(e.target.value))}
              min={5} step={5}
              className="h-8 pr-6 text-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">m</span>
          </div>
        </div>
      </div>

      {/* Pillar + Sub-pillar */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pillar</Label>
        <div className="flex flex-wrap gap-1.5">
          {pillars.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { set('pillar_id', p.id); set('sub_pillar', ''); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                form.pillar_id === p.id
                  ? 'text-foreground border-foreground/30 bg-foreground/8'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
              style={form.pillar_id === p.id ? { borderColor: p.color + '60', backgroundColor: p.color + '15', color: p.color } : {}}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        {selectedPillar?.sub_pillars?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
            {selectedPillar.sub_pillars.map(sp => (
              <button
                key={sp}
                type="button"
                onClick={() => set('sub_pillar', form.sub_pillar === sp ? '' : sp)}
                className={`px-2 py-0.5 rounded-md text-[11px] border transition-all ${
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

      {/* Deadline + Notes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Deadline</Label>
          <Input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional context..." className="text-sm resize-none" />
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-sm text-muted-foreground">Recurring</span>
        <Switch checked={form.is_recurring} onCheckedChange={v => set('is_recurring', v)} />
      </div>
      {form.is_recurring && <RecurringFields data={form} onChange={setForm} />}

      {/* Schedule section — collapsible */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSchedule(!showSchedule)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={showSchedule ? 'text-foreground' : 'text-muted-foreground'}>
              {showSchedule ? 'Scheduled' : 'Schedule on calendar'}
            </span>
          </div>
          {showSchedule ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {showSchedule && (
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/40 bg-muted/20">
            <DayPicker value={form.day_offset} onChange={v => set('day_offset', v)} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input
                type="time"
                className="h-8 text-sm w-32"
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
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
          <Button type="submit" size="sm" className="px-5">{editItem ? 'Save' : 'Add Task'}</Button>
        </div>
      </div>
    </form>
  );
}