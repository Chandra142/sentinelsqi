import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Download, Code2, AlertCircle } from 'lucide-react';
import { GeneratedTestSpec } from '../types/sqi';

interface TestGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: GeneratedTestSpec[];
}

export const TestGeneratorModal: React.FC<TestGeneratorModalProps> = ({
  isOpen,
  onClose,
  tests,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!isOpen || tests.length === 0) return null;

  const currentTest = tests[selectedIdx] || tests[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTest.testCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentTest.testCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTest.targetComponent.replace(/[\/\\]/g, '_')}.invariant.test.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Synthesized Invariant Test Suite
              </h3>
              <p className="text-xs text-slate-400">
                Targeting uncovered failure boundaries and unasserted contracts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selector if multiple tests */}
        {tests.length > 1 && (
          <div className="px-5 pt-3 pb-0 bg-slate-900 border-b border-slate-800 flex gap-2 overflow-x-auto">
            {tests.map((test, idx) => (
              <button
                key={test.id}
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                  selectedIdx === idx
                    ? 'border-cyan-500 text-cyan-400 bg-slate-850'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Test {idx + 1}: {test.uncoveredInvariant.substring(0, 35)}...
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <AlertCircle className="h-4 w-4" />
              <span>Target: {currentTest.targetComponent} ({currentTest.framework})</span>
            </div>
            <p className="text-xs text-slate-300">
              <strong className="text-white">Uncovered Invariant:</strong> {currentTest.uncoveredInvariant}
            </p>
            <p className="text-xs text-rose-300">
              <strong className="text-rose-400">Why current code fails this test:</strong> {currentTest.failureExplanation}
            </p>
          </div>

          {/* Test Code Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner">
            <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">{currentTest.testSuiteTitle}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-sans transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .test.ts</span>
                </button>
              </div>
            </div>

            <pre className="p-4 overflow-x-auto text-cyan-300 leading-relaxed max-h-96">
              <code>{currentTest.testCode}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
          <span>Run with: <code className="text-cyan-400 font-mono">npx vitest run</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

