import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCalendarEvents, useCalendarEventMutations } from '@/lib/useSyncnData';
import { Eye } from 'lucide-react';

export default function IgnoredModal({ open, onOpenChange }) {
  const { data: events } = useCalendarEvents();
  const { update } = useCalendarEventMutations();

  const ignored = events.filter(e => e.ignored);

  const handleUnhide = async (event) => {
    await update.mutateAsync({ id: event.id, data: { ignored: false } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ignored Events ({ignored.length})</DialogTitle>
        </DialogHeader>
        {ignored.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No ignored events.</p>
        ) : (
          <div className="space-y-2">
            {ignored.map(event => (
              <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.raw_start}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnhide(event)}>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Unhide
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}