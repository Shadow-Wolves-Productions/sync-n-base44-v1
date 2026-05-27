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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit' : 'Add New'}</DialogTitle>
        </DialogHeader>
        {!editItem && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="task" className="flex-1">📋 Task</TabsTrigger>
              <TabsTrigger value="meeting" className="flex-1">🤝 Meeting</TabsTrigger>
              <TabsTrigger value="event" className="flex-1">📅 Event</TabsTrigger>
              <TabsTrigger value="reminder" className="flex-1">🔔 Reminder</TabsTrigger>
            </TabsList>
            <TabsContent value="task"><TaskForm onDone={() => onOpenChange(false)} /></TabsContent>
            <TabsContent value="meeting"><MeetingForm onDone={() => onOpenChange(false)} /></TabsContent>
            <TabsContent value="event"><EventForm onDone={() => onOpenChange(false)} /></TabsContent>
            <TabsContent value="reminder"><ReminderForm onDone={() => onOpenChange(false)} /></TabsContent>
          </Tabs>
        )}
        {editItem && editItem._type === 'task' && <TaskForm editItem={editItem} onDone={() => onOpenChange(false)} />}
        {editItem && editItem._type === 'meeting' && <MeetingForm editItem={editItem} onDone={() => onOpenChange(false)} />}
        {editItem && editItem._type === 'event' && <EventForm editItem={editItem} onDone={() => onOpenChange(false)} />}
        {editItem && editItem._type === 'reminder' && <ReminderForm editItem={editItem} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}