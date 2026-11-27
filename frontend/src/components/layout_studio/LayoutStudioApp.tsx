import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, send } from '../../api/client';
import { Icon } from '../common/Icon';
import { ToastContainer } from '../common/ToastContainer';
import { useToast } from '../../context/ToastContext';

export const LayoutStudioApp: React.FC = () => {
  const { toast } = useToast();

  const pathParts = window.location.pathname.split('/');
  const isDraft = window.location.pathname.includes('/draft');
  const jobId = isDraft ? '' : pathParts[pathParts.indexOf('layout-studio') + 1] || '';

  const [title, setTitle] = useState('Loading video…');
  const [srcW, setSrcW] = useState(1280);
  const [srcH, setSrcH] = useState(720);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<'facecam' | 'gameplay'>('facecam');
  const [activeTab, setActiveTab] = useState<'layers' | 'presets' | 'style'>('layers');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showHook, setShowHook] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [activePreset, setActivePreset] = useState('classic_split');

  // Layout configuration state
  const [layout, setLayout] = useState<any>({
    preset: 'classic_split',
    regions: {
      facecam: { x: 0.05, y: 0.1, w: 0.35, h: 0.4 },
      gameplay: { x: 0, y: 0, w: 1, h: 1 },
    },
    layers: [
      { id: 'gameplay', region: 'gameplay', x: 0, y: 0.35, w: 1, h: 0.65 },
      { id: 'facecam', region: 'facecam', x: 0, y: 0, w: 1, h: 0.35, border: 0, shape: 'rectangle' },
    ],
    background: { type: 'color', value: '#000000' },
    hook: { enabled: true, y: 0.37 },
    captions: { enabled: true, y: 0.8 },
    quality: 720,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceViewportRef = useRef<HTMLDivElement>(null);

  // Load layout data from server
  useEffect(() => {
    const endpoint = isDraft ? '/api/layout-draft' : `/api/layout-studio/${jobId}`;
    api(endpoint)
      .then((data) => {
        setTitle(data.title || 'Draft Clip Layout');
        setSrcW(data.width || 1280);
        setSrcH(data.height || 720);
        setDuration(data.duration || 60);

        // Check for local stored layout draft
        let initLayout = data.layout;
        try {
          const raw = localStorage.getItem('peakcut_active_draft');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.layout) initLayout = parsed.layout;
          }
        } catch {}

        if (initLayout) {
          setLayout(initLayout);
          if (initLayout.preset) setActivePreset(initLayout.preset);
        }

        // Set video source
        if (videoRef.current) {
          videoRef.current.src = isDraft ? '/api/layout-draft/frame' : `/api/layout-studio/${jobId}/source`;
          videoRef.current.load();
        }
      })
      .catch((e) => {
        toast('Could not load video layout data', 'bad');
      });
  }, [isDraft, jobId]);

  // Video loaded metadata: seek to middle frame
  const onVideoLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setSrcW(v.videoWidth || srcW);
    setSrcH(v.videoHeight || srcH);
    const dur = v.duration || duration || 0;
    if (dur > 0) {
      v.currentTime = dur / 2.0; // Always middle frame!
    }
  };

  // 9:16 Live Canvas Compositor Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const cw = canvas.width;
      const ch = canvas.height;

      // 1. Draw Background
      const bg = layout.background || { type: 'color', value: '#000000' };
      if (bg.type === 'blur' && video.readyState >= 2) {
        ctx.save();
        ctx.filter = 'blur(16px) brightness(0.85)';
        ctx.drawImage(video, 0, 0, cw, ch);
        ctx.restore();
      } else {
        ctx.fillStyle = bg.value || '#000000';
        ctx.fillRect(0, 0, cw, ch);
      }

      // 2. Draw Layers
      if (video.readyState >= 2) {
        const vW = video.videoWidth || srcW;
        const vH = video.videoHeight || srcH;

        const layers = layout.layers || [];
        layers.forEach((lyr: any) => {
          const reg = layout.regions[lyr.region || lyr.id];
          if (!reg) return;

          const sx = reg.x * vW;
          const sy = reg.y * vH;
          const sw = reg.w * vW;
          const sh = reg.h * vH;

          const dx = lyr.x * cw;
          const dy = lyr.y * ch;
          const dw = lyr.w * cw;
          const dh = lyr.h * ch;

          ctx.save();

          if (lyr.shape === 'circle') {
            const cx = dx + dw / 2;
            const cy = dy + dh / 2;
            const r = Math.min(dw, dh) / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();
          } else if (lyr.radius && lyr.radius > 0) {
            const r = lyr.radius * (cw / 360);
            ctx.beginPath();
            ctx.roundRect(dx, dy, dw, dh, r);
            ctx.clip();
          }

          const scale = Math.max(dw / sw, dh / sh);
          const width = dw / scale;
          const height = dh / scale;
          ctx.drawImage(
            video,
            sx + (sw - width) / 2,
            sy + (sh - height) / 2,
            width,
            height,
            dx,
            dy,
            dw,
            dh
          );

          if (lyr.border && lyr.border > 0) {
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = lyr.borderColor || '#00FF88';
            ctx.lineWidth = lyr.border * (cw / 360);
            if (lyr.shape === 'circle') {
              const cx = dx + dw / 2;
              const cy = dy + dh / 2;
              const r = Math.min(dw, dh) / 2;
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              ctx.strokeRect(dx, dy, dw, dh);
            }
          }

          ctx.restore();
        });
      }

      // 3. Draw Hook text overlay
      if (showHook && layout.hook?.enabled !== false) {
        const hy = (layout.hook?.y ?? 0.37) * ch;
        ctx.save();
        const hookText = 'WAIT FOR IT';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(hookText).width;
        ctx.fillStyle = '#000';
        ctx.fillRect(cw / 2 - tw / 2 - 16, hy - 24, tw + 32, 48);
        ctx.fillStyle = '#fff';
        ctx.fillText(hookText, cw / 2, hy);
        ctx.restore();
      }

      // 4. Draw Caption overlay preview
      if (showCaptions && layout.captions?.enabled !== false) {
        const cy = (layout.captions?.y ?? 0.8) * ch;
        ctx.save();
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.strokeText('THIS IS INSANE!', cw / 2, cy);
        ctx.fillStyle = '#ccff00';
        ctx.fillText('THIS IS INSANE!', cw / 2, cy);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [layout, showHook, showCaptions, srcW, srcH]);

  // Presets switcher
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    setLayout((prev: any) => {
      const next = structuredClone(prev);
      next.preset = presetName;

      if (presetName === 'classic_split') {
        next.layers = [
          { id: 'gameplay', region: 'gameplay', x: 0, y: 0.35, w: 1, h: 0.65 },
          { id: 'facecam', region: 'facecam', x: 0, y: 0, w: 1, h: 0.35, border: 0, shape: 'rectangle' },
        ];
      } else if (presetName === 'reverse_split') {
        next.layers = [
          { id: 'facecam', region: 'facecam', x: 0, y: 0.65, w: 1, h: 0.35, border: 0, shape: 'rectangle' },
          { id: 'gameplay', region: 'gameplay', x: 0, y: 0, w: 1, h: 0.65 },
        ];
      } else if (presetName === 'small_facecam') {
        next.layers = [
          { id: 'gameplay', region: 'gameplay', x: 0, y: 0, w: 1, h: 1 },
          { id: 'facecam', region: 'facecam', x: 0.05, y: 0.05, w: 0.4, h: 0.25, border: 2, borderColor: '#00FF88', shape: 'rectangle' },
        ];
      } else if (presetName === 'circle_facecam') {
        next.layers = [
          { id: 'gameplay', region: 'gameplay', x: 0, y: 0, w: 1, h: 1 },
          { id: 'facecam', region: 'facecam', x: 0.05, y: 0.05, w: 0.35, h: 0.35, border: 3, borderColor: '#ccff00', shape: 'circle' },
        ];
      } else if (presetName === 'freestyle') {
        next.layers = [
          { id: 'gameplay', region: 'gameplay', x: 0, y: 0, w: 1, h: 1 },
        ];
      }
      return next;
    });
  };

  // Nudge controls
  const nudge = (dx: number, dy: number) => {
    setLayout((prev: any) => {
      const next = structuredClone(prev);
      const reg = next.regions[selectedRegion];
      if (reg) {
        reg.x = Math.max(0, Math.min(1 - reg.w, reg.x + dx * 0.01));
        reg.y = Math.max(0, Math.min(1 - reg.h, reg.y + dy * 0.01));
      }
      return next;
    });
  };

  // Save / Use this layout
  const handleSave = async () => {
    try {
      localStorage.setItem('peakcut_active_draft', JSON.stringify({ layout }));
      if (isDraft) {
        toast('Layout saved! Returning to dashboard…', 'ok');
        setTimeout(() => {
          window.location.href = '/app';
        }, 800);
      } else {
        await send(`/api/layout-studio/${jobId}`, layout);
        toast('Layout saved successfully!', 'ok');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to save layout', 'bad');
    }
  };

  const handleGenerateClips = async () => {
    try {
      await send(`/api/layout-studio/${jobId}/generate`, layout);
      toast('Generating clips with custom layout…', 'ok');
      setTimeout(() => {
        window.location.href = '/app/videos';
      }, 800);
    } catch (e: any) {
      toast(e.message || 'Failed to generate clips', 'bad');
    }
  };

  const curRegion = layout.regions?.[selectedRegion] || { x: 0, y: 0, w: 0.5, h: 0.5 };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111512] text-neutral-200 select-none font-sans">
      <ToastContainer />

      {/* Top Bar */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md z-40 gap-4">
        <div className="flex items-center gap-3 min-w-[200px]">
          <a
            href="/app"
            onClick={(e) => {
              if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
                e.preventDefault();
                window.history.back();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            ← Back
          </a>
          <span className="text-xs font-bold text-white truncate max-w-xs">{title}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-lime-400/10 text-[#ccff00] font-semibold">
            {srcW}x{srcH}
          </span>
        </div>

        {/* Preset switcher pills */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'classic_split', label: 'Classic Split (35/65)' },
            { id: 'reverse_split', label: 'Reverse Split (65/35)' },
            { id: 'small_facecam', label: 'Small Facecam (PiP)' },
            { id: 'circle_facecam', label: 'Circle Facecam' },
            { id: 'freestyle', label: 'Freestyle' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                activePreset === p.id
                  ? 'bg-neutral-800 border-[#ccff00] text-white font-bold'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Action Button: "Use this layout" (Draft) or "Generate Clips" */}
        <div className="flex items-center gap-2">
          {isDraft ? (
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-[#172000] text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>Use this layout</span>
              <span>✓</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save Layout
              </button>
              <button
                onClick={handleGenerateClips}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-[#172000] text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Icon name="scissors" size={14} />
                <span>Generate Clips</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden gap-1 bg-neutral-950">
        {/* Column 1: Source Video & Interactive Crop Boxes (5 cols) */}
        <div className="md:col-span-5 flex flex-col bg-[#141815] border-r border-neutral-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Source Video & Manual Crop</span>
            <span className="text-[11px] text-neutral-500 font-normal">Middle frame selected (50%)</span>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black p-4 relative overflow-hidden">
            <div ref={sourceViewportRef} className="relative inline-block max-w-full max-h-full rounded shadow-2xl overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                loop
                onLoadedMetadata={onVideoLoadedMetadata}
                className="max-h-[calc(100vh-220px)] w-auto object-contain block"
              />

              {/* Crop box representation */}
              <div
                className={`absolute border-2 transition-all cursor-move ${
                  selectedRegion === 'facecam'
                    ? 'border-emerald-400 bg-emerald-400/20'
                    : 'border-sky-400 bg-sky-400/20'
                }`}
                style={{
                  left: `${curRegion.x * 100}%`,
                  top: `${curRegion.y * 100}%`,
                  width: `${curRegion.w * 100}%`,
                  height: `${curRegion.h * 100}%`,
                }}
              >
                <span className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold bg-black text-white capitalize">
                  {selectedRegion}
                </span>
              </div>
            </div>
          </div>

          {/* Region Tabs & Nudge Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-t border-neutral-800 text-xs">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRegion('facecam')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  selectedRegion === 'facecam'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                Facecam Crop
              </button>
              <button
                onClick={() => setSelectedRegion('gameplay')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  selectedRegion === 'gameplay'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                Gameplay Crop
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => nudge(-1, 0)} className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center font-bold">←</button>
              <button onClick={() => nudge(0, -1)} className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center font-bold">↑</button>
              <button onClick={() => nudge(0, 1)} className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center font-bold">↓</button>
              <button onClick={() => nudge(1, 0)} className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center font-bold">→</button>
            </div>
          </div>
        </div>

        {/* Column 2: 9:16 Vertical Live Preview Canvas (4 cols) */}
        <div className="md:col-span-4 flex flex-col bg-[#0f1310] border-r border-neutral-800 items-center justify-center p-4 relative">
          <div className="flex items-center justify-between w-full px-2 pb-3 text-xs font-bold text-neutral-400 uppercase tracking-wider">
            <span>Vertical 9:16 Canvas Preview</span>
            <span className="text-[#ccff00] text-[10px]">Live 30fps</span>
          </div>

          <div className="relative w-[280px] h-[497px] rounded-xl overflow-hidden shadow-2xl bg-black border border-neutral-700">
            <canvas ref={canvasRef} width={720} height={1280} className="w-full h-full block" />

            {/* Safe zones overlay */}
            {showSafeZones && (
              <div className="absolute inset-0 pointer-events-none border border-red-500/50 flex flex-col justify-between p-2 text-[10px] text-red-400 font-mono">
                <div className="bg-red-500/10 p-1 border-b border-red-500/40">Safe Zone Top (14%)</div>
                <div className="bg-red-500/10 p-1 border-t border-red-500/40">Safe Zone Bottom (26%)</div>
              </div>
            )}
          </div>

          {/* Canvas Preview Toggles */}
          <div className="flex items-center gap-4 mt-4 px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showSafeZones}
                onChange={(e) => setShowSafeZones(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-700 text-[#ccff00] focus:ring-0"
              />
              <span className="text-neutral-400">Safe Zones</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showHook}
                onChange={(e) => setShowHook(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-700 text-[#ccff00] focus:ring-0"
              />
              <span className="text-neutral-400">Hook</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showCaptions}
                onChange={(e) => setShowCaptions(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-700 text-[#ccff00] focus:ring-0"
              />
              <span className="text-neutral-400">Captions</span>
            </label>
          </div>
        </div>

        {/* Column 3: Inspector Settings Panel (3 cols) */}
        <div className="md:col-span-3 flex flex-col bg-[#141815] overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-neutral-800 bg-neutral-900">
            {(['layers', 'presets', 'style'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'text-[#ccff00] border-b-2 border-[#ccff00] bg-neutral-800/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-5 text-xs">
            {activeTab === 'layers' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Active Layer</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-[#ccff00]"
                  >
                    <option value="facecam">Facecam</option>
                    <option value="gameplay">Gameplay</option>
                  </select>
                </div>

                {/* Sliders for active layer coordinates */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <span className="block text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                    Layer Position & Dimensions
                  </span>
                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1">
                      <span>Width (W%)</span>
                      <span className="font-mono text-white">{Math.round(curRegion.w * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(curRegion.w * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100;
                        setLayout((prev: any) => {
                          const next = structuredClone(prev);
                          if (next.regions[selectedRegion]) next.regions[selectedRegion].w = val;
                          return next;
                        });
                      }}
                      className="w-full accent-[#ccff00] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1">
                      <span>Height (H%)</span>
                      <span className="font-mono text-white">{Math.round(curRegion.h * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.round(curRegion.h * 100)}
                      onChange={(e) => {
                        const val = Number(e.target.value) / 100;
                        setLayout((prev: any) => {
                          const next = structuredClone(prev);
                          if (next.regions[selectedRegion]) next.regions[selectedRegion].h = val;
                          return next;
                        });
                      }}
                      className="w-full accent-[#ccff00] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div className="space-y-3">
                <span className="block text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                  Layout Presets
                </span>
                {[
                  { id: 'classic_split', label: 'Classic Split (35/65)' },
                  { id: 'reverse_split', label: 'Reverse Split (65/35)' },
                  { id: 'small_facecam', label: 'Small Facecam (PiP)' },
                  { id: 'circle_facecam', label: 'Circle Facecam' },
                  { id: 'freestyle', label: 'Freestyle' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id)}
                    className="w-full text-left p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'style' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Canvas Background</label>
                  <select
                    value={layout.background?.type || 'color'}
                    onChange={(e) =>
                      setLayout((prev: any) => {
                        const next = structuredClone(prev);
                        next.background = { type: e.target.value, value: '#000000' };
                        return next;
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value="color">Solid Black</option>
                    <option value="blur">Blurred Source Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Render Resolution</label>
                  <select
                    value={layout.quality || 720}
                    onChange={(e) =>
                      setLayout((prev: any) => ({ ...prev, quality: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none"
                  >
                    <option value={720}>720 x 1280 (Fast)</option>
                    <option value={1080}>1080 x 1920 (Crisp HD)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
