import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePillarMutations, useTasks } from '@/lib/useSyncnData';
import { EMOJI_OPTIONS, COLOR_PRESETS } from '@/lib/syncn';
import { Trash2, X } from 'lucide-react';

export default function PillarEditModal({ open, onOpenChange, pillar }) {
  const { update, remove } = usePillarMutations();
  const { data: tasks } = useTasks();
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [subPillars, setSubPillars] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (pillar) {
      setLabel(pillar.label);
      setIcon(pillar.icon);
      setColor(pillar.color);
      setSubPillars(pillar.sub_pillars || []);
    }
  }, [pillar]);

  if (!pillar) return null;

  const activeTasks = tasks.filter(t => t.pillar_id === pillar.id && !t.archived && !t.done);

  const handleSave = async () => {
    await update.mutateAsync({ id: pillar.id, data: { label, icon, color, sub_pillars: subPillars } });
    onOpenChange(false);
  };

  const handleDeleteSubPillar = (idx) => {
    setSubPillars(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await remove.mutateAsync(pillar.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Pillar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`w-9 h-9 text-lg rounded-md border transition-colors ${
                    icon === e ? 'bg-primary/20 border-primary' : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-colors ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-20 mt-1" />
          </div>

          {subPillars.length > 0 && (
            <div className="space-y-1.5">
              <Label>Sub-pillars</Label>
              <div className="space-y-1">
                {subPillars.map((sp, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                    <span>{sp}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubPillar(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" className={confirmDelete ? "text-white bg-destructive hover:bg-destructive/90" : "text-destructive"} onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              {confirmDelete ? `Yes, delete (${activeTasks.length} tasks)` : 'Delete'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}