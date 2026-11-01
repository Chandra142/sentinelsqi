import React, { useState } from 'react';
import { X, FileText, Copy, Check, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SQIQualityReport } from '../types/sqi';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SQIQualityReport;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeFormat, setActiveFormat] = useState<'markdown' | 'json'>('markdown');

  if (!isOpen) return null;

  const markdownReport = `# SentinelSQI Quality Intelligence Audit Report

**Decision:** \`${report.executiveRecommendations.status}\`  
**PR Title:** ${report.prTitle}  
**Commit:** \`${report.commitHash}\`  
**Timestamp:** ${report.timestamp}  

---

### Quality Intelligence Summary Scores
- **Overall Correctness Score:** ${report.overallQualityScore}/100
- **Intent Fidelity:** ${report.intentFidelityScore}%
- **Blast Radius Containment:** ${report.blastRadiusScore}/100
- **Semantic Test Adequacy:** ${report.semanticTestAdequacyScore}% *(Traditional Line Coverage: ${report.validationPillar.lineCoverageSummary}%)*
- **Regression Risk:** ${report.regressionRiskScore}%

---

### 1. Intent vs Implementation
${report.intentPillar.summary}

**Unintended Side Effects:**
${report.intentPillar.unintendedSideEffects.map(e => `- ${e}`).join('\n')}

---

### 2. Contextual Blast Radius & Impacted Workflows
- **Direct Files Changed:** ${report.contextBlastRadius.directFilesChanged}
- **Transitive Modules Impacted:** ${report.contextBlastRadius.transitiveModulesImpacted}
- **Impacted Workflows:**
${report.contextBlastRadius.affectedWorkflows.map(w => `  - ${w}`).join('\n')}

---

### 3. Semantic Test Adequacy & Validation Gaps
- **False Positive (Superficial Pass) Tests:** ${report.validationPillar.falsePositiveTestsCount}
- **Untested Edge Cases:** ${report.validationPillar.untestedEdgeCasesCount}

${report.validationPillar.assertionRequirements.map(req => `#### [${req.severity.toUpperCase()}] ${req.requirementTitle}
- **Status:** \`${req.status}\`
- **What Existing Tests Did:** ${req.existingTestCoverageSummary}
- **Critical Missing Assertion:** \`${req.criticalMissingAssertion}\`
- **Incident Risk:** ${req.potentialIncidentScenario}
`).join('\n')}

---

### 4. Executive Gating Decision & Actions
**Reasons:**
${report.executiveRecommendations.reasons.map(r => `- ${r}`).join('\n')}

**Mandatory Remediation Steps:**
${report.executiveRecommendations.immediateActionItems.map(a => `1. ${a}`).join('\n')}

*Generated automatically by SentinelSQI CI Quality Gate.*
`;

  const jsonReport = JSON.stringify(report, null, 2);
  const currentContent = activeFormat === 'markdown' ? markdownReport : jsonReport;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeFormat === 'markdown' ? 'md' : 'json';
    const blob = new Blob([currentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-sqi-audit-${report.commitHash}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                CI/CD Quality Intelligence Audit Report
              </h3>
              <p className="text-xs text-slate-400">
                Machine-readable & pull-request review format
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

        {/* Format Selector */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFormat('markdown')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeFormat === 'markdown'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Markdown (GitHub PR Comment)
            </button>
            <button
              onClick={() => setActiveFormat('json')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeFormat === 'json'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              JSON (CI/CD Pipeline Telemetry)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Report'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs">
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed">
            {currentContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

