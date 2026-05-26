import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AddModal from '../modals/AddModal';
import ArchiveModal from '../modals/ArchiveModal';
import EnergyModal from '../modals/EnergyModal';
import IgnoredModal from '../modals/IgnoredModal';
import { useTasks, useCalendarEvents } from '@/lib/useSyncnData';
import { useScheduler } from '@/lib/useScheduler';

const SIDEBAR_MODES = ['expanded', 'collapsed', 'hidden'];

export default function AppLayout() {
  const [sidebarMode, setSidebarMode] = useState('expanded');
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

  const cycleSidebar = () => {
    setSidebarMode(prev => {
      const idx = SIDEBAR_MODES.indexOf(prev);
      return SIDEBAR_MODES[(idx + 1) % SIDEBAR_MODES.length];
    });
  };

  const handleAddClick = () => {
    setAddType('task');
    setAddOpen(true);
  };

  const handleScheduleAction = (action) => runSchedule(action);

  const handleOverflowAction = (action) => {
    if (action === 'archive') setArchiveOpen(true);
    else if (action === 'energy') setEnergyOpen(true);
    else if (action === 'ignored') setIgnoredOpen(true);
    else if (action === 'plan-tomorrow') runSchedule('plan-tomorrow');
    else if (action === 'add-recurring') { setAddType('task'); setAddOpen(true); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        onAddClick={handleAddClick}
        onScheduleAction={handleScheduleAction}
        onOverflowAction={handleOverflowAction}
        onToggleSidebar={cycleSidebar}
        archivedCount={archivedCount}
        ignoredCount={ignoredCount}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar mode={sidebarMode} />
        <main className="flex-1 overflow-y-auto pb-8 min-w-0">
          <Outlet />
        </main>
      </div>

      <AddModal open={addOpen} onOpenChange={setAddOpen} defaultType={addType} />
      <ArchiveModal open={archiveOpen} onOpenChange={setArchiveOpen} />
      <EnergyModal open={energyOpen} onOpenChange={setEnergyOpen} />
      <IgnoredModal open={ignoredOpen} onOpenChange={setIgnoredOpen} />
    </div>
  );
}