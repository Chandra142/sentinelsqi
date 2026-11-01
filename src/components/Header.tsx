import React from 'react';
import { ShieldCheck, Activity, Cpu, Sparkles, FileText, Code2, RefreshCw } from 'lucide-react';
import { BENCHMARK_SCENARIOS } from '../data/scenarios';

interface HeaderProps {
  currentScenarioId: string;
  onSelectScenario: (id: string) => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  hasApiKey: boolean;
  onOpenReport: () => void;
  onOpenPlayground: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isAnalyzing: boolean;
  onReanalyze: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScenarioId,
  onSelectScenario,
  isAiEnabled,
  onToggleAi,
  hasApiKey,
  onOpenReport,
  onOpenPlayground,
  activeTab,
  onSelectTab,
  isAnalyzing,
  onReanalyze,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                SentinelSQI
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                v1.2 Prototype
              </span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Software Quality & Correctness Intelligence</p>
          </div>
        </div>

        {/* Center / Scenario Selector */}
        <div className="hidden md:flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Benchmark Scenario:</label>
          <select
            value={currentScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none max-w-xs transition-colors hover:border-slate-600"
          >
            {BENCHMARK_SCENARIOS.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.title}
              </option>
            ))}
            <option value="custom">⚡ Custom / Live Diff Playground</option>
          </select>
        </div>

        {/* Right Tools & Actions */}
        <div className="flex items-center gap-2.5">
          {/* AI Toggle Button */}
          <button
            onClick={onToggleAi}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isAiEnabled
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/20 hover:bg-indigo-900/90'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
            title={hasApiKey ? 'Live Google Gemini AI active' : 'Offline Cognitive Mode active (No API key set)'}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAiEnabled ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>{isAiEnabled ? 'Gemini 2.5 Active' : 'Offline AST Mode'}</span>
            <span className={`h-2 w-2 rounded-full ${isAiEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          </button>

          {/* Re-analyze Button */}
          <button
            onClick={onReanalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Re-run deep quality intelligence reasoning"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isAnalyzing ? 'Analyzing...' : 'Re-evaluate'}</span>
          </button>

          {/* Custom Playground */}
          <button
            onClick={onOpenPlayground}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/30 transition"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspect Custom Diff</span>
          </button>

          {/* Export Report */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">CI Audit Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-800/80 text-xs">
        {[
          { id: 'overview', label: 'Overview & Risk Dashboard', icon: Activity },
          { id: 'intent', label: 'Intent vs Reality', icon: Cpu },
          { id: 'blast-radius', label: 'Contextual Blast Radius', icon: ShieldCheck },
          { id: 'test-matrix', label: 'Semantic Test Adequacy', icon: Sparkles },
          { id: 'diff', label: 'Annotated Diff', icon: Code2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

