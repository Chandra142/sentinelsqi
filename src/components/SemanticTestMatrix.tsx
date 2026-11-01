import React from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Code, 
  HelpCircle,
  EyeOff
} from 'lucide-react';
import { SQIQualityReport, SemanticAssertionRequirement, TestAdequacyStatus } from '../types/sqi';

interface SemanticTestMatrixProps {
  report: SQIQualityReport;
  onOpenTestModal: () => void;
}

export const SemanticTestMatrix: React.FC<SemanticTestMatrixProps> = ({
  report,
  onOpenTestModal,
}) => {
  const { validationPillar } = report;

  const getStatusBadge = (status: TestAdequacyStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Verified</span>
          </span>
        );
      case 'superficial_pass':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <EyeOff className="h-3.5 w-3.5" />
            <span>Superficial Pass</span>
          </span>
        );
      case 'untested_edge_case':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Untested Edge Case</span>
          </span>
        );
      case 'regression_vulnerable':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Contract Regression</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            <XCircle className="h-3.5 w-3.5" />
            <span>Missing Test</span>
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">Critical</span>;
      case 'high':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">High</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">Medium</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-lg font-bold text-white">Semantic Test Adequacy Matrix</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
            Pass rates and line coverage can create a dangerous illusion of correctness. SentinelSQI performs assertion-level semantic verification: assessing whether tests assert on key invariants, boundary values, error boundaries, and state mutations.
          </p>
        </div>

        <button
          onClick={onOpenTestModal}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition"
        >
          <Code className="h-4 w-4" />
          <span>View Auto-Generated Tests ({report.generatedTestPatches.length})</span>
        </button>
      </div>

      {/* Metric Comparison Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Traditional Line Coverage</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {validationPillar.lineCoverageSummary}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Executes lines (Superficial)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">True Semantic Adequacy</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {validationPillar.semanticAdequacySummary}%
          </div>
          <div className="text-xs text-rose-300 mt-1">Asserts invariant correctness</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Superficial Pass Mocks</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {validationPillar.falsePositiveTestsCount}
          </div>
          <div className="text-xs text-amber-300 mt-1">Tests that pass without asserting</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Untested Edge Cases</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {validationPillar.untestedEdgeCasesCount}
          </div>
          <div className="text-xs text-rose-300 mt-1">Unchecked failure boundaries</div>
        </div>
      </div>

      {/* Semantic Requirements & Assertion Analysis Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Requirement-to-Assertion Verification Grid
          </h3>
          <span className="text-xs text-slate-400">
            {validationPillar.assertionRequirements.length} Invariants Analyzed
          </span>
        </div>

        <div className="space-y-4">
          {validationPillar.assertionRequirements.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'verified'
                  ? 'bg-slate-850/60 border-slate-800'
                  : 'bg-slate-850 border-slate-700/80 shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  {getStatusBadge(item.status)}
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    {item.requirementTitle}
                  </h4>
                  {getSeverityBadge(item.severity)}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-slate-400">
                    Line Cov: <span className="text-cyan-400 font-semibold">{item.lineCoveragePct}%</span>
                  </div>
                  <div className="text-slate-400">
                    Semantic Assertion: <span className={`font-semibold ${item.semanticAssertionPct < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>{item.semanticAssertionPct}%</span>
                  </div>
                </div>
              </div>

              {/* Existing test behavior vs why it is inadequate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] block">
                    What Existing Tests Did:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {item.existingTestCoverageSummary}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 space-y-1">
                  <span className="font-semibold text-rose-300 uppercase tracking-wider text-[11px] block">
                    Critical Missing Assertion:
                  </span>
                  <code className="text-rose-200 font-mono block break-all text-xs">
                    {item.criticalMissingAssertion}
                  </code>
                </div>
              </div>

              {/* Potential Incident Risk Scenario */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-start gap-2 text-xs">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  <strong className="text-amber-400">Production Impact if unaddressed:</strong>{' '}
                  {item.potentialIncidentScenario}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

