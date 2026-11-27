import React, { useState, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { api, send } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../common/Icon';

export const SettingsView: React.FC = () => {
  const { status, settingsTab, setSettingsTab, refreshAll } = useStudio();
  const { toast } = useToast();

  // AI Settings state
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Storage info state
  const [storageInfo, setStorageInfo] = useState<any>(null);

  // Profile / Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  // Connected Apps state
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => {
    // Load AI config
    api('/api/ai')
      .then((cfg) => {
        setAiConfig(cfg);
        if (cfg?.provider) setProvider(cfg.provider);
        if (cfg?.model) setModel(cfg.model);
      })
      .catch(() => {});

    // Load storage info
    api('/api/storage')
      .then((st) => setStorageInfo(st))
      .catch(() => {});

    // Load apps
    api('/api/apps')
      .then((a) => setApps(a || []))
      .catch(() => {});
  }, []);

  const handleTestAi = async () => {
    setIsTestingAi(true);
    try {
      const res = await send('/api/ai/test', { provider, api_key: apiKey || undefined, model: model || undefined });
      toast(res.ok ? 'AI connection verified successfully!' : res.problem || 'AI test completed', res.ok ? 'ok' : 'warn');
    } catch (e: any) {
      toast(e.message || 'AI test failed', 'bad');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);
    try {
      await send('/api/ai', {
        provider,
        api_key: apiKey || undefined,
        model: model || undefined,
      });
      toast('AI configuration saved!', 'ok');
      await refreshAll();
    } catch (e: any) {
      toast(e.message || 'Failed to save AI configuration', 'bad');
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast('New password must be at least 8 characters', 'bad');
      return;
    }
    setIsSavingPw(true);
    try {
      await send('/api/auth/password', {
        current: currentPassword,
        password: newPassword,
      });
      toast('Password changed successfully!', 'ok');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      toast(e.message || 'Failed to change password', 'bad');
    } finally {
      setIsSavingPw(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await send('/api/storage/open', {});
    } catch (e: any) {
      toast(e.message || 'Failed to open storage folder', 'bad');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Settings Navigation Tabs */}
      <nav className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl w-fit" role="tablist">
        {(['profile', 'ai', 'apps', 'security', 'storage'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={settingsTab === tab}
            onClick={() => setSettingsTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
              settingsTab === tab
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'ai' ? 'AI Key' : tab === 'apps' ? 'Connected Apps' : tab}
          </button>
        ))}
      </nav>

      {/* Tab 1: Profile */}
      {settingsTab === 'profile' && (
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Profile & Account</h2>
            <p className="text-xs text-neutral-400">View and update your local account details.</p>
          </div>

          <div className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Name</label>
              <input
                type="text"
                readOnly
                value={status?.user?.name || 'Local Owner'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Email Address</label>
              <input
                type="text"
                readOnly
                value={status?.user?.email || 'local@peakcut.app'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Configuration */}
      {settingsTab === 'ai' && (
        <form onSubmit={handleSaveAi} className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">AI Service Configuration</h2>
            <p className="text-xs text-neutral-400">
              Stan Clips uses AI to evaluate moments, write titles, and score clips. Runs with your own API key.
            </p>
          </div>

          <div className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-[#ccff00]"
              >
                <option value="gemini">Google Gemini (Recommended - fast & free tier)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="grok">xAI Grok</option>
                <option value="openrouter">OpenRouter</option>
                <option value="deepseek">DeepSeek</option>
                <option value="ollama">Ollama (Local on this machine)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">
                API Key {aiConfig?.masked_key && <span className="text-neutral-500 font-normal">({aiConfig.masked_key})</span>}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={aiConfig?.masked_key ? 'Leave blank to keep current key' : 'Enter API Key'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Model Name (Optional)</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-2.0-flash or gpt-4o-mini"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestAi}
                disabled={isTestingAi}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors cursor-pointer"
              >
                {isTestingAi ? 'Testing…' : 'Test AI Connection'}
              </button>

              <button
                type="submit"
                disabled={isSavingAi}
                className="px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#bde900] text-[#172000] font-bold transition-all shadow-sm cursor-pointer"
              >
                {isSavingAi ? 'Saving…' : 'Save AI Settings'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Connected Apps (Social OAuth) */}
      {settingsTab === 'apps' && (
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Connected Publishing Accounts</h2>
            <p className="text-xs text-neutral-400">Publish your finished vertical clips directly to your channels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube Shorts */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">YouTube Shorts</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">OAuth</span>
              </div>
              <p className="text-xs text-neutral-400">Upload clips directly as public or unlisted Shorts.</p>
              <a
                href="/oauth/youtube/start"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
              >
                <span>Connect YouTube</span>
                <span>→</span>
              </a>
            </div>

            {/* Instagram Reels */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Instagram Reels</span>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">Graph API</span>
              </div>
              <p className="text-xs text-neutral-400">Publish reels to your creator or business Instagram account.</p>
              <a
                href="/oauth/instagram/start"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
              >
                <span>Connect Instagram</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security */}
      {settingsTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Security & Password</h2>
            <p className="text-xs text-neutral-400">Change your sign-in password.</p>
          </div>

          <div className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-[#ccff00]"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPw}
              className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors cursor-pointer"
            >
              {isSavingPw ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 5: Storage */}
      {settingsTab === 'storage' && (
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Storage & Media Location</h2>
            <p className="text-xs text-neutral-400">Where videos, transcripts, and rendered clips are saved.</p>
          </div>

          <div className="space-y-3 max-w-md text-xs">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-neutral-500 font-mono text-[11px]">Storage Path:</span>
              <div className="font-mono text-neutral-200 break-all">{storageInfo?.path || './data'}</div>
            </div>

            <button
              type="button"
              onClick={handleOpenFolder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors cursor-pointer"
            >
              <Icon name="folder" size={15} />
              <span>Open in File Explorer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
