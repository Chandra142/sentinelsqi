/**
 * SentinelSQI Core Engine (Node.js runtime compatible)
 */

export function parseGitDiff(diffText) {
  const fileDiffs = [];
  const lines = (diffText || '').split('\n');
  
  let currentFile = null;
  let currentRawLines = [];
  let additions = 0;
  let deletions = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isGitDiffHeader = line.startsWith('diff --git');
    const isFileHeader = line.startsWith('--- File:');
    const isStandalonePatchHeader = !currentFile && line.startsWith('--- a/');

    if (isGitDiffHeader || isFileHeader || isStandalonePatchHeader) {
      if (currentFile && currentFile.filename) {
        currentFile.rawDiff = currentRawLines.join('\n');
        currentFile.additions = additions;
        currentFile.deletions = deletions;
        currentFile.extractedSymbols = extractSymbols(currentFile.rawDiff);
        fileDiffs.push(currentFile);
      }

      let filename = 'unknown';
      if (line.startsWith('diff --git')) {
        const parts = line.split(' ');
        filename = parts[parts.length - 1]?.replace(/^[b\/]+/, '') || 'unknown';
      } else if (line.startsWith('--- File:')) {
        filename = line.replace('--- File:', '').trim().split(' ')[0];
      } else if (line.startsWith('--- a/')) {
        filename = line.replace('--- a/', '').trim();
      }

      currentFile = {
        filename,
        status: 'modified',
        additions: 0,
        deletions: 0
      };
      currentRawLines = [line];
      additions = 0;
      deletions = 0;
      continue;
    }

    if (currentFile) {
      currentRawLines.push(line);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
      }
    }
  }

  if (currentFile && currentFile.filename) {
    currentFile.rawDiff = currentRawLines.join('\n');
    currentFile.additions = additions;
    currentFile.deletions = deletions;
    currentFile.extractedSymbols = extractSymbols(currentFile.rawDiff);
    fileDiffs.push(currentFile);
  }

  if (fileDiffs.length === 0 && (diffText || '').trim().length > 0) {
    const added = (diffText.match(/^\+[^+]/gm) || []).length;
    const deleted = (diffText.match(/^-[^-]/gm) || []).length;
    fileDiffs.push({
      filename: 'changed_code.ts',
      status: 'modified',
      additions: added || 1,
      deletions: deleted || 1,
      rawDiff: diffText,
      extractedSymbols: extractSymbols(diffText)
    });
  }

  return fileDiffs;
}

export function extractSymbols(diffText) {
  const functions = [];
  const classes = [];
  const imports = [];
  const exportsList = [];

  const funcRegex = /(?:function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  let match;
  while ((match = funcRegex.exec(diffText)) !== null) {
    const fnName = match[1] || match[2];
    if (fnName && !functions.includes(fnName)) functions.push(fnName);
  }

  const importRegex = /import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from/g;
  while ((match = importRegex.exec(diffText)) !== null) {
    const raw = match[1] || match[2];
    if (raw) {
      raw.split(',').forEach(item => {
        const clean = item.trim().split(' as ')[0];
        if (clean && !imports.includes(clean)) imports.push(clean);
      });
    }
  }

  return { functions, classes, imports, exports: exportsList };
}

export function detectAstHazards(rawDiff) {
  const hazards = [];
  const lowerDiff = (rawDiff || '').toLowerCase();

  // 1. Lock without TTL or cleanup
  const hasLock = lowerDiff.includes('lock') || lowerDiff.includes('mutex') || lowerDiff.includes('idempotenc');
  const hasTtl = /['"\s{,]ex[:\s,}]/i.test(rawDiff) || /['"\s{,]px[:\s,}]/i.test(rawDiff) || /ttl/i.test(rawDiff);
  if (hasLock && rawDiff.includes('.set(') && !hasTtl) {
    hazards.push({
      hazardType: 'Distributed Lock Deadlock',
      description: 'Distributed lock acquired without explicit TTL expiration parameter. Risk of permanent system deadlock on process crash.',
      severity: 'critical'
    });
  }

  // 2. Auth cache key missing tenant segregation
  const authKeyMatch = rawDiff.match(/(?:cacheKey|key)\s*=\s*[`'"]([^`'"]*auth:[^`'"]+)[`'"]/i) || 
                       rawDiff.match(/[`'"](auth:user:[^`'"]+)[`'"]/i) ||
                       rawDiff.match(/[`'"](user:perm:[^`'"]+)[`'"]/i);
  if (authKeyMatch) {
    const keyPattern = authKeyMatch[1];
    if (!keyPattern.toLowerCase().includes('tenant') && !keyPattern.toLowerCase().includes('org')) {
      hazards.push({
        hazardType: 'Multi-Tenant Isolation Breach',
        description: `Cache key "${keyPattern}" does not include tenantId/orgId segregation, allowing cross-tenant privilege escalation.`,
        severity: 'critical'
      });
    }
  }

  // 3. Monetary subtraction underflow
  if (/total\s*=\s*total\s*-\s*[A-Za-z0-9_.]+/.test(rawDiff) && !rawDiff.includes('Math.max') && !rawDiff.includes('clamp')) {
    hazards.push({
      hazardType: 'Arithmetic Underflow Hazard',
      description: 'Monetary/metric subtraction without Math.max(0, ...) boundary enforcement allows negative balances.',
      severity: 'high'
    });
  }

  // 4. Synchronous busy waiting
  if (/while\s*\([^)]*Date\.now\(\)[^)]*\)/.test(rawDiff) || /while\s*\([^)]*Date\.now\(\)\s*-\s*start/.test(rawDiff)) {
    hazards.push({
      hazardType: 'Event Loop Thread Starvation',
      description: 'Synchronous busy-waiting loop blocks Node.js event loop, preventing heartbeat signals and broker health checks.',
      severity: 'critical'
    });
  }

  // 5. Silent failure without DLQ
  if (rawDiff.includes('logger.error') && !rawDiff.includes('throw') && !lowerDiff.includes('dlq') && rawDiff.includes('catch')) {
    hazards.push({
      hazardType: 'Silent Failure / Missing DLQ',
      description: 'Poison pill message caught and logged but not forwarded to a Dead Letter Queue, causing permanent data loss.',
      severity: 'high'
    });
  }

  return hazards;
}

export function evaluateSoftwareChange(prTitle, prDescription, rawDiff) {
  const diffs = parseGitDiff(rawDiff);
  const hazards = detectAstHazards(rawDiff);

  let qualityScore = 85;
  let testAdequacy = 80;
  let regressionRisk = 20;

  if (hazards.some(h => h.severity === 'critical')) {
    qualityScore = 25;
    testAdequacy = 20;
    regressionRisk = 90;
  } else if (hazards.some(h => h.severity === 'high')) {
    qualityScore = 48;
    testAdequacy = 35;
    regressionRisk = 75;
  }

  const decision = qualityScore < 50 ? 'BLOCK_CI' : (qualityScore < 75 ? 'REQUEST_CHANGES' : 'APPROVE');

  return {
    prTitle,
    prDescription,
    overallQualityScore: qualityScore,
    semanticTestAdequacyScore: testAdequacy,
    regressionRiskScore: regressionRisk,
    decision,
    hazards,
    diffsCount: diffs.length
  };
}
