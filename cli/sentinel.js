#!/usr/bin/env node

/**
 * SentinelSQI CI/CD Terminal Interface
 * AI-Powered Software Quality Intelligence CLI
 */

import fs from 'fs';
import path from 'path';
import { evaluateSoftwareChange, parseGitDiff } from '../lib/core.js';

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
🛡️  SentinelSQI - AI-Powered Software Quality Intelligence CLI

Usage:
  sentinel [options]

Options:
  --diff <path>         Path to a unified git diff file
  --intent <text>       Stated PR intent or commit title
  --desc <text>         Detailed PR description / acceptance criteria
  --scenario <name>     Pre-loaded scenario: stripe | rbac | cart | queue
  --threshold <num>     Minimum quality score required to pass CI (default: 60)
  --json                Output raw JSON telemetry
  --help                Show this help screen

Examples:
  node cli/sentinel.js --scenario stripe
  node cli/sentinel.js --scenario rbac --threshold 70
  node cli/sentinel.js --diff ./changes.patch --intent "Refactor billing"
`);
}

const SAMPLE_SCENARIOS = {
  stripe: {
    title: 'feat(payments): add idempotency lock to refund webhook handler',
    desc: 'Prevent double payouts via Redis lock',
    diff: `@@ -12,5 +12,19 @@ export async function processRefundWebhook(event: WebhookEvent) {
+  const lockKey = \`lock:refund:\${refundId}\`;
+  const acquired = await redisClient.set(lockKey, 'processing');
+  if (!acquired) return { status: 'already_processing' };
+  const formattedAmount = Math.floor(amount * 100) / 10000;
+  const result = await db.refunds.create({ refundId, amount: formattedAmount });
+  await redisClient.del(lockKey);
+  return { status: 'processed', id: result.id };
 }`
  },
  rbac: {
    title: 'perf(auth): cache user role permissions in Redis',
    desc: 'Cache user permissions for 5 minutes',
    diff: `@@ -18,6 +18,16 @@ export async function getUserRole(userId: string, tenantId: string) {
+  const cacheKey = \`auth:user:\${userId}:role\`;
+  const cached = await redis.get(cacheKey);
+  if (cached) return cached;
+  const member = await db.organizationMembers.findUnique({ where: { userId_tenantId: { userId, tenantId } } });
+  await redis.set(cacheKey, member.role, { ex: 300 });
+  return member.role;
 }`
  },
  cart: {
    title: 'feat(checkout): allow stacking seasonal promo with VIP voucher',
    desc: 'Deduct percentage promo followed by fixed voucher',
    diff: `@@ -45,3 +45,12 @@ export function computeCartTotal(cart: Cart, promo?: PromoCode, vip?: VipVoucher)
+  let total = cart.subtotal;
+  if (promo?.percent) total = total - (total * (promo.percent / 100));
+  if (vip?.fixedAmount) total = total - vip.fixedAmount;
+  return total;
 }`
  },
  queue: {
    title: 'fix(worker): add exponential backoff retry for network errors',
    desc: 'Retry 3 times with exponential backoff',
    diff: `@@ -30,2 +30,15 @@ export async function handleIncomingMessage(msg: KafkaMessage) {
+  let attempts = 0;
+  while (attempts < 3) {
+    try { return await emailClient.send(msg.value); }
+    catch (err) {
+      attempts++;
+      const waitMs = Math.pow(2, attempts) * 1000;
+      const start = Date.now();
+      while (Date.now() - start < waitMs) { /* busy wait */ }
+    }
+  }
+  logger.error('Failed after retries', { msgId: msg.id });
 }`
  }
};

async function main() {
  if (args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let rawDiff = '';
  let intent = 'Software Code Change';
  let desc = 'Automated CLI inspection';
  let threshold = 60;
  let outputJson = args.includes('--json');

  const diffIdx = args.indexOf('--diff');
  if (diffIdx !== -1 && args[diffIdx + 1]) {
    const diffPath = path.resolve(process.cwd(), args[diffIdx + 1]);
    if (!fs.existsSync(diffPath)) {
      console.error(`Error: File not found at ${diffPath}`);
      process.exit(1);
    }
    rawDiff = fs.readFileSync(diffPath, 'utf-8');
  }

  const scenarioIdx = args.indexOf('--scenario');
  if (scenarioIdx !== -1 && args[scenarioIdx + 1]) {
    const scKey = args[scenarioIdx + 1].toLowerCase();
    const sc = SAMPLE_SCENARIOS[scKey];
    if (sc) {
      intent = sc.title;
      desc = sc.desc;
      rawDiff = sc.diff;
    } else {
      console.error(`Unknown scenario "${scKey}". Choose from: stripe, rbac, cart, queue`);
      process.exit(1);
    }
  }

  const intentIdx = args.indexOf('--intent');
  if (intentIdx !== -1 && args[intentIdx + 1]) {
    intent = args[intentIdx + 1];
  }

  const threshIdx = args.indexOf('--threshold');
  if (threshIdx !== -1 && args[threshIdx + 1]) {
    threshold = parseInt(args[threshIdx + 1], 10);
  }

  if (!rawDiff) {
    // Default to stripe demo
    intent = SAMPLE_SCENARIOS.stripe.title;
    desc = SAMPLE_SCENARIOS.stripe.desc;
    rawDiff = SAMPLE_SCENARIOS.stripe.diff;
  }

  const result = evaluateSoftwareChange(intent, desc, rawDiff);

  if (outputJson) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.overallQualityScore >= threshold ? 0 : 1);
  }

  console.log('\n================================================================');
  console.log('🛡️   SENTINEL SQI | SOFTWARE QUALITY INTELLIGENCE AUDIT');
  console.log('================================================================\n');

  console.log(`PR Intent:     ${result.prTitle}`);
  console.log(`Files Analyzed: ${result.diffsCount}`);
  console.log(`Quality Score:  ${result.overallQualityScore} / 100  (Threshold: ${threshold})`);
  console.log(`Test Adequacy:  ${result.semanticTestAdequacyScore} %`);
  console.log(`Regression Risk:${result.regressionRiskScore} %\n`);

  if (result.hazards.length > 0) {
    console.log('🚨 DETECTED ARCHITECTURAL & SEMANTIC HAZARDS:');
    result.hazards.forEach((h, idx) => {
      console.log(`  [${idx + 1}] [${h.severity.toUpperCase()}] ${h.hazardType}`);
      console.log(`      ${h.description}\n`);
    });
  } else {
    console.log('✅ No severe architectural hazards detected.\n');
  }

  console.log('----------------------------------------------------------------');
  if (result.overallQualityScore >= threshold) {
    console.log(`VERDICT: ✅ APPROVED (Score ${result.overallQualityScore} >= ${threshold})`);
    console.log('----------------------------------------------------------------\n');
    process.exit(0);
  } else {
    console.log(`VERDICT: ❌ ${result.decision} (Score ${result.overallQualityScore} < ${threshold})`);
    console.log('REASON: Semantic test adequacy blindspots or critical invariant hazards.');
    console.log('----------------------------------------------------------------\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

