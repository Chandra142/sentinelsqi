import { SQIQualityReport, CodeChangeDiff } from '../types/sqi';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiAnalysisRequest {
  prTitle: string;
  prDescription: string;
  diffs: CodeChangeDiff[];
  apiKey?: string;
  model?: string;
}

export async function analyzeSoftwareChangeWithGemini(
  request: GeminiAnalysisRequest
): Promise<Partial<SQIQualityReport> | null> {
  const apiKey = request.apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  
  if (!apiKey) {
    console.warn('No Gemini API key available; using heuristic cognitive engine.');
    return null;
  }

  const model = request.model || 'gemini-2.5-flash';
  const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

  const diffSummary = request.diffs.map(d => `--- File: ${d.filename} (${d.status}) ---\n${d.rawDiff}`).join('\n\n');

  const systemPrompt = `You are SentinelSQI, an elite AI Software Quality Intelligence engine built to assess the correctness of software changes.
Traditional CI checks whether code compiles and if tests pass, but fails to detect:
1. Unintended side effects and semantic drift from stated requirements.
2. Contextual blast radius (unanticipated impacts on caller workflows, data integrity, or distributed contracts).
3. Superficial test passes (tests that execute lines without actually asserting on crucial invariants and edge cases).

Analyze the provided PR Title, PR Description, and Code Diff. Return a STRICT JSON object conforming to the following structure without markdown wrapper:
{
  "overallQualityScore": number (0-100, where 100 is flawless and <50 is high risk),
  "intentFidelityScore": number (0-100),
  "blastRadiusScore": number (0-100, where lower means wide/risky blast radius),
  "semanticTestAdequacyScore": number (0-100, checking if critical invariants are asserted),
  "regressionRiskScore": number (0-100, probability of regressions),
  "confidenceIndex": number (0-100),
  "intentPillar": {
    "summary": string,
    "intendedBehaviors": string[],
    "unintendedSideEffects": string[],
    "semanticDriftDetected": boolean,
    "semanticDriftDetails": string
  },
  "contextBlastRadius": {
    "directFilesChanged": number,
    "transitiveModulesImpacted": number,
    "affectedWorkflows": string[],
    "architecturalViolations": string[],
    "dataModelRisks": string[],
    "overallBlastRadiusScore": number,
    "nodes": [
      {
        "id": string,
        "name": string,
        "type": "module" | "function" | "api_route" | "database_model" | "external_service",
        "layer": "entrypoint" | "domain" | "infrastructure" | "storage",
        "impactLevel": "direct" | "indirect" | "none",
        "riskScore": number,
        "affectedWorkflows": string[],
        "callerCount": number,
        "description": string
      }
    ],
    "edges": [
      {
        "source": string,
        "target": string,
        "relationship": "calls" | "imports" | "reads_state" | "writes_state" | "triggers_event",
        "isVulnerable": boolean,
        "notes": string
      }
    ]
  },
  "validationPillar": {
    "summary": string,
    "lineCoverageSummary": number,
    "semanticAdequacySummary": number,
    "falsePositiveTestsCount": number,
    "untestedEdgeCasesCount": number,
    "assertionRequirements": [
      {
        "id": string,
        "requirementTitle": string,
        "category": "business_logic" | "boundary_condition" | "concurrency_race" | "security_auth" | "idempotency" | "fault_tolerance",
        "status": "verified" | "superficial_pass" | "untested_edge_case" | "regression_vulnerable" | "missing_test",
        "lineCoveragePct": number,
        "semanticAssertionPct": number,
        "existingTestCoverageSummary": string,
        "criticalMissingAssertion": string,
        "potentialIncidentScenario": string,
        "severity": "low" | "medium" | "high" | "critical"
      }
    ]
  },
  "generatedTestPatches": [
    {
      "id": string,
      "testSuiteTitle": string,
      "framework": "vitest",
      "targetComponent": string,
      "uncoveredInvariant": string,
      "failureExplanation": string,
      "testCode": string
    }
  ],
  "executiveRecommendations": {
    "status": "APPROVE" | "REQUEST_CHANGES" | "BLOCK_CI",
    "reasons": string[],
    "immediateActionItems": string[],
    "longTermArchitecturalNotes": string[]
  }
}`;

  const userContent = `PR Title: ${request.prTitle}
PR Description: ${request.prDescription}

Code Diff:
${diffSummary}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      console.warn(`Gemini API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) return null;

    const parsed = JSON.parse(textOutput);
    return parsed;
  } catch (err) {
    console.error('Failed to run Gemini AI analysis:', err);
    return null;
  }
}

