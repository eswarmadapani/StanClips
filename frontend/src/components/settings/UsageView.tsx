import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Icon } from '../common/Icon';

export const UsageView: React.FC = () => {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/usage')
      .then((data) => {
        setUsage(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-neutral-400 text-xs">Loading AI usage data…</div>;
  }

  const callsToday = usage?.today_calls || 0;
  const tokensToday = usage?.today_tokens || 0;
  const history = usage?.history || [];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">AI Token & Call Usage</h2>
        <p className="text-xs text-neutral-400">Tracking consumption across clip detection, titling, and scoring.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md space-y-1">
          <span className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">AI Calls Today</span>
          <div className="text-2xl font-bold text-white font-mono">{callsToday.toLocaleString()}</div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 backdrop-blur-md space-y-1">
          <span className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">Tokens Processed Today</span>
          <div className="text-2xl font-bold text-[#ccff00] font-mono">{tokensToday.toLocaleString()}</div>
        </div>
      </div>

      {/* Usage History Table */}
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-neutral-800 text-xs font-bold text-white uppercase tracking-wider">
          Recent Activity
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 font-semibold">
              <tr>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Task</th>
                <th className="p-3.5">Model</th>
                <th className="p-3.5 text-right">Tokens In</th>
                <th className="p-3.5 text-right">Tokens Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {history.length ? (
                history.map((h: any, i: number) => (
                  <tr key={i} className="hover:bg-neutral-800/20">
                    <td className="p-3.5 font-mono text-neutral-400">{h.time || '–'}</td>
                    <td className="p-3.5 font-medium text-white">{h.task || 'Clip Analysis'}</td>
                    <td className="p-3.5 text-neutral-400">{h.model || '–'}</td>
                    <td className="p-3.5 text-right font-mono">{h.tokens_in?.toLocaleString() || '–'}</td>
                    <td className="p-3.5 text-right font-mono text-[#ccff00]">{h.tokens_out?.toLocaleString() || '–'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-500">
                    No AI calls logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
