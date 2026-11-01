import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { IntentAnalysisView } from './components/IntentAnalysisView';
import { BlastRadiusGraph } from './components/BlastRadiusGraph';
import { SemanticTestMatrix } from './components/SemanticTestMatrix';
import { DiffInspector } from './components/DiffInspector';
import { LiveDiffEditor } from './components/LiveDiffEditor';
import { TestGeneratorModal } from './components/TestGeneratorModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { BENCHMARK_SCENARIOS } from './data/scenarios';
import { SQIQualityReport, BenchmarkScenario } from './types/sqi';
import { runQualityIntelligenceAnalysis, AnalysisInput } from './services/analyzer';

export default function App() {
  const [currentScenarioId, setCurrentScenarioId] = useState<string>(BENCHMARK_SCENARIOS[0].id);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // API key state (reads from window/env if injected, or user entered)
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('sentinel_gemini_key') || '';
  });
  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sentinel_ai_enabled') === 'true';
  });

  // Current Scenario and Quality Report State
  const activeScenario = BENCHMARK_SCENARIOS.find((s) => s.id === currentScenarioId);
  const [currentReport, setCurrentReport] = useState<SQIQualityReport>(() => {
    const sc = BENCHMARK_SCENARIOS[0];
    return {
      ...sc.defaultReport,
      diffs: sc.diffs
    };
  });

  const handleSelectScenario = (id: string) => {
    setCurrentScenarioId(id);
    if (id === 'custom') {
      setActiveTab('playground');
      return;
    }

    const scenario = BENCHMARK_SCENARIOS.find((s) => s.id === id);
    if (scenario) {
      setCurrentReport({
        ...scenario.defaultReport,
        diffs: scenario.diffs
      });
      if (activeTab === 'playground') {
        setActiveTab('overview');
      }
    }
  };

  const handleToggleAi = () => {
    const nextState = !isAiEnabled;
    setIsAiEnabled(nextState);
    localStorage.setItem('sentinel_ai_enabled', String(nextState));
  };

  const handleSetApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('sentinel_gemini_key', key);
    if (key) {
      setIsAiEnabled(true);
      localStorage.setItem('sentinel_ai_enabled', 'true');
    }
  };

  const handleReanalyze = async () => {
    if (!activeScenario) return;
    setIsAnalyzing(true);
    try {
      const result = await runQualityIntelligenceAnalysis({
        prTitle: activeScenario.prTitle,
        prDescription: activeScenario.prDescription,
        rawDiff: activeScenario.diffs.map(d => d.rawDiff).join('\n\n'),
        apiKey: geminiApiKey,
        useLiveAi: isAiEnabled && !!geminiApiKey,
      });
      setCurrentReport(result);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCustomAnalyze = async (input: AnalysisInput) => {
    setIsAnalyzing(true);
    try {
      const result = await runQualityIntelligenceAnalysis({
        ...input,
        apiKey: geminiApiKey,
        useLiveAi: isAiEnabled && !!geminiApiKey,
      });
      setCurrentReport(result);
      setCurrentScenarioId('custom');
      setActiveTab('overview');
    } catch (err) {
      console.error('Custom analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        currentScenarioId={currentScenarioId}
        onSelectScenario={handleSelectScenario}
        isAiEnabled={isAiEnabled}
        onToggleAi={handleToggleAi}
        hasApiKey={!!geminiApiKey}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenPlayground={() => setActiveTab('playground')}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isAnalyzing={isAnalyzing}
        onReanalyze={handleReanalyze}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <DashboardOverview
            report={currentReport}
            scenario={activeScenario}
            onNavigateTab={setActiveTab}
            onOpenTestModal={() => setIsTestModalOpen(true)}
          />
        )}

        {activeTab === 'intent' && (
          <IntentAnalysisView report={currentReport} />
        )}

        {activeTab === 'blast-radius' && (
          <BlastRadiusGraph report={currentReport} />
        )}

        {activeTab === 'test-matrix' && (
          <SemanticTestMatrix
            report={currentReport}
            onOpenTestModal={() => setIsTestModalOpen(true)}
          />
        )}

        {activeTab === 'diff' && (
          <DiffInspector diffs={currentReport.diffs} />
        )}

        {activeTab === 'playground' && (
          <LiveDiffEditor
            onAnalyze={handleCustomAnalyze}
            isAnalyzing={isAnalyzing}
            initialTitle={activeScenario?.prTitle}
            initialDescription={activeScenario?.prDescription}
            initialDiff={activeScenario?.diffs[0]?.rawDiff}
            geminiApiKey={geminiApiKey}
            onSetApiKey={handleSetApiKey}
          />
        )}
      </main>

      {/* Invariant Test Synthesis Modal */}
      <TestGeneratorModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        tests={currentReport.generatedTestPatches}
      />

      {/* CI/CD Audit Report Modal */}
      <ExecutiveReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={currentReport}
      />

      {/* Bottom Sticky Status Ribbon */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>SentinelSQI Core Active</span>
            <span className="text-slate-600">|</span>
            <span>Engine: {isAiEnabled && geminiApiKey ? 'Gemini 2.5 Multi-Stage Reasoning' : 'Static AST & Cognitive Invariant Analyzer'}</span>
          </div>
          <div>
            Built for <strong className="text-slate-400">Myco Engineering Assessment</strong> — AI-Powered Software Quality Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
}

