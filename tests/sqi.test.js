import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGitDiff, extractSymbols, detectAstHazards, evaluateSoftwareChange } from '../lib/core.js';

test('parseGitDiff: correctly parses unified diff into files and symbol metadata', () => {
  const sampleDiff = `diff --git a/src/payments/refundHandler.ts b/src/payments/refundHandler.ts
index 838271..99281a 100644
--- a/src/payments/refundHandler.ts
+++ b/src/payments/refundHandler.ts
@@ -10,3 +10,8 @@ export async function processRefund(id: string) {
+  const lockKey = "lock:" + id;
+  await redis.set(lockKey, "1");
+  return true;
 }`;

  const files = parseGitDiff(sampleDiff);
  assert.equal(files.length, 1);
  assert.equal(files[0].filename, 'src/payments/refundHandler.ts');
  assert.ok(files[0].additions >= 3);
  assert.ok(files[0].extractedSymbols.functions.includes('processRefund'));
});

test('detectAstHazards: flags distributed lock acquired without TTL expiration', () => {
  const lockDiff = `+ const acquired = await redisClient.set(lockKey, 'processing');`;
  const hazards = detectAstHazards(lockDiff);
  
  assert.equal(hazards.length, 1);
  assert.equal(hazards[0].hazardType, 'Distributed Lock Deadlock');
  assert.equal(hazards[0].severity, 'critical');
});

test('detectAstHazards: flags auth cache key missing tenant segregation', () => {
  const authDiff = `+ const cacheKey = \`auth:user:\${userId}:role\`;\n+ await redis.set(cacheKey, role);`;
  const hazards = detectAstHazards(authDiff);
  
  assert.ok(hazards.some(h => h.hazardType === 'Multi-Tenant Isolation Breach'));
});

test('detectAstHazards: flags unbounded arithmetic subtraction underflow', () => {
  const calcDiff = `+ total = total - vip.fixedAmount;`;
  const hazards = detectAstHazards(calcDiff);
  
  assert.ok(hazards.some(h => h.hazardType === 'Arithmetic Underflow Hazard'));
});

test('detectAstHazards: flags synchronous busy waiting thread starvation', () => {
  const loopDiff = `+ while (Date.now() - start < waitMs) { /* sync busy spin */ }`;
  const hazards = detectAstHazards(loopDiff);
  
  assert.ok(hazards.some(h => h.hazardType === 'Event Loop Thread Starvation'));
});

test('evaluateSoftwareChange: calculates low quality score and blocks CI when critical hazards exist', () => {
  const rawDiff = `+ const lockKey = \`lock:refund:\${refundId}\`;\n+ await redisClient.set(lockKey, 'processing');`;
  const report = evaluateSoftwareChange('Fix refund duplicate bug', 'Add redis lock', rawDiff);

  assert.ok(report.overallQualityScore < 50);
  assert.equal(report.decision, 'BLOCK_CI');
  assert.ok(report.hazards.length > 0);
});

test('evaluateSoftwareChange: approves safe changes without hazards', () => {
  const safeDiff = `+ export function add(a: number, b: number) { return a + b; }`;
  const report = evaluateSoftwareChange('Add math utility', 'Helper function', safeDiff);

  assert.ok(report.overallQualityScore >= 75);
  assert.equal(report.decision, 'APPROVE');
  assert.equal(report.hazards.length, 0);
});

