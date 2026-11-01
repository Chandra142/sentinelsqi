import React from 'react';
import { Target, AlertOctagon, CheckCircle2, GitCommit, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { SQIQualityReport } from '../types/sqi';

interface IntentAnalysisViewProps {
  report: SQIQualityReport;
}

export const IntentAnalysisView: React.FC<IntentAnalysisViewProps> = ({ report }) => {
  const { intentPillar } = report;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
          <Target className="h-5 w-5" />
          <h2 className="text-lg font-bold text-white">Intent Extraction & Semantic Drift Analysis</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          SentinelSQI extracts developer intent from commit messages, issue requirements, and PR descriptions, then contrasts it against the actual Abstract Syntax Tree (AST) changes to detect semantic drift and unintended side effects.
        </p>
      </div>

      {/* Semantic Drift Alert Banner */}
      {intentPillar.semanticDriftDetected && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-300">Semantic Drift Detected</h4>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {intentPillar.semanticDriftDetails || 'The code changes introduce behavioral mutations that diverge from the explicitly stated purpose of this pull request.'}
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side: Stated Intent vs Implementation Reality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: What was intended */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <h3 className="font-semibold text-white text-sm uppercase tracking-wide">
                Stated Intent & Desired Behaviors
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              PR & Issue Signals
            </span>
          </div>

          <div className="space-y-3">
            {intentPillar.intendedBehaviors.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-850/70 border border-slate-800/80 flex items-start gap-3 text-xs text-slate-200 leading-relaxed">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Original PR Goal:</h4>
            <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 whitespace-pre-wrap border border-slate-850">
              {report.prDescription}
            </div>
          </div>
        </div>

        {/* Right: What actually happened in code (AST Reality) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-400">
              <Flame className="h-4 w-4" />
              <h3 className="font-semibold text-white text-sm uppercase tracking-wide">
                AST Reality & Unintended Side Effects
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              Static & Semantic Analysis
            </span>
          </div>

          <div className="space-y-3">
            {intentPillar.unintendedSideEffects.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-200 leading-relaxed">
                <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  !
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Semantic Invariant Fidelity:</h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
              <span className="text-xs text-slate-300">Requirement Adherence Score</span>
              <span className={`text-base font-bold font-mono ${report.intentFidelityScore > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {report.intentFidelityScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Changed Symbols & Call Hierarchy Surface */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-cyan-400" />
          Extracted Abstract Syntax Tree (AST) Modifiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {report.diffs.map((diff, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-slate-850 border border-slate-800 space-y-2">
              <div className="font-mono text-cyan-300 font-semibold truncate" title={diff.filename}>
                {diff.filename}
              </div>
              <div className="space-y-1 text-slate-300">
                <div>
                  <span className="text-slate-500">Functions:</span>{' '}
                  <span className="font-mono text-slate-200">
                    {diff.extractedSymbols.functions.length > 0 ? diff.extractedSymbols.functions.join(', ') : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Imports:</span>{' '}
                  <span className="font-mono text-slate-200">
                    {diff.extractedSymbols.imports.length > 0 ? diff.extractedSymbols.imports.join(', ') : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Delta:</span>{' '}
                  <span className="text-emerald-400">+{diff.additions}</span>{' '}
                  <span className="text-rose-400">-{diff.deletions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

