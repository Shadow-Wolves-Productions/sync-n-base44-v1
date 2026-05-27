import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskForm from './TaskForm';
import MeetingForm from './MeetingForm';
import EventForm from './EventForm';
import ReminderForm from './ReminderForm';

export default function AddModal({ open, onOpenChange, defaultType = 'task', editItem = null }) {
  const [tab, setTab] = useState(defaultType);

  useEffect(() => {
    if (open) setTab(editItem ? (editItem._type || defaultType) : defaultType);
  }, [open, defaultType, editItem]);

  const TYPE_LABELS = { task: '📋 Task', meeting: '🤝 Meeting', event: '📅 Event', reminder: '🔔 Reminder' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? `Edit ${TYPE_LABELS[editItem._type] || ''}` : 'Add New'}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          {!editItem && (
            <TabsList className="w-full">
              <TabsTrigger value="task" className="flex-1">📋 Task</TabsTrigger>
              <TabsTrigger value="meeting" className="flex-1">🤝 Meeting</TabsTrigger>
              <TabsTrigger value="event" className="flex-1">📅 Event</TabsTrigger>
              <TabsTrigger value="reminder" className="flex-1">🔔 Reminder</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="task" forceMount className={tab !== 'task' ? 'hidden' : ''}>
            <TaskForm editItem={editItem?._type === 'task' ? editItem : undefined} onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="meeting" forceMount className={tab !== 'meeting' ? 'hidden' : ''}>
            <MeetingForm editItem={editItem?._type === 'meeting' ? editItem : undefined} onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="event" forceMount className={tab !== 'event' ? 'hidden' : ''}>
            <EventForm editItem={editItem?._type === 'event' ? editItem : undefined} onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="reminder" forceMount className={tab !== 'reminder' ? 'hidden' : ''}>
            <ReminderForm editItem={editItem?._type === 'reminder' ? editItem : undefined} onDone={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}