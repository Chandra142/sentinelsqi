export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CodeChangeDiff {
  filename: string;
  oldPath?: string;
  newPath?: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  rawDiff: string;
  language: string;
  extractedSymbols: {
    functions: string[];
    classes: string[];
    imports: string[];
    exports: string[];
    modifiedVariables: string[];
  };
}

export interface IntendedRequirement {
  id: string;
  title: string;
  source: 'commit_message' | 'pr_description' | 'issue_ticket' | 'inferred';
  description: string;
  acceptanceCriteria: string[];
  invariantsExpected: string[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'module' | 'function' | 'api_route' | 'database_model' | 'external_service';
  layer: 'entrypoint' | 'domain' | 'infrastructure' | 'storage';
  impactLevel: 'direct' | 'indirect' | 'none';
  riskScore: number; // 0 - 100
  affectedWorkflows: string[];
  callerCount: number;
  description: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  relationship: 'calls' | 'imports' | 'reads_state' | 'writes_state' | 'triggers_event';
  isVulnerable: boolean;
  notes?: string;
}

export interface BlastRadiusAnalysis {
  directFilesChanged: number;
  transitiveModulesImpacted: number;
  affectedWorkflows: string[];
  architecturalViolations: string[];
  dataModelRisks: string[];
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  overallBlastRadiusScore: number; // 0 - 100 (lower is safer)
}

export type TestAdequacyStatus = 
  | 'verified'              // True verification: assertion covers invariant & edge case
  | 'superficial_pass'      // Executes code (line coverage), but lacks crucial assertion
  | 'untested_edge_case'    // No test exercises this boundary / error path
  | 'regression_vulnerable' // Existing test passes, but workflow contract was broken silently
  | 'missing_test';         // Entirely missing test coverage

export interface SemanticAssertionRequirement {
  id: string;
  requirementTitle: string;
  category: 'business_logic' | 'boundary_condition' | 'concurrency_race' | 'security_auth' | 'idempotency' | 'fault_tolerance';
  status: TestAdequacyStatus;
  lineCoveragePct: number;
  semanticAssertionPct: number;
  existingTestCoverageSummary: string;
  criticalMissingAssertion: string;
  potentialIncidentScenario: string;
  severity: RiskLevel;
}

export interface GeneratedTestSpec {
  id: string;
  testSuiteTitle: string;
  framework: 'jest' | 'vitest' | 'playwright' | 'pytest';
  targetComponent: string;
  testCode: string;
  uncoveredInvariant: string;
  failureExplanation: string;
}

export interface SQIQualityReport {
  timestamp: string;
  scenarioId: string;
  prTitle: string;
  prDescription: string;
  author: string;
  commitHash: string;
  
  // High level intelligence metrics (0 - 100)
  overallQualityScore: number;        // Higher = better quality & correctness
  intentFidelityScore: number;        // Does the implementation match what was intended?
  blastRadiusScore: number;           // How contained is the change? (100 = minimal blast, 0 = catastrophic)
  semanticTestAdequacyScore: number;  // Are the critical invariants asserted, not just line-covered?
  regressionRiskScore: number;        // Probability of breaking existing workflows (0 = low risk, 100 = high risk)
  confidenceIndex: number;            // AI reasoning confidence

  // Detailed Analysis Pillars
  intentPillar: {
    summary: string;
    intendedBehaviors: string[];
    unintendedSideEffects: string[];
    semanticDriftDetected: boolean;
    semanticDriftDetails?: string;
  };

  contextBlastRadius: BlastRadiusAnalysis;

  validationPillar: {
    summary: string;
    lineCoverageSummary: number; // traditional metric
    semanticAdequacySummary: number; // true semantic correctness
    assertionRequirements: SemanticAssertionRequirement[];
    falsePositiveTestsCount: number;
    untestedEdgeCasesCount: number;
  };

  generatedTestPatches: GeneratedTestSpec[];

  executiveRecommendations: {
    status: 'APPROVE' | 'REQUEST_CHANGES' | 'BLOCK_CI';
    reasons: string[];
    immediateActionItems: string[];
    longTermArchitecturalNotes: string[];
  };

  diffs: CodeChangeDiff[];
}

export interface BenchmarkScenario {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  prTitle: string;
  prDescription: string;
  traditionalCITestResult: 'PASS' | 'FAIL';
  traditionalCoveragePct: number;
  underlyingHazard: string;
  diffs: CodeChangeDiff[];
  defaultReport: SQIQualityReport;
}

