import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useTaskMutations, usePillarMutations } from '@/lib/useSyncnData';
import { PRIORITY_COLORS } from '@/lib/syncn';
import { ChevronLeft, Plus, Pencil, X } from 'lucide-react';
import AddModal from '@/components/modals/AddModal';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: '🔥 Active' },
  { key: 'upcoming', label: '🟡 Upcoming' },
  { key: 'parked', label: '❄️ Parked' },
  { key: 'done', label: '✓ Done' },
];

export default function PillarDrilldown({ pillar, onBack }) {
  const { data: tasks } = useTasks();
  const { update: updateTask } = useTaskMutations();
  const { update: updatePillar } = usePillarMutations();
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [newSubName, setNewSubName] = useState('');
  const [addingSub, setAddingSub] = useState(false);

  const pillarTasks = tasks.filter(t => t.pillar_id === pillar.id && !t.archived);
  const filtered = filter === 'all' ? pillarTasks
    : filter === 'done' ? pillarTasks.filter(t => t.done)
    : pillarTasks.filter(t => t.status === filter && !t.done);

  const handleToggleDone = async (task, checked) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: { done: checked, done_at: checked ? new Date().toISOString() : null }
    });
  };

  const handleSubPillarRename = async (oldName, newName) => {
    if (!newName.trim()) return;
    const newSubs = pillar.sub_pillars.map(s => s === oldName ? newName : s);
    await updatePillar.mutateAsync({ id: pillar.id, data: { sub_pillars: newSubs } });
    // Update tasks with old sub_pillar name
    for (const t of tasks.filter(t => t.pillar_id === pillar.id && t.sub_pillar === oldName)) {
      await updateTask.mutateAsync({ id: t.id, data: { sub_pillar: newName } });
    }
    setEditingSub(null);
  };

  const handleSubPillarDelete = async (name) => {
    const newSubs = pillar.sub_pillars.filter(s => s !== name);
    await updatePillar.mutateAsync({ id: pillar.id, data: { sub_pillars: newSubs } });
    setEditingSub(null);
  };

  const handleAddSubPillar = async () => {
    if (!newSubName.trim()) return;
    const newSubs = [...(pillar.sub_pillars || []), newSubName.trim()];
    await updatePillar.mutateAsync({ id: pillar.id, data: { sub_pillars: newSubs } });
    setNewSubName('');
    setAddingSub(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-2xl">{pillar.icon}</span>
        <h2 className="text-xl font-semibold">{pillar.label}</h2>
      </div>

      {/* Sub-pillar chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(pillar.sub_pillars || []).map(sp => (
          <div key={sp} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-sm">
            {editingSub === sp ? (
              <Input
                className="h-5 w-24 text-xs"
                defaultValue={sp}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubPillarRename(sp, e.target.value);
                  if (e.key === 'Escape') setEditingSub(null);
                }}
                onBlur={(e) => handleSubPillarRename(sp, e.target.value)}
              />
            ) : (
              <>
                <span>{sp}</span>
                <button onClick={() => setEditingSub(sp)} className="hover:text-foreground text-muted-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleSubPillarDelete(sp)} className="hover:text-destructive text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}
        {addingSub ? (
          <div className="flex items-center gap-1">
            <Input
              className="h-7 w-28 text-xs"
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              placeholder="New sub-pillar"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubPillar(); if (e.key === 'Escape') setAddingSub(false); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleAddSubPillar}>Add</Button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSub(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30"
          >
            <Plus className="w-3 h-3" /> Sub-pillar
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No tasks</p>
        ) : (
          filtered.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer group"
              onClick={() => { setEditItem({ ...task, _type: 'task' }); setEditOpen(true); }}
            >
              <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
              <div onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(c) => handleToggleDone(task, c)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                {task.sub_pillar && <p className="text-xs text-muted-foreground">{task.sub_pillar}</p>}
              </div>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
              {task.duration_mins && <span className="text-xs text-muted-foreground font-mono">{task.duration_mins}m</span>}
              {task.postpone_count > 0 && (
                <span className="text-xs text-amber-500">↻{task.postpone_count}</span>
              )}
            </div>
          ))
        )}
      </div>

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}