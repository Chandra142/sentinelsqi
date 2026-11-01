import { CodeChangeDiff } from '../types/sqi';

export function parseGitDiff(diffText: string): CodeChangeDiff[] {
  const fileDiffs: CodeChangeDiff[] = [];
  const lines = (diffText || '').split('\n');
  
  let currentFile: Partial<CodeChangeDiff> | null = null;
  let currentRawLines: string[] = [];
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
        fileDiffs.push(currentFile as CodeChangeDiff);
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
        language: detectLanguage(filename),
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
    fileDiffs.push(currentFile as CodeChangeDiff);
  }

  if (fileDiffs.length === 0 && (diffText || '').trim().length > 0) {
    const added = (diffText.match(/^\+[^+]/gm) || []).length;
    const deleted = (diffText.match(/^-[^-]/gm) || []).length;
    fileDiffs.push({
      filename: 'changed_code.ts',
      status: 'modified',
      additions: added || 1,
      deletions: deleted || 1,
      language: 'typescript',
      rawDiff: diffText,
      extractedSymbols: extractSymbols(diffText)
    });
  }

  return fileDiffs;
}

function detectLanguage(filename: string): string {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.go')) return 'go';
  if (filename.endsWith('.rs')) return 'rust';
  return 'typescript';
}

export function extractSymbols(diffText: string): CodeChangeDiff['extractedSymbols'] {
  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const modifiedVariables: string[] = [];

  const funcRegex = /(?:function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;
  let match;
  while ((match = funcRegex.exec(diffText)) !== null) {
    const fnName = match[1] || match[2];
    if (fnName && !functions.includes(fnName)) functions.push(fnName);
  }

  const classRegex = /class\s+([A-Za-z0-9_]+)/g;
  while ((match = classRegex.exec(diffText)) !== null) {
    if (match[1] && !classes.includes(match[1])) classes.push(match[1]);
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

  const varRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=/g;
  while ((match = varRegex.exec(diffText)) !== null) {
    if (match[1] && !modifiedVariables.includes(match[1])) modifiedVariables.push(match[1]);
  }

  return { functions, classes, imports, exports, modifiedVariables };
}

export interface DetectedHazardPattern {
  hazardType: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  lineSnippet?: string;
}

export function detectAstHazards(rawDiff: string): DetectedHazardPattern[] {
  const hazards: DetectedHazardPattern[] = [];
  const lowerDiff = (rawDiff || '').toLowerCase();

  // 1. Lock without TTL or cleanup: mentions lock and set without ttl/ex/px
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
