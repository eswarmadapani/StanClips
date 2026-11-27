import React, { useRef, useState, useEffect } from 'react';
import type { Job } from '../../types/studio';
import { ClipCard } from './ClipCard';
import { Icon } from '../common/Icon';

interface ClipStripProps {
  job: Job;
}

export const ClipStrip: React.FC<ClipStripProps> = ({ job }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [job.clips]);

  const handleScroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.75;
    el.scrollBy({
      left: dir === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  if (!job.clips || !job.clips.length) return null;

  return (
    <div className="relative group/strip space-y-2">
      {/* Scroll controls */}
      {(canScrollLeft || canScrollRight) && (
        <div className="flex justify-end gap-1.5 px-1">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => handleScroll('left')}
            className="w-7 h-7 rounded-full bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Previous clips"
          >
            <Icon name="chevronLeft" size={14} />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => handleScroll('right')}
            className="w-7 h-7 rounded-full bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Next clips"
          >
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}

      {/* Horizontal Strip */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {job.clips.map((clip) => (
          <div
            key={clip.id}
            className="flex-shrink-0 w-64 md:w-72"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ClipCard job={job} clip={clip} />
          </div>
        ))}
      </div>
    </div>
  );
};
