import React, { useState } from 'react';
import { Layers, AlertTriangle, ArrowRight, Server, Database, Globe, Cpu, CheckCircle } from 'lucide-react';
import { SQIQualityReport, DependencyNode } from '../types/sqi';

interface BlastRadiusGraphProps {
  report: SQIQualityReport;
}

export const BlastRadiusGraph: React.FC<BlastRadiusGraphProps> = ({ report }) => {
  const { contextBlastRadius } = report;
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(
    contextBlastRadius.nodes[0] || null
  );

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'database_model':
        return <Database className="h-4 w-4 text-amber-400" />;
      case 'external_service':
        return <Globe className="h-4 w-4 text-indigo-400" />;
      case 'api_route':
        return <Server className="h-4 w-4 text-cyan-400" />;
      default:
        return <Cpu className="h-4 w-4 text-emerald-400" />;
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'direct':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">DIRECT IMPACT</span>;
      case 'indirect':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">INDIRECT IMPACT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">ISOLATED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
          <Layers className="h-5 w-5" />
          <h2 className="text-lg font-bold text-white">Contextual Blast Radius & Dependency Impact</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          Code rarely fails in total isolation. SentinelSQI maps the direct AST mutations against call hierarchies, downstream consumer workflows, distributed infrastructure services, and data models to calculate true blast surface area.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Direct Changed Modules</span>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {contextBlastRadius.directFilesChanged}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Transitive Impact Surface</span>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
            {contextBlastRadius.transitiveModulesImpacted} Modules
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Affected Workflows</span>
          <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
            {contextBlastRadius.affectedWorkflows.length} Pipelines
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Blast Radius Risk</span>
          <div className="text-2xl font-mono font-bold text-rose-400 mt-1">
            {contextBlastRadius.overallBlastRadiusScore}/100
          </div>
        </div>
      </div>

      {/* Visual Dependency & Blast Radius Interactive Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Graph Nodes */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Interactive Component Call Graph
            </h3>
            <span className="text-xs text-slate-400">Click node to inspect ripple effects</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contextBlastRadius.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500'
                      : 'bg-slate-850/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                        {getNodeIcon(node.type)}
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-200 truncate max-w-[180px]" title={node.name}>
                        {node.name}
                      </span>
                    </div>
                    {getImpactBadge(node.impactLevel)}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {node.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>Callers: <strong className="text-slate-300 font-mono">{node.callerCount}</strong></span>
                    <span className="flex items-center gap-1">
                      <span>Node Risk:</span>
                      <strong className={`font-mono ${node.riskScore > 75 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {node.riskScore}%
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edges & Relationship Callouts */}
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Dependency Edges & Cross-Service Contracts
            </h4>
            <div className="space-y-1.5">
              {contextBlastRadius.edges.map((edge, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg text-xs font-mono flex items-center justify-between border ${
                    edge.isVulnerable
                      ? 'bg-rose-950/20 text-rose-300 border-rose-500/30'
                      : 'bg-slate-950 text-slate-300 border-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-semibold">{edge.source}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-cyan-300">{edge.target}</span>
                    <span className="text-slate-500">[{edge.relationship}]</span>
                  </div>
                  {edge.notes && (
                    <span className="text-[11px] text-rose-400 font-sans italic truncate ml-2">
                      {edge.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Selected Node Inspector & Affected Workflows */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Inspected Component Detail
            </span>
            {selectedNode ? (
              <div className="mt-3 space-y-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-xs font-mono text-cyan-400 font-bold break-all">
                    {selectedNode.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 capitalize">
                    Layer: {selectedNode.layer} | Type: {selectedNode.type}
                  </div>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {selectedNode.description}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Workflows In Direct Path:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedNode.affectedWorkflows.map((wf, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">
                        {wf}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">Select a node from the graph to inspect details.</div>
            )}
          </div>

          {/* Architectural Violations */}
          {contextBlastRadius.architecturalViolations.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Architectural Invariant Breaches
              </span>
              <div className="space-y-1.5">
                {contextBlastRadius.architecturalViolations.map((violation, idx) => (
                  <div key={idx} className="p-2 rounded bg-rose-950/20 text-rose-300 border border-rose-500/20 text-xs leading-relaxed">
                    • {violation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affected Global Workflows */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              End-to-End Workflows Impacted:
            </span>
            <div className="space-y-1.5">
              {contextBlastRadius.affectedWorkflows.map((wf, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-850 text-slate-300 text-xs flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                  <span>{wf}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

