import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Layers, 
  Gauge, 
  ArrowRight,
  TrendingDown,
  Sparkles,
  Info
} from 'lucide-react';
import { SQIQualityReport, BenchmarkScenario } from '../types/sqi';

interface DashboardOverviewProps {
  report: SQIQualityReport;
  scenario?: BenchmarkScenario;
  onNavigateTab: (tab: string) => void;
  onOpenTestModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  report,
  scenario,
  onNavigateTab,
  onOpenTestModal,
}) => {
  const isHighRisk = report.overallQualityScore < 50;
  const isModerateRisk = report.overallQualityScore >= 50 && report.overallQualityScore < 75;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getRecommendationBadge = (status: string) => {
    switch (status) {
      case 'BLOCK_CI':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold text-sm tracking-wide">
            <XCircle className="h-5 w-5" />
            <span>CI GATING: BLOCK MERGE</span>
          </div>
        );
      case 'REQUEST_CHANGES':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold text-sm tracking-wide">
            <AlertTriangle className="h-5 w-5" />
            <span>CI GATING: REQUEST CHANGES</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold text-sm tracking-wide">
            <CheckCircle2 className="h-5 w-5" />
            <span>CI GATING: APPROVED FOR DEPLOY</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: The "Goodhart's Law" Cognitive Paradox */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {scenario?.category || 'PR Intelligence Evaluation'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Commit: {report.commitHash}</span>
              <span className="text-xs text-slate-400 font-mono">By: {report.author}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {report.prTitle}
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {report.intentPillar.summary}
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
            {getRecommendationBadge(report.executiveRecommendations.status)}
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span>AI Evaluation Confidence: <strong className="text-slate-200">{report.confidenceIndex}%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* The Crucial Paradox: Traditional CI vs Quality Intelligence Reality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conventional CI/CD Status */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Conventional CI Pipeline
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ALL TESTS PASSING
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Unit & Integration Test Suite:</span>
              <span className="text-emerald-400 font-mono font-medium">100% Passed (0 Failures)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Traditional Line Coverage:</span>
              <span className="text-cyan-400 font-mono font-medium">
                {scenario?.traditionalCoveragePct || report.validationPillar.lineCoverageSummary}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Linter & TypeScript Compiler:</span>
              <span className="text-emerald-400 font-mono font-medium">0 Errors, 0 Warnings</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-start gap-1.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Standard CI treats this change as safe because mocks pass and lines execute. It has no semantic understanding of invariant preservation.
            </span>
          </div>
        </div>

        {/* SentinelSQI Semantic Reality */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              SentinelSQI Quality Intelligence
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
              HIGH RISK DEFECTS DETECTED
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Semantic Invariant Adequacy:</span>
              <span className="text-rose-400 font-mono font-bold">
                {report.semanticTestAdequacyScore}% (Severe Blindspots)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Superficial Pass Tests:</span>
              <span className="text-amber-400 font-mono font-medium">
                {report.validationPillar.falsePositiveTestsCount} tests lack invariant assertions
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Critical Edge Case Blindspots:</span>
              <span className="text-rose-400 font-mono font-medium">
                {report.validationPillar.untestedEdgeCasesCount} untested failure modes
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-500/20 text-xs text-rose-300 flex items-start gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              {scenario?.underlyingHazard || 'Detected hidden regression vulnerability and broken contractual invariants.'}
            </span>
          </div>
        </div>
      </div>

      {/* 5 Core Intelligence Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Score 1: Overall Quality & Correctness */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Correctness Score</div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${getScoreColor(report.overallQualityScore).split(' ')[0]}`}>
              {report.overallQualityScore}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>
          <div className="text-xs text-slate-400">
            {report.overallQualityScore < 50 ? 'Critical risk of incident' : 'Acceptable quality range'}
          </div>
        </div>

        {/* Score 2: Intent Fidelity */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Intent Fidelity</div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${getScoreColor(report.intentFidelityScore).split(' ')[0]}`}>
              {report.intentFidelityScore}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            {report.intentPillar.semanticDriftDetected ? 'Semantic drift flagged' : 'Matches stated goal'}
          </div>
        </div>

        {/* Score 3: Blast Radius Containment */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Blast Radius Safety</div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${getScoreColor(report.blastRadiusScore).split(' ')[0]}`}>
              {report.blastRadiusScore}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            {report.contextBlastRadius.transitiveModulesImpacted} downstream modules
          </div>
        </div>

        {/* Score 4: Semantic Test Adequacy */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Test Adequacy</div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${getScoreColor(report.semanticTestAdequacyScore).split(' ')[0]}`}>
              {report.semanticTestAdequacyScore}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Assertion depth vs mocks
          </div>
        </div>

        {/* Score 5: Regression Risk */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Regression Risk</div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${report.regressionRiskScore > 70 ? 'text-rose-400' : report.regressionRiskScore > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {report.regressionRiskScore}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Workflow break probability
          </div>
        </div>
      </div>

      {/* Immediate Action Items & Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Executive Decision Breakdown */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
              Why Sentinel Flagged This Change
            </h3>
            <button
              onClick={() => onNavigateTab('intent')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition"
            >
              <span>Examine Intent Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {report.executiveRecommendations.reasons.map((reason, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-start gap-2.5 text-sm text-slate-200">
                <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                  !
                </span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Mandatory Action Items Before Release:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {report.executiveRecommendations.immediateActionItems.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right 1 Col: Test Synthesis Quick Launch */}
        <div className="p-5 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-bold text-white text-base">Synthesized Invariant Tests</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              SentinelSQI automatically synthesized <strong>{report.generatedTestPatches.length} executable unit tests</strong> that specifically target the uncovered invariants and edge cases.
            </p>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono text-cyan-300 space-y-1">
              <div>// Targets: {report.generatedTestPatches[0]?.targetComponent || 'Altered Components'}</div>
              <div className="text-slate-400">// Invariant: {report.generatedTestPatches[0]?.uncoveredInvariant || 'Edge Case Boundary'}</div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={onOpenTestModal}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Review Generated Invariant Tests</span>
            </button>
            <button
              onClick={() => onNavigateTab('test-matrix')}
              className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition"
            >
              Inspect Semantic Test Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

