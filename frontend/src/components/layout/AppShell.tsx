import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../common/ToastContainer';
import { CreatorModal } from '../creators/CreatorModal';
import { NotificationsPop } from '../dialogs/NotificationsPop';
import { ClipDetailModal } from '../dialogs/ClipDetailModal';
import { useStudio } from '../../context/StudioContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { activeClip, closeClipModal } = useStudio();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenNewCreator={() => setCreatorModalOpen(true)}
        onToggleNotifications={() => setNotificationsOpen((prev) => !prev)}
      />

      {/* Main Reading Surface */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto min-w-0 p-4 md:p-6 lg:p-8 space-y-6">
          {children}
        </main>
      </div>

      {/* Modals & Popovers */}
      <ToastContainer />

      {creatorModalOpen && (
        <CreatorModal onClose={() => setCreatorModalOpen(false)} />
      )}

      {notificationsOpen && (
        <NotificationsPop onClose={() => setNotificationsOpen(false)} />
      )}

      {activeClip && (
        <ClipDetailModal job={activeClip.job} clip={activeClip.clip} onClose={closeClipModal} />
      )}
    </div>
  );
};
