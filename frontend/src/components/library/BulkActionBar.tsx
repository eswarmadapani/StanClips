import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { Icon } from '../common/Icon';

export const BulkActionBar: React.FC = () => {
  const { selectedIds, clearSelect, deleteSelected, downloadSelectedZip } = useStudio();

  if (!selectedIds.size) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-full bg-neutral-900/95 border border-neutral-700/80 text-white shadow-2xl backdrop-blur-xl animate-fadeIn">
      <span className="text-xs font-bold text-neutral-300">
        {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
      </span>

      <div className="h-4 w-[1px] bg-neutral-700" />

      <button
        type="button"
        onClick={downloadSelectedZip}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
      >
        <Icon name="down" size={13} />
        <span>Download .zip</span>
      </button>

      <button
        type="button"
        onClick={deleteSelected}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/40 text-xs font-semibold transition-colors cursor-pointer"
      >
        <Icon name="trash" size={13} />
        <span>Delete</span>
      </button>

      <button
        type="button"
        onClick={clearSelect}
        className="text-xs text-neutral-400 hover:text-white px-1.5 transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
};
