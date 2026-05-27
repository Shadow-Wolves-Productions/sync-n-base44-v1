import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePillars, usePillarMutations, useTasks } from '@/lib/useSyncnData';
import PillarCard from '@/components/lifemap/PillarCard';
import PillarEditModal from '@/components/lifemap/PillarEditModal';
import PillarDrilldown from '@/components/lifemap/PillarDrilldown';
import { Plus } from 'lucide-react';

export default function LifeMap() {
  const { data: pillars } = usePillars();
  const { data: tasks } = useTasks();
  const { create } = usePillarMutations();
  const location = useLocation();
  const [selectedPillarId, setSelectedPillarId] = useState(null);
  const [selectedSubPillar, setSelectedSubPillar] = useState(null);
  const [editPillar, setEditPillar] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // Handle navigation from sidebar (?pillar=xxx&sub=yyy)
  // Re-run whenever the full search string changes (including same-page navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pillarParam = params.get('pillar');
    const subParam = params.get('sub');
    if (pillarParam) {
      setSelectedPillarId(pillarParam);
      setSelectedSubPillar(subParam ? decodeURIComponent(subParam) : null);
    } else {
      setSelectedPillarId(null);
      setSelectedSubPillar(null);
    }
  }, [location.search]);

  const handleAddPillar = async () => {
    const order = pillars.length;
    await create.mutateAsync({ label: 'New Pillar', icon: '⚡', color: '#6b7280', sub_pillars: [], order });
  };

  if (selectedPillarId) {
    const pillar = pillars.find(p => p.id === selectedPillarId);
    if (!pillar) { setSelectedPillarId(null); return null; }
    return (
      <div className="max-w-[720px] mx-auto px-4 pt-6">
        <PillarDrilldown
          pillar={pillar}
          initialSubPillar={selectedSubPillar}
          onBack={() => { setSelectedPillarId(null); setSelectedSubPillar(null); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-semibold mb-6">Life Map</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pillars.map(pillar => (
          <PillarCard
            key={pillar.id}
            pillar={pillar}
            tasks={tasks}
            onClick={() => { setSelectedPillarId(pillar.id); setSelectedSubPillar(null); }}
            onEdit={() => { setEditPillar(pillar); setEditOpen(true); }}
          />
        ))}
        <button
          onClick={handleAddPillar}
          className="border-2 border-dashed border-border/50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">New Pillar</span>
        </button>
      </div>
      <PillarEditModal open={editOpen} onOpenChange={setEditOpen} pillar={editPillar} />
    </div>
  );
}