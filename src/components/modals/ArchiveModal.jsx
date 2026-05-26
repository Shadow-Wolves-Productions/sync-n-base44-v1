import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTasks, useTaskMutations, usePillars } from '@/lib/useSyncnData';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';

export default function ArchiveModal({ open, onOpenChange }) {
  const { data: tasks } = useTasks();
  const { data: pillars } = usePillars();
  const { update } = useTaskMutations();

  const archived = tasks.filter(t => t.archived);
  const getPillar = (id) => pillars.find(p => p.id === id);

  const handleRestore = async (task) => {
    await update.mutateAsync({
      id: task.id,
      data: { archived: false, archived_at: null, done: false, done_at: null }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Archive ({archived.length})</DialogTitle>
        </DialogHeader>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No archived tasks.</p>
        ) : (
          <div className="space-y-2">
            {archived.map(task => {
              const pillar = getPillar(task.pillar_id);
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pillar && `${pillar.icon} ${pillar.label}`}
                      {task.done_at && ` · Done ${format(new Date(task.done_at), 'MMM d')}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRestore(task)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}