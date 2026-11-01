import React, { useState } from 'react';
import { Play, Sparkles, AlertTriangle, Code2, RefreshCw, Key, Shield } from 'lucide-react';
import { AnalysisInput } from '../services/analyzer';

interface LiveDiffEditorProps {
  onAnalyze: (input: AnalysisInput) => void;
  isAnalyzing: boolean;
  initialTitle?: string;
  initialDescription?: string;
  initialDiff?: string;
  geminiApiKey: string;
  onSetApiKey: (key: string) => void;
}

export const LiveDiffEditor: React.FC<LiveDiffEditorProps> = ({
  onAnalyze,
  isAnalyzing,
  initialTitle = 'fix(auth): cache user role permissions in memory',
  initialDescription = 'Optimize user permissions lookup by storing in fast key-value store to avoid slow queries.',
  initialDiff = `@@ -15,4 +15,10 @@ export async function checkUserAccess(userId: string, tenantId: string) {
+  // Fast cache lookup
+  const cacheKey = \`user:perm:\${userId}\`;
+  const cached = await cache.get(cacheKey);
+  if (cached) return cached;
+  
   const user = await db.users.find({ id: userId, tenant: tenantId });
+  await cache.set(cacheKey, user.role);
   return user.role;
 }`,
  geminiApiKey,
  onSetApiKey,
}) => {
  const [prTitle, setPrTitle] = useState(initialTitle);
  const [prDescription, setPrDescription] = useState(initialDescription);
  const [rawDiff, setRawDiff] = useState(initialDiff);
  const [useLiveAi, setUseLiveAi] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze({
      prTitle,
      prDescription,
      rawDiff,
      apiKey: geminiApiKey,
      useLiveAi: useLiveAi && !!geminiApiKey,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Code2 className="h-5 w-5" />
            <h2 className="text-lg font-bold text-white">Live Diff & PR Intelligence Playground</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Input any Pull Request title, description, and Git diff snippet. SentinelSQI will analyze stated intent vs AST implementation, evaluate blast radius, and compute semantic test adequacy.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition"
          >
            <Key className="h-3.5 w-3.5 text-cyan-400" />
            <span>{geminiApiKey ? 'API Key Configured' : 'Set Gemini Key'}</span>
          </button>
        </div>
      </div>

      {/* Gemini Key Config Drawer */}
      {showKeyInput && (
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-700 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Google Gemini API Key (Optional for live LLM reasoning; offline cognitive mode works without it):
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => onSetApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
            <button
              onClick={() => setShowKeyInput(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              PR Title / Requirement Statement:
            </label>
            <input
              type="text"
              value={prTitle}
              onChange={(e) => setPrTitle(e.target.value)}
              placeholder="e.g. fix(billing): prevent double refund on webhook replay"
              className="w-full bg-slate-900 border border-slate-800 text-xs text-white px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              PR Context & Acceptance Criteria:
            </label>
            <input
              type="text"
              value={prDescription}
              onChange={(e) => setPrDescription(e.target.value)}
              placeholder="Context, tickets, or intent for this change..."
              className="w-full bg-slate-900 border border-slate-800 text-xs text-white px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Git Diff (Unified diff or patch format):
            </label>
            <span className="text-xs text-slate-500 font-mono">Supports standard unified diff format</span>
          </div>
          <textarea
            rows={12}
            value={rawDiff}
            onChange={(e) => setRawDiff(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-inner"
            placeholder="@@ -1,5 +1,9 @@ export function myCode() { ... }"
            required
          />
        </div>

        {/* Action Controls */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={useLiveAi}
                onChange={(e) => setUseLiveAi(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Enable Live Gemini AI Reasoning Engine
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Quality Intelligence Reasoning...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Sentinel Analysis</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

