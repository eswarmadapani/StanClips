import React from 'react';
import { useStudio } from './context/StudioContext';
import { AppShell } from './components/layout/AppShell';
import { IntakeCard } from './components/intake/IntakeCard';
import { VideoGroup } from './components/library/VideoGroup';
import { BulkActionBar } from './components/library/BulkActionBar';
import { SettingsView } from './components/settings/SettingsView';
import { UsageView } from './components/settings/UsageView';
import { CreatorDetail } from './components/creators/CreatorDetail';

export const App: React.FC = () => {
  const { view, jobs, creators } = useStudio();

  const isCreator = view.startsWith('c:');
  const activeCreator = isCreator ? creators.find((c) => `c:${c.id}` === view) : null;

  return (
    <AppShell>
      {/* Home / Overview View */}
      {view === 'overview' && (
        <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-6">
          <div className="text-center space-y-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Find the moment worth replaying.
            </h1>
            <p className="text-sm text-neutral-400 max-w-lg mx-auto">
              Paste a link or drop in videos. You get captioned shorts back.
            </p>
          </div>
          {/* Intake Card for creating clips */}
          <IntakeCard />
        </div>
      )}

      {/* Library / All Videos View */}
      {view === 'library' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <IntakeCard />
          <div className="space-y-6">
            {!jobs.length ? (
              <div className="p-12 text-center text-xs text-neutral-500">No videos in library.</div>
            ) : (
              jobs.map((job) => <VideoGroup key={job.id} job={job} />)
            )}
          </div>
        </div>
      )}

      {/* Creator Detail View */}
      {isCreator && activeCreator && (
        <div className="max-w-7xl mx-auto">
          <CreatorDetail creator={activeCreator} />
        </div>
      )}

      {/* Settings View */}
      {view === 'settings' && (
        <div className="max-w-7xl mx-auto">
          <SettingsView />
        </div>
      )}

      {/* Usage View */}
      {view === 'usage' && (
        <div className="max-w-7xl mx-auto">
          <UsageView />
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar />
    </AppShell>
  );
};
