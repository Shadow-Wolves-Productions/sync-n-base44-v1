import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks, useTaskMutations, useCalendarEvents, useReminders, usePillars } from '@/lib/useSyncnData';
import { PRIORITY_COLORS } from '@/lib/syncn';
import { ChevronLeft, Calendar, Bell } from 'lucide-react';
import AddModal from '@/components/modals/AddModal';

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'tasks', label: '📋 Tasks' },
  { key: 'events', label: '📅 Events & Meetings' },
  { key: 'reminders', label: '🔔 Reminders' },
];

export default function AllItemsView({ onBack }) {
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: reminders } = useReminders();
  const { data: pillars } = usePillars();
  const { update: updateTask } = useTaskMutations();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const activeTasks = tasks.filter(t => !t.archived);

  const filteredTasks = statusFilter === 'done'
    ? activeTasks.filter(t => t.done)
    : statusFilter === 'all'
      ? activeTasks.filter(t => !t.done)
      : activeTasks.filter(t => t.status === statusFilter && !t.done);

  const filteredEvents = events.filter(e => !e.ignored);
  const filteredReminders = reminders;

  const getPillar = (id) => pillars.find(p => p.id === id);

  const handleToggleDone = async (task, checked) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: { done: checked, done_at: checked ? new Date().toISOString() : null }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold">All Items</h2>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {TYPE_FILTERS.map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              typeFilter === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task status filter (only when showing tasks) */}
      {(typeFilter === 'all' || typeFilter === 'tasks') && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {[
            { key: 'all', label: 'Active' },
            { key: 'active', label: '🔥 Active' },
            { key: 'upcoming', label: '🕐 Upcoming' },
            { key: 'parked', label: '❄️ Parked' },
            { key: 'done', label: '✓ Done' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                statusFilter === f.key ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* Tasks */}
        {(typeFilter === 'all' || typeFilter === 'tasks') && filteredTasks.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Tasks ({filteredTasks.length})</p>
            <div className="space-y-1">
              {filteredTasks.map(task => {
                const pillar = getPillar(task.pillar_id);
                return (
                  <div key={task.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                    onClick={() => { setEditItem({ ...task, _type: 'task' }); setEditOpen(true); }}>
                    {pillar && <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />}
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox checked={task.done} onCheckedChange={c => handleToggleDone(task, c)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${task.done ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      {pillar && <p className="text-[10px] text-muted-foreground">{pillar.icon} {pillar.label}{task.sub_pillar ? ` / ${task.sub_pillar}` : ''}</p>}
                    </div>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                    {task.duration_mins && <span className="text-xs text-muted-foreground font-mono">{task.duration_mins}m</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events & Meetings */}
        {(typeFilter === 'all' || typeFilter === 'events') && filteredEvents.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Events & Meetings ({filteredEvents.length})</p>
            <div className="space-y-1">
              {filteredEvents.map(ev => {
                const pillar = getPillar(ev.pillar_id);
                return (
                  <div key={ev.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => { setEditItem({ ...ev, _type: ev.attendees !== undefined ? 'meeting' : 'event' }); setEditOpen(true); }}>
                    {pillar && <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />}
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-[#00b4d8]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{ev.title}</p>
                      {pillar && <p className="text-[10px] text-muted-foreground">{pillar.icon} {pillar.label}</p>}
                    </div>
                    {ev.duration_mins && <span className="text-xs text-muted-foreground font-mono">{ev.duration_mins}m</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reminders */}
        {(typeFilter === 'all' || typeFilter === 'reminders') && filteredReminders.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Reminders ({filteredReminders.length})</p>
            <div className="space-y-1">
              {filteredReminders.map(r => {
                const pillar = getPillar(r.pillar_id);
                return (
                  <div key={r.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => { setEditItem({ ...r, _type: 'reminder' }); setEditOpen(true); }}>
                    {pillar && <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />}
                    <Bell className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.title}</p>
                      {pillar && <p className="text-[10px] text-muted-foreground">{pillar.icon} {pillar.label}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {typeFilter === 'tasks' && filteredTasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks found</p>
        )}
        {typeFilter === 'events' && filteredEvents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No events or meetings</p>
        )}
        {typeFilter === 'reminders' && filteredReminders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No reminders</p>
        )}
      </div>

      <AddModal open={editOpen} onOpenChange={setEditOpen} editItem={editItem} />
    </div>
  );
}