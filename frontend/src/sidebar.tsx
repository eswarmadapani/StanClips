import React, { useState, useRef, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { House, Film, Radio, Zap, Settings, Plus } from "lucide-react";

export interface SidebarState {
  active: string;
  videoCount: number;
  working: number;
  admin: boolean;
  creators: { id: string; name: string; href: string; badge?: string }[];
}

export function FloatingSidebar({
  state,
  go,
}: {
  state: SidebarState;
  go: (view: string, tab?: string) => void;
}) {
  const [creatorsMenuOpen, setCreatorsMenuOpen] = useState(false);
  const creatorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (creatorsRef.current && !creatorsRef.current.contains(e.target as Node)) {
        setCreatorsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isHomeActive = state.active === "overview";
  const isVideosActive = state.active === "library";
  const isCreatorsActive = state.active.startsWith("c:");
  const isAiActive = state.active === "usage";
  const isSettingsActive = state.active === "settings";

  return (
    <nav className="floating-sidebar" role="navigation" aria-label="Main navigation">
      <a href="/app" className="stan-brand-float" data-act="go" data-v="overview" aria-label="Stan Clips Home">
        <img src="/brand/stan-navbar-mark.jpg" alt="" className="stan-brand-icon" />
        <span className="stan-brand-text">Stan Clips</span>
      </a>
      <div className="nav-destinations">
      {/* 1. Home */}
      <div className="relative group flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setCreatorsMenuOpen(false);
            go("overview");
          }}
          className={`floating-nav-btn ${isHomeActive ? "active" : ""}`}
          aria-label="Home"
          aria-current={isHomeActive ? "page" : undefined}
        >
          <House size={24} strokeWidth={2} /><span className="nav-caption">Home</span>
        </button>
        <span className="floating-tooltip">Home</span>
      </div>

      {/* 2. All Videos */}
      <div className="relative group flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setCreatorsMenuOpen(false);
            go("library");
          }}
          className={`floating-nav-btn ${isVideosActive ? "active" : ""}`}
          aria-label="All videos"
          aria-current={isVideosActive ? "page" : undefined}
        >
          <Film size={24} strokeWidth={2} /><span className="nav-caption">All videos</span>
          {state.working > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
          )}
        </button>
        <span className="floating-tooltip">
          All videos {state.videoCount ? `(${state.videoCount})` : ""}
        </span>
      </div>

      {/* 3. Creators */}
      <div className="relative group flex items-center justify-center" ref={creatorsRef}>
        <button
          type="button"
          onClick={() => {
            if (state.creators.length > 0) {
              if (isCreatorsActive) {
                setCreatorsMenuOpen((prev) => !prev);
              } else {
                go(state.creators[0].id);
              }
            } else {
              if (typeof (window as any).openNewCreator === "function") {
                (window as any).openNewCreator();
              } else {
                const btn = document.querySelector<HTMLButtonElement>('[data-act="newcreator"]');
                if (btn) btn.click();
                else {
                  const dlg = document.querySelector<HTMLDialogElement>("#formdlg");
                  if (dlg) (dlg as any).showModal?.();
                }
              }
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setCreatorsMenuOpen((prev) => !prev);
          }}
          className={`floating-nav-btn ${isCreatorsActive ? "active" : ""}`}
          aria-label="Creators"
          aria-current={isCreatorsActive ? "page" : undefined}
        >
          <Radio size={24} strokeWidth={2} /><span className="nav-caption">Creators</span>
          {state.creators.some((c) => c.badge) && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
        <span className="floating-tooltip">
          Creators {state.creators.length ? `(${state.creators.length})` : ""}
        </span>

        {/* Creators Flyout Popover */}
        {creatorsMenuOpen && (
          <div className="floating-flyout-menu animate-fadeIn">
            <div className="px-3.5 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
              <span>Creators</span>
              <button
                type="button"
                data-act="newcreator"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatorsMenuOpen(false);
                  if (typeof (window as any).openNewCreator === "function") {
                    (window as any).openNewCreator();
                  } else {
                    const btn = document.querySelector<HTMLButtonElement>('[data-act="newcreator"]');
                    if (btn) btn.click();
                  }
                }}
                className="text-[#ccff00] hover:underline flex items-center gap-1 text-xs cursor-pointer"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1.5">
              {state.creators.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCreatorsMenuOpen(false);
                    go(c.id);
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-3 text-xs hover:bg-white/10 transition-colors cursor-pointer ${
                    state.active === c.id ? "text-[#ccff00] font-semibold" : "text-neutral-200"
                  }`}
                >
                  <span className="truncate">@{c.name}</span>
                  {c.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
                      {c.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. AI Models */}
      <div className="relative group flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setCreatorsMenuOpen(false);
            go("usage");
          }}
          className={`floating-nav-btn ${isAiActive ? "active" : ""}`}
          aria-label="AI Models"
          aria-current={isAiActive ? "page" : undefined}
        >
          <Zap size={20} strokeWidth={2} /><span className="nav-caption">AI Models</span>
        </button>
        <span className="floating-tooltip">AI Models</span>
      </div>
      </div>

      {/* 5. Settings (Rightmost side) */}
      <div className="nav-end">
        <div className="relative group flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setCreatorsMenuOpen(false);
              go("settings");
            }}
            className={`floating-nav-btn ${isSettingsActive ? "active" : ""}`}
            aria-label="Settings"
            aria-current={isSettingsActive ? "page" : undefined}
          >
            <Settings size={20} strokeWidth={2} /><span className="nav-caption">Settings</span>
          </button>
          <span className="floating-tooltip">Settings</span>
        </div>
      </div>
    </nav>
  );
}

let root: Root | undefined;
export function renderSidebar(
  host: HTMLElement,
  state: SidebarState,
  go: (view: string, tab?: string) => void
) {
  root ??= createRoot(host);
  root.render(<FloatingSidebar state={state} go={go} />);
}
