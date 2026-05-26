import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import AddModal from '../modals/AddModal';
import ArchiveModal from '../modals/ArchiveModal';
import EnergyModal from '../modals/EnergyModal';
import IgnoredModal from '../modals/IgnoredModal';
import { useTasks, useCalendarEvents } from '@/lib/useSyncnData';
import { useScheduler } from '@/lib/useScheduler';

export default function AppLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState('task');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [ignoredOpen, setIgnoredOpen] = useState(false);

  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { runSchedule } = useScheduler();

  const archivedCount = tasks.filter(t => t.archived).length;
  const ignoredCount = events.filter(e => e.ignored).length;

  const handleAddClick = () => {
    setAddType('task');
    setAddOpen(true);
  };

  const handleScheduleAction = (action) => {
    runSchedule(action);
  };

  const handleOverflowAction = (action) => {
    if (action === 'archive') setArchiveOpen(true);
    else if (action === 'energy') setEnergyOpen(true);
    else if (action === 'ignored') setIgnoredOpen(true);
    else if (action === 'plan-tomorrow') runSchedule('plan-tomorrow');
    else if (action === 'add-recurring') { setAddType('task'); setAddOpen(true); }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        onAddClick={handleAddClick}
        onScheduleAction={handleScheduleAction}
        onOverflowAction={handleOverflowAction}
        archivedCount={archivedCount}
        ignoredCount={ignoredCount}
      />
      <main className="pb-8">
        <Outlet />
      </main>

      <AddModal open={addOpen} onOpenChange={setAddOpen} defaultType={addType} />
      <ArchiveModal open={archiveOpen} onOpenChange={setArchiveOpen} />
      <EnergyModal open={energyOpen} onOpenChange={setEnergyOpen} />
      <IgnoredModal open={ignoredOpen} onOpenChange={setIgnoredOpen} />
    </div>
  );
}