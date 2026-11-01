import React, { useState } from 'react';
import { Code2, Copy, Check, AlertTriangle, FileCode } from 'lucide-react';
import { CodeChangeDiff } from '../types/sqi';
import { detectAstHazards } from '../services/staticParser';

interface DiffInspectorProps {
  diffs: CodeChangeDiff[];
}

export const DiffInspector: React.FC<DiffInspectorProps> = ({ diffs }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentDiff = diffs[selectedFileIdx] || diffs[0];
  const hazards = currentDiff ? detectAstHazards(currentDiff.rawDiff) : [];

  const handleCopy = () => {
    if (currentDiff) {
      navigator.clipboard.writeText(currentDiff.rawDiff);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!currentDiff) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
        No diff available to inspect.
      </div>
    );
  }

  const lines = currentDiff.rawDiff.split('\n');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Code2 className="h-5 w-5" />
            <h2 className="text-lg font-bold text-white">Annotated Diff & Semantic Hazards</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Examine code modifications with inline AST-derived hazard flags and invariant warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Raw Diff'}</span>
          </button>
        </div>
      </div>

      {/* File selector tabs if multiple files */}
      {diffs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {diffs.map((diff, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFileIdx(idx)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                selectedFileIdx === idx
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>{diff.filename}</span>
              <span className="text-[10px] text-emerald-400">+{diff.additions}</span>
              <span className="text-[10px] text-rose-400">-{diff.deletions}</span>
            </button>
          ))}
        </div>
      )}

      {/* Detected Hazards Callout */}
      {hazards.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Detected Code Hazards in {currentDiff.filename}:
          </span>
          <div className="space-y-1">
            {hazards.map((hazard, hIdx) => (
              <div key={hIdx} className="text-xs text-rose-200">
                • <strong className="text-white">{hazard.hazardType}:</strong> {hazard.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff Code Viewer */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-xl">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <span className="font-semibold text-slate-200">{currentDiff.filename}</span>
          <span>{lines.length} lines</span>
        </div>

        <div className="overflow-x-auto p-4 space-y-0.5">
          {lines.map((line, idx) => {
            const isAdded = line.startsWith('+') && !line.startsWith('+++');
            const isDeleted = line.startsWith('-') && !line.startsWith('---');
            const isHeader = line.startsWith('@@');

            let lineBg = '';
            let lineText = 'text-slate-300';

            if (isAdded) {
              lineBg = 'bg-emerald-950/30 text-emerald-200';
              lineText = 'text-emerald-300';
            } else if (isDeleted) {
              lineBg = 'bg-rose-950/30 text-rose-300';
              lineText = 'text-rose-400';
            } else if (isHeader) {
              lineBg = 'bg-cyan-950/30 text-cyan-400';
              lineText = 'text-cyan-400';
            }

            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 rounded font-mono ${lineBg}`}
              >
                <span className="w-10 text-slate-600 select-none shrink-0 text-right pr-3 text-[11px]">
                  {idx + 1}
                </span>
                <span className={`select-all break-all whitespace-pre-wrap ${lineText}`}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

