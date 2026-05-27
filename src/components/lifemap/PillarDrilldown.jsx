import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useTaskMutations, usePillarMutations } from '@/lib/useSyncnData';
import { PRIORITY_COLORS } from '@/lib/syncn';
import { ChevronLeft, Plus, Pencil, Folder, FolderOpen } from 'lucide-react';
import AddModal from '@/components/modals/AddModal';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: '🔥 Active' },
  { key: 'upcoming', label: '🕐 Upcoming' },
  { key: 'parked', label: '❄️ Parked' },
  { key: 'done', label: '✓ Done' },
];

export default function PillarDrilldown({ pillar, initialSubPillar = null, onBack }) {
  const { data: tasks } = useTasks();
  const { update: updateTask } = useTaskMutations();
  const { update: updatePillar } = usePillarMutations();
  const [selectedSubPillar, setSelectedSubPillar] = useState(initialSubPillar);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSubName, setEditingSubName] = useState('');
  const [renamingSubPillar, setRenamingSubPillar] = useState(null);
  const [addingSubPillar, setAddingSubPillar] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const pillarTasks = tasks.filter(t => t.pillar_id === pillar.id && !t.archived);

  // Tasks for the current view
  const viewTasks = selectedSubPillar
    ? pillarTasks.filter(t => t.sub_pillar === selectedSubPillar)
    : pillarTasks.filter(t => !t.sub_pillar); // unassigned tasks when at pillar level

  const filtered = statusFilter === 'all' ? viewTasks
    : statusFilter === 'done' ? viewTasks.filter(t => t.done)
    : viewTasks.filter(t => t.status === statusFilter && !t.done);

  const handleToggleDone = async (task, checked) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: { done: checked, done_at: checked ? new Date().toISOString() : null }
    });
  };

  const handleRenameSubPillar = async (oldName, newName) => {
    if (!newName.trim() || newName === oldName) { setRenamingSubPillar(null); return; }
    const newSubs = pillar.sub_pillars.map(s => s === oldName ? newName.trim() : s);
    await updatePillar.mutateAsync({ id: pillar.id, data: { sub_pillars: newSubs } });
    for (const t of tasks.filter(t => t.pillar_id === pillar.id && t.sub_pillar === oldName)) {
      await updateTask.mutateAsync({ id: t.id, data: { sub_pillar: newName.trim() } });
    }
    if (selectedSubPillar === oldName) setSelectedSubPillar(newName.trim());
    setRenamingSubPillar(null);
  };

  const handleAddSubPillar = async () => {
    if (!newSubName.trim()) return;
    const newSubs = [...(pillar.sub_pillars || []), newSubName.trim()];
    await updatePillar.mutateAsync({ id: pillar.id, data: { sub_pillars: newSubs } });
    setNewSubName('');
    setAddingSubPillar(false);
  };

  const subPillars = pillar.sub_pillars || [];

  // Sub-pillar task counts
  const getSubCount = (sp) => pillarTasks.filter(t => t.sub_pillar === sp && !t.done).length;
  const unassignedCount = pillarTasks.filter(t => !t.sub_pillar && !t.done).length;

  // ── SUB-PILLAR (PROJECT) VIEW ──
  if (selectedSubPillar) {
    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSubPillar(null)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setSelectedSubPillar(null)}>
            {pillar.icon} {pillar.label}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" style={{ color: pillar.color }} />
            {renamingSubPillar === selectedSubPillar ? (
              <Input
                className="h-6 w-36 text-sm font-semibold"
                defaultValue={selectedSubPillar}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubPillar(selectedSubPillar, e.target.value);
                  if (e.key === 'Escape') setRenamingSubPillar(null);
                }}
                onBlur={e => handleRenameSubPillar(selectedSubPillar, e.target.value)}
              />
            ) : (
              <h2
                className="text-xl font-semibold cursor-pointer hover:opacity-70"
                onClick={() => { setRenamingSubPillar(selectedSubPillar); setEditingSubName(selectedSubPillar); }}
                title="Click to rename"
              >
                {selectedSubPillar}
              </h2>
            )}
            <button
              onClick={() => { setRenamingSubPillar(selectedSubPillar); setEditingSubName(selectedSubPillar); }}
              className="text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Rename project"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                statusFilter === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <TaskList tasks={filtered} pillar={pillar} onTaskClick={(t) => { setEditItem({ ...t, _type: 'task' }); setEditOpen(true); }} onToggleDone={handleToggleDone} />

        <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
      </div>
    );
  }

  // ── PILLAR OVERVIEW ──
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-2xl">{pillar.icon}</span>
        <h2 className="text-xl font-semibold">{pillar.label}</h2>
      </div>

      {/* Projects (sub-pillars) as folders */}
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Projects</p>
        <div className="space-y-1">
          {subPillars.map(sp => {
            const count = getSubCount(sp);
            return (
              <div key={sp} className="flex items-center gap-2 group">
                <button
                  onClick={() => { setSelectedSubPillar(sp); setStatusFilter('all'); }}
                  className="flex items-center gap-2.5 flex-1 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <Folder className="w-4 h-4 shrink-0" style={{ color: pillar.color }} />
                  <span className="text-sm font-medium flex-1">{sp}</span>
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground font-mono">{count}</span>
                  )}
                </button>
                <button
                  onClick={() => { setRenamingSubPillar(sp); setEditingSubName(sp); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  title="Rename"
                >
                  {renamingSubPillar === sp ? (
                    <Input
                      className="h-6 w-28 text-xs"
                      defaultValue={sp}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubPillar(sp, e.target.value);
                        if (e.key === 'Escape') setRenamingSubPillar(null);
                      }}
                      onBlur={e => handleRenameSubPillar(sp, e.target.value)}
                    />
                  ) : (
                    <Pencil className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })}

          {/* Add new project */}
          {addingSubPillar ? (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                className="h-7 text-sm flex-1"
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                placeholder="Project name..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubPillar();
                  if (e.key === 'Escape') setAddingSubPillar(false);
                }}
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleAddSubPillar}>Add</Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSubPillar(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New project
            </button>
          )}
        </div>
      </div>

      {/* Unassigned tasks */}
      {unassignedCount > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Unassigned tasks</p>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  statusFilter === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <TaskList tasks={filtered} pillar={pillar} onTaskClick={(t) => { setEditItem({ ...t, _type: 'task' }); setEditOpen(true); }} onToggleDone={handleToggleDone} />
        </div>
      )}

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}

function TaskList({ tasks, pillar, onTaskClick, onToggleDone }) {
  if (tasks.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No tasks</p>;
  return (
    <div className="space-y-1">
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer group"
          onClick={() => onTaskClick(task)}
        >
          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
          <div onClick={e => e.stopPropagation()}>
            <Checkbox checked={task.done} onCheckedChange={(c) => onToggleDone(task, c)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm truncate ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
          </div>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
          {task.duration_mins && <span className="text-xs text-muted-foreground font-mono">{task.duration_mins}m</span>}
          {task.postpone_count > 0 && <span className="text-xs text-amber-500">↻{task.postpone_count}</span>}
        </div>
      ))}
    </div>
  );
}