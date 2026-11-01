import { BenchmarkScenario } from '../types/sqi';

export const BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'stripe-idempotency-hazard',
    title: 'Fintech: Webhook Refund Idempotency & Precision Loss',
    category: 'Payment Systems / Concurrency',
    badge: 'Subtle Semantic Drift',
    description: 'Developer attempted to fix double-refunding by introducing an idempotency lock, but introduced a permanent lock leak on failure, precision loss on fractional cents, and broke the accounting ledger sync contract.',
    prTitle: 'feat(payments): add idempotency lock to refund webhook handler to prevent duplicate payouts',
    prDescription: `## Context
We noticed duplicate webhook events from Stripe when network timeouts occur, leading to double-refund transactions in rare cases.

## Changes
- Implemented an idempotency check using Redis cache in \`processRefundWebhook\`.
- Cleaned up currency conversion logic for refund amount calculation.
- All existing tests pass with 98% line coverage.`,
    traditionalCITestResult: 'PASS',
    traditionalCoveragePct: 98,
    underlyingHazard: 'Existing tests pass because they only mock the happy path. If downstream DB throws, the Redis lock never expires (causing permanent deadlock on retry). Also, currency truncation drops fractional cents, and ledgerTxId return contract was broken.',
    diffs: [
      {
        filename: 'src/payments/refundHandler.ts',
        status: 'modified',
        additions: 19,
        deletions: 5,
        language: 'typescript',
        extractedSymbols: {
          functions: ['processRefundWebhook', 'formatCurrencyAmount'],
          classes: ['RefundProcessor'],
          imports: ['redisClient', 'accountingLedger', 'db'],
          exports: ['processRefundWebhook'],
          modifiedVariables: ['lockKey', 'formattedAmount']
        },
        rawDiff: `@@ -12,5 +12,19 @@ export async function processRefundWebhook(event: WebhookEvent) {
   const { refundId, amount, currency } = event.data;
+  
+  // Lock refund to prevent race condition
+  const lockKey = \`lock:refund:\${refundId}\`;
+  const acquired = await redisClient.set(lockKey, 'processing');
+  if (!acquired) {
+    logger.warn(\`Duplicate webhook ignored for refund \${refundId}\`);
+    return { status: 'already_processing' };
+  }
 
-  const formattedAmount = amount / 100;
-  const result = await db.refunds.create({ refundId, amount: formattedAmount });
-  await accountingLedger.record({ refundId, ledgerTxId: result.id, amount });
-  return result;
+  // Format currency
+  const formattedAmount = Math.floor(amount * 100) / 10000;
+  const result = await db.refunds.create({ refundId, amount: formattedAmount });
+  
+  // Omitted ledgerTxId in return payload
+  await accountingLedger.record({ refundId, amount: formattedAmount });
+  await redisClient.del(lockKey);
+  return { status: 'processed', id: result.id };
 }`
      }
    ],
    defaultReport: {
      timestamp: new Date().toISOString(),
      scenarioId: 'stripe-idempotency-hazard',
      prTitle: 'feat(payments): add idempotency lock to refund webhook handler to prevent duplicate payouts',
      prDescription: 'Add idempotency lock to refund webhook handler to prevent duplicate payouts',
      author: 'alex.dev@fintech.io',
      commitHash: '7f9a2e1',
      overallQualityScore: 42,
      intentFidelityScore: 68,
      blastRadiusScore: 35,
      semanticTestAdequacyScore: 28,
      regressionRiskScore: 84,
      confidenceIndex: 94,
      intentPillar: {
        summary: 'Intent was to prevent duplicate payouts via idempotency. While the primary lock check was added, it failed to guarantee lock release on failure and silently altered financial precision calculation.',
        intendedBehaviors: [
          'Prevent duplicate webhook executions from generating redundant financial transactions',
          'Safely handle duplicate Stripe webhook delivery retries'
        ],
        unintendedSideEffects: [
          'If db.refunds.create throws, redisClient.del is never reached, permanently deadlocking legitimate retry attempts',
          'Math.floor precision calculation introduces 1-cent discrepancy on fractional currency conversions (audit failure)',
          'Removed ledgerTxId from return structure, violating the downstream webhook caller contract'
        ],
        semanticDriftDetected: true,
        semanticDriftDetails: 'High semantic drift: The implementation mutated the currency computation formula and omitted error-boundary cleanup, converting transient failures into permanent system lockouts.'
      },
      contextBlastRadius: {
        directFilesChanged: 1,
        transitiveModulesImpacted: 4,
        affectedWorkflows: [
          'Stripe Webhook Ingestion Engine',
          'General Ledger Reconciliation Daily Audit',
          'Customer Account Balance Service',
          'Automated Dispute Resolution Pipeline'
        ],
        architecturalViolations: [
          'Distributed lock acquired without TTL (Time-To-Live) expiry parameter',
          'Missing try/finally cleanup block around external state lock'
        ],
        dataModelRisks: [
          'Ledger mismatch: database record amount != Stripe original webhook payload amount',
          'Orphaned processing locks in Redis cluster'
        ],
        overallBlastRadiusScore: 78,
        nodes: [
          {
            id: 'refundHandler',
            name: 'refundHandler.ts::processRefundWebhook',
            type: 'function',
            layer: 'entrypoint',
            impactLevel: 'direct',
            riskScore: 88,
            affectedWorkflows: ['Webhook Ingestion'],
            callerCount: 2,
            description: 'Directly modified entrypoint with unhandled lock deadlock'
          },
          {
            id: 'redisClient',
            name: 'Infrastructure::RedisCluster',
            type: 'external_service',
            layer: 'infrastructure',
            impactLevel: 'direct',
            riskScore: 75,
            affectedWorkflows: ['Idempotency Guard'],
            callerCount: 14,
            description: 'Subject to permanent key leakage on unhandled exceptions'
          },
          {
            id: 'accountingLedger',
            name: 'accountingLedger.ts::record',
            type: 'module',
            layer: 'domain',
            impactLevel: 'indirect',
            riskScore: 82,
            affectedWorkflows: ['General Ledger Reconciliation'],
            callerCount: 6,
            description: 'Downstream consumer broken due to missing ledgerTxId mapping'
          },
          {
            id: 'dbRefunds',
            name: 'PostgreSQL::RefundsTable',
            type: 'database_model',
            layer: 'storage',
            impactLevel: 'indirect',
            riskScore: 60,
            affectedWorkflows: ['Audit Trail'],
            callerCount: 9,
            description: 'Stores mutated floating point values diverging from gateway source of truth'
          }
        ],
        edges: [
          { source: 'refundHandler', target: 'redisClient', relationship: 'writes_state', isVulnerable: true, notes: 'Missing TTL and missing finally cleanup' },
          { source: 'refundHandler', target: 'accountingLedger', relationship: 'calls', isVulnerable: true, notes: 'Contract change: ledgerTxId omitted' },
          { source: 'refundHandler', target: 'dbRefunds', relationship: 'writes_state', isVulnerable: false }
        ]
      },
      validationPillar: {
        summary: 'Conventional test suite reported 98% line coverage because mock tests ran only happy path execution. Zero tests asserted exception recovery, lock release invariants, or fractional currency edge cases.',
        lineCoverageSummary: 98,
        semanticAdequacySummary: 28,
        falsePositiveTestsCount: 3,
        untestedEdgeCasesCount: 4,
        assertionRequirements: [
          {
            id: 'ar-1',
            requirementTitle: 'Distributed Lock Release on Downstream Database Failure',
            category: 'fault_tolerance',
            status: 'superficial_pass',
            lineCoveragePct: 100,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'Existing test mocks db.refunds.create as resolved and verifies status == "processed". It never tests when db throws an error.',
            criticalMissingAssertion: 'expect(await redisClient.get(lockKey)).toBeNull() after DB exception',
            potentialIncidentScenario: 'Network blip to PostgreSQL leaves Redis lock set indefinitely. Subsequent retry webhooks get "already_processing" and customer refund is dropped permanently.',
            severity: 'critical'
          },
          {
            id: 'ar-2',
            requirementTitle: 'Currency Conversion Precision & Rounding Invariant',
            category: 'boundary_condition',
            status: 'untested_edge_case',
            lineCoveragePct: 100,
            semanticAssertionPct: 20,
            existingTestCoverageSummary: 'Existing test only tested an exact integer amount: 1000 ($10.00).',
            criticalMissingAssertion: 'assertExactCentPrecision(formatCurrencyAmount(1999)) === 19.99',
            potentialIncidentScenario: 'Subtle math formula truncation causes fractional cent drops on foreign exchange rates, triggering reconciliation discrepancies in month-end financial book closing.',
            severity: 'high'
          },
          {
            id: 'ar-3',
            requirementTitle: 'Accounting Ledger Downstream Contract Preservation',
            category: 'business_logic',
            status: 'regression_vulnerable',
            lineCoveragePct: 90,
            semanticAssertionPct: 15,
            existingTestCoverageSummary: 'Test asserts accountingLedger.record was called, but did not assert argument schema or return signature.',
            criticalMissingAssertion: 'expect(accountingLedger.record).toHaveBeenCalledWith(expect.objectContaining({ ledgerTxId: expect.any(String) }))',
            potentialIncidentScenario: 'Ledger microservice throws schema validation error, silently discarding financial transaction history.',
            severity: 'high'
          },
          {
            id: 'ar-4',
            requirementTitle: 'Concurrent Duplicate Webhook Races within 5ms',
            category: 'concurrency_race',
            status: 'missing_test',
            lineCoveragePct: 0,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'Sequential tests only. No parallel execution test.',
            criticalMissingAssertion: 'Promise.all([process(webhook), process(webhook)]) -> exactly 1 success, 1 duplicate reject',
            potentialIncidentScenario: 'Stripe burst deliveries execute concurrently within same millisecond window.',
            severity: 'medium'
          }
        ]
      },
      generatedTestPatches: [
        {
          id: 'test-patch-1',
          testSuiteTitle: 'should release redis lock even when database throws an unexpected error',
          framework: 'vitest',
          targetComponent: 'src/payments/refundHandler.ts',
          uncoveredInvariant: 'Lock must have TTL and must be cleaned up in finally block',
          failureExplanation: 'Fails in current code because redisClient.del() is placed after db.refunds.create() without a try...finally block.',
          testCode: `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefundWebhook } from '../src/payments/refundHandler';
import { redisClient } from '../src/infrastructure/redis';
import { db } from '../src/database';

describe('processRefundWebhook - Resilience Invariants', () => {
  it('CRITICAL: must release lock when database operation throws an exception', async () => {
    const mockEvent = { data: { refundId: 'rf_test_fail_123', amount: 5000, currency: 'usd' } };
    
    // Simulate DB connection outage
    vi.spyOn(db.refunds, 'create').mockRejectedValueOnce(new Error('Connection timeout to PostgreSQL'));
    
    // Attempt webhook execution
    await expect(processRefundWebhook(mockEvent as any)).rejects.toThrow();
    
    // INVARIANT CHECK: The lock MUST NOT be left in Redis
    const lockExists = await redisClient.get('lock:refund:rf_test_fail_123');
    expect(lockExists).toBeNull();
  });

  it('CRITICAL: lock key must have TTL set to prevent permanent deadlock on hard process crash', async () => {
    const setSpy = vi.spyOn(redisClient, 'set');
    const mockEvent = { data: { refundId: 'rf_ttl_check', amount: 1000, currency: 'usd' } };
    
    await processRefundWebhook(mockEvent as any);
    
    // Invariant: set call must include EX (expiry seconds)
    expect(setSpy).toHaveBeenCalledWith(
      'lock:refund:rf_ttl_check',
      'processing',
      expect.objectContaining({ EX: expect.any(Number) })
    );
  });
});`
        },
        {
          id: 'test-patch-2',
          testSuiteTitle: 'should accurately preserve currency precision across fractional exchanges',
          framework: 'vitest',
          targetComponent: 'src/payments/refundHandler.ts',
          uncoveredInvariant: 'Currency formatting must not truncate fractional amounts',
          failureExplanation: 'Fails because Math.floor(amount * 100) / 10000 incorrectly alters fractional units.',
          testCode: `it('ACCURACY: handles non-trivial cents without rounding drift', async () => {
  const mockEvent = { data: { refundId: 'rf_fractional_1', amount: 1499, currency: 'usd' } };
  const createSpy = vi.spyOn(db.refunds, 'create').mockResolvedValue({ id: 'tx_999' } as any);
  
  await processRefundWebhook(mockEvent as any);
  
  // Must be exactly 14.99, not truncated or floated
  expect(createSpy).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 14.99 })
  );
});`
        }
      ],
      executiveRecommendations: {
        status: 'BLOCK_CI',
        reasons: [
          'High Risk of Deadlock: Distributed lock lacks TTL and finally block cleanup',
          'Downstream Contract Breach: ledgerTxId omitted from accounting payload',
          'False Sense of Security: 98% line coverage masks catastrophic failure modes'
        ],
        immediateActionItems: [
          'Wrap processRefundWebhook in try...finally to ensure redisClient.del(lockKey) executes unconditionally',
          'Pass { EX: 60 } to redisClient.set to protect against node crashes',
          'Restore ledgerTxId in accountingLedger.record invocation',
          'Merge generated invariant test suite into CI gate'
        ],
        longTermArchitecturalNotes: [
          'Adopt the Transactional Outbox Pattern for financial event dispatch rather than inline dual-writes to Redis & Postgres',
          'Enforce schema contract testing with Pact or Zod for all cross-module boundaries'
        ]
      },
      diffs: []
    }
  },
  {
    id: 'rbac-tenant-isolation-breach',
    title: 'SaaS Security: Multi-Tenant RBAC Cache Key Collision',
    category: 'Security / Multi-Tenancy / Auth',
    badge: 'Critical Security Vulnerability',
    description: 'Developer optimized user permission lookups by caching role query results in Redis, but failed to include organizationId/tenantId in the cache key, enabling cross-tenant privilege escalation.',
    prTitle: 'perf(auth): cache user role permissions in Redis to reduce auth middleware latency',
    prDescription: `## Context
Auth middleware was querying PostgreSQL on every incoming API request, causing high DB load at peak hours.

## Changes
- Cached user role in Redis for 5 minutes.
- Verified in staging that response times dropped from 45ms to 3ms.
- 100% of auth unit tests pass.`,
    traditionalCITestResult: 'PASS',
    traditionalCoveragePct: 100,
    underlyingHazard: 'Tests only checked users within a single organization context. When an employee belongs to Org A (Admin) and Org B (Viewer), accessing Org A primes the cache with "Admin" for their userId, granting unauthorized Admin powers in Org B.',
    diffs: [
      {
        filename: 'src/middleware/authorize.ts',
        status: 'modified',
        additions: 14,
        deletions: 4,
        language: 'typescript',
        extractedSymbols: {
          functions: ['requireRole', 'getUserRole'],
          classes: [],
          imports: ['redis', 'db', 'ForbiddenError'],
          exports: ['requireRole'],
          modifiedVariables: ['cacheKey', 'cachedRole']
        },
        rawDiff: `@@ -18,6 +18,16 @@ export async function getUserRole(userId: string, tenantId: string): Promise<string> {
-  const member = await db.organizationMembers.findUnique({
-    where: { userId_tenantId: { userId, tenantId } }
-  });
-  return member?.role ?? 'guest';
+  // Optimization: Cache user role for 5 minutes
+  const cacheKey = \`auth:user:\${userId}:role\`;
+  const cached = await redis.get(cacheKey);
+  if (cached) return cached;
+
+  const member = await db.organizationMembers.findUnique({
+    where: { userId_tenantId: { userId, tenantId } }
+  });
+  const role = member?.role ?? 'guest';
+  await redis.set(cacheKey, role, { ex: 300 });
+  return role;
 }`
      }
    ],
    defaultReport: {
      timestamp: new Date().toISOString(),
      scenarioId: 'rbac-tenant-isolation-breach',
      prTitle: 'perf(auth): cache user role permissions in Redis to reduce auth middleware latency',
      prDescription: 'Cache user role permissions in Redis to reduce auth middleware latency',
      author: 'dev.sam@cloudplatform.com',
      commitHash: '3d8c11e',
      overallQualityScore: 24,
      intentFidelityScore: 55,
      blastRadiusScore: 12,
      semanticTestAdequacyScore: 18,
      regressionRiskScore: 96,
      confidenceIndex: 98,
      intentPillar: {
        summary: 'Intent was to reduce DB latency on authentication. However, the cache key was scoped solely to userId rather than the composite key (userId + tenantId), introducing a catastrophic privilege escalation flaw across tenants.',
        intendedBehaviors: [
          'Accelerate authorization checks by caching expensive database role queries'
        ],
        unintendedSideEffects: [
          'Cross-tenant privilege escalation: Users gain Admin privileges in secondary orgs if they are an Admin in their primary org',
          'Role revocation lag: Immediate role downgrades or revokes are ignored for 300 seconds'
        ],
        semanticDriftDetected: true,
        semanticDriftDetails: 'Tenant isolation contract was completely erased from the caching layer.'
      },
      contextBlastRadius: {
        directFilesChanged: 1,
        transitiveModulesImpacted: 18,
        affectedWorkflows: [
          'All Protected API Endpoints (/api/v1/projects, /api/v1/billing, /api/v1/users)',
          'Multi-Tenant Tenant Boundary Enforcement',
          'Audit Log Attribution System'
        ],
        architecturalViolations: [
          'Tenant-agnostic key generation in a strictly multi-tenant domain',
          'Absence of cache invalidation webhook on membership change events'
        ],
        dataModelRisks: [
          'Data leak between competing corporate tenants',
          'Unauthorized data mutations under spoofed permissions'
        ],
        overallBlastRadiusScore: 95,
        nodes: [
          {
            id: 'authorizeMiddleware',
            name: 'authorize.ts::getUserRole',
            type: 'function',
            layer: 'entrypoint',
            impactLevel: 'direct',
            riskScore: 99,
            affectedWorkflows: ['All API Gateways'],
            callerCount: 24,
            description: 'Critical security vulnerability: tenantId dropped in cache key'
          },
          {
            id: 'apiGateway',
            name: 'routes/api/*',
            type: 'api_route',
            layer: 'entrypoint',
            impactLevel: 'indirect',
            riskScore: 92,
            affectedWorkflows: ['Core Platform'],
            callerCount: 80,
            description: 'Every route relying on requireRole() inherits the privilege leak'
          },
          {
            id: 'tenantIsolation',
            name: 'Domain::TenantBoundary',
            type: 'module',
            layer: 'domain',
            impactLevel: 'direct',
            riskScore: 95,
            affectedWorkflows: ['SOC2 & Compliance'],
            callerCount: 15,
            description: 'Violates fundamental SaaS data isolation security guarantees'
          }
        ],
        edges: [
          { source: 'authorizeMiddleware', target: 'apiGateway', relationship: 'calls', isVulnerable: true, notes: 'Propagates falsified permission level' },
          { source: 'authorizeMiddleware', target: 'tenantIsolation', relationship: 'reads_state', isVulnerable: true, notes: 'Bypasses org segregation' }
        ]
      },
      validationPillar: {
        summary: 'Conventional unit tests ran with single tenant fixtures, achieving 100% line coverage while missing the multi-tenant context switch entirely.',
        lineCoverageSummary: 100,
        semanticAdequacySummary: 18,
        falsePositiveTestsCount: 4,
        untestedEdgeCasesCount: 5,
        assertionRequirements: [
          {
            id: 'ar-sec-1',
            requirementTitle: 'Strict Multi-Tenant Cache Key Isolation',
            category: 'security_auth',
            status: 'superficial_pass',
            lineCoveragePct: 100,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'Tests only queried single user with single tenant: getUserRole("u1", "t1") -> "admin".',
            criticalMissingAssertion: 'expect(getUserRole("u1", "tenant_a")).not.toEqual(getUserRole("u1", "tenant_b"))',
            potentialIncidentScenario: 'A contractor who is Admin at Agency A logs into Client B (where they are only Viewer). They gain Admin privileges to download Client B private databases.',
            severity: 'critical'
          },
          {
            id: 'ar-sec-2',
            requirementTitle: 'Role Invalidation on Admin Revocation Event',
            category: 'business_logic',
            status: 'missing_test',
            lineCoveragePct: 0,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'No invalidation test present.',
            criticalMissingAssertion: 'await removeUserFromOrg(); expect(await getUserRole()).toBe("guest")',
            potentialIncidentScenario: 'Terminated employee retains full write access for 5 minutes after termination.',
            severity: 'high'
          }
        ]
      },
      generatedTestPatches: [
        {
          id: 'test-patch-sec-1',
          testSuiteTitle: 'CRITICAL SECURITY: prevent role leakage across different tenants for same user',
          framework: 'vitest',
          targetComponent: 'src/middleware/authorize.ts',
          uncoveredInvariant: 'Cache key must be composite of userId AND tenantId',
          failureExplanation: 'Fails in current implementation because auth:user:123:role will be returned for any tenant requested by user 123.',
          testCode: `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserRole } from '../src/middleware/authorize';
import { db } from '../src/database';
import { redis } from '../src/infrastructure/redis';

describe('Multi-Tenant RBAC Isolation Security Tests', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  it('MUST NOT leak permissions across different organizations for same user', async () => {
    const userId = 'user_contractor_99';
    const tenantPrimary = 'org_vip_admin_corp';
    const tenantSecondary = 'org_external_client';

    // Mock DB: user is 'admin' in tenantPrimary, but only 'viewer' in tenantSecondary
    vi.spyOn(db.organizationMembers, 'findUnique').mockImplementation((({ where }: any) => {
      if (where.userId_tenantId.tenantId === tenantPrimary) {
        return Promise.resolve({ role: 'admin' });
      }
      return Promise.resolve({ role: 'viewer' });
    }) as any);

    // 1. User performs action in their primary tenant -> primes cache with 'admin'
    const primaryRole = await getUserRole(userId, tenantPrimary);
    expect(primaryRole).toBe('admin');

    // 2. User performs action in secondary tenant -> MUST NOT return 'admin'
    const secondaryRole = await getUserRole(userId, tenantSecondary);
    expect(secondaryRole).toBe('viewer'); // CURRENT IMPLEMENTATION FAILS HERE (returns 'admin')
  });
});`
        }
      ],
      executiveRecommendations: {
        status: 'BLOCK_CI',
        reasons: [
          'CRITICAL SECURITY HAZARD: Cache key collision permits unauthorized privilege escalation across corporate tenants',
          'Breaches SOC2 Type II Multi-Tenant isolation requirements'
        ],
        immediateActionItems: [
          'Update cacheKey formulation to: `auth:tenant:${tenantId}:user:${userId}:role`',
          'Add automated multi-tenant boundary test suite to security regression suite',
          'Flush all auth redis caches immediately upon deploy'
        ],
        longTermArchitecturalNotes: [
          'Adopt structured cache key builder utilities with compile-time type validation that mandate tenantId inclusion'
        ]
      },
      diffs: []
    }
  },
  {
    id: 'ecommerce-cart-negative-total',
    title: 'E-Commerce: Discount Order of Operations & Negative Total',
    category: 'E-Commerce / Business Rules',
    badge: 'Boundary Underflow Bug',
    description: 'Developer introduced stacking of seasonal coupon codes with VIP loyalty credits, but an order-of-operations oversight allows cart totals to underflow to negative balances.',
    prTitle: 'feat(checkout): allow stacking of seasonal percentage promos with fixed VIP vouchers',
    prDescription: `## Context
Marketing requested allowing VIP loyalty $50 gift vouchers to be used alongside the 40% Black Friday discount code.

## Changes
- Applied percentage discount first, followed by fixed voucher deduction.
- 100% unit tests pass for normal cart values ($200+).`,
    traditionalCITestResult: 'PASS',
    traditionalCoveragePct: 100,
    underlyingHazard: 'Tests only checked large carts ($200+). When a user buys a $60 item with a 40% discount ($36) and applies a $50 VIP voucher, the final cart total becomes -$14! Payment gateway crashes or credits free money.',
    diffs: [
      {
        filename: 'src/pricing/cartCalculator.ts',
        status: 'modified',
        additions: 12,
        deletions: 3,
        language: 'typescript',
        extractedSymbols: {
          functions: ['computeCartTotal', 'applyDiscounts'],
          classes: ['CartPricingEngine'],
          imports: ['Cart', 'PromoCode', 'VipVoucher'],
          exports: ['computeCartTotal'],
          modifiedVariables: ['discountedSubtotal', 'finalTotal']
        },
        rawDiff: `@@ -45,3 +45,12 @@ export function computeCartTotal(cart: Cart, promo?: PromoCode, vip?: VipVoucher)
-  const total = cart.subtotal - (promo?.amount || 0);
-  return Math.max(0, total);
+  let total = cart.subtotal;
+
+  // Step 1: Apply percentage seasonal promo
+  if (promo?.percent) {
+    total = total - (total * (promo.percent / 100));
+  }
+
+  // Step 2: Apply fixed VIP voucher
+  if (vip?.fixedAmount) {
+    total = total - vip.fixedAmount; // Bug: Missing Math.max(0, total) boundary clamp
+  }
+
+  return total;
 }`
      }
    ],
    defaultReport: {
      timestamp: new Date().toISOString(),
      scenarioId: 'ecommerce-cart-negative-total',
      prTitle: 'feat(checkout): allow stacking of seasonal percentage promos with fixed VIP vouchers',
      prDescription: 'Allow stacking of seasonal percentage promos with fixed VIP vouchers',
      author: 'jordan.commerce@store.com',
      commitHash: '8b10f44',
      overallQualityScore: 48,
      intentFidelityScore: 72,
      blastRadiusScore: 50,
      semanticTestAdequacyScore: 35,
      regressionRiskScore: 78,
      confidenceIndex: 96,
      intentPillar: {
        summary: 'Intent was to enable promo code stacking. Implementation correctly calculated percentage followed by fixed deduction, but omitted the non-negative monetary boundary invariant.',
        intendedBehaviors: [
          'Permit customers with VIP vouchers to also apply seasonal discount codes'
        ],
        unintendedSideEffects: [
          'Cart totals can become negative when voucher amount exceeds discounted subtotal',
          'Downstream payment processing will fail or erroneously issue credits to customer accounts'
        ],
        semanticDriftDetected: true,
        semanticDriftDetails: 'Violates core domain invariant: Cart total must always be >= 0.'
      },
      contextBlastRadius: {
        directFilesChanged: 1,
        transitiveModulesImpacted: 5,
        affectedWorkflows: [
          'Checkout Payment Authorization',
          'Invoice Generation Service',
          'Tax Calculation Engine (Vertex/Avalara)',
          'Order Fulfillment Routing'
        ],
        architecturalViolations: [
          'Removal of domain boundary clamp `Math.max(0, total)` without substitute validator'
        ],
        dataModelRisks: [
          'Negative total persisted in Orders database table',
          'Tax service error due to negative taxable base'
        ],
        overallBlastRadiusScore: 68,
        nodes: [
          {
            id: 'cartCalculator',
            name: 'cartCalculator.ts::computeCartTotal',
            type: 'function',
            layer: 'domain',
            impactLevel: 'direct',
            riskScore: 85,
            affectedWorkflows: ['Cart Pricing'],
            callerCount: 4,
            description: 'Directly removes lower boundary clamp on cart price'
          },
          {
            id: 'paymentGateway',
            name: 'Stripe::PaymentIntents',
            type: 'external_service',
            layer: 'infrastructure',
            impactLevel: 'indirect',
            riskScore: 90,
            affectedWorkflows: ['Checkout Flow'],
            callerCount: 3,
            description: 'Rejects negative charges with 400 Bad Request (halting checkout)'
          },
          {
            id: 'orderTable',
            name: 'Database::Orders',
            type: 'database_model',
            layer: 'storage',
            impactLevel: 'indirect',
            riskScore: 55,
            affectedWorkflows: ['Order Ingestion'],
            callerCount: 12,
            description: 'Database schema expects positive decimal for total_amount'
          }
        ],
        edges: [
          { source: 'cartCalculator', target: 'paymentGateway', relationship: 'calls', isVulnerable: true, notes: 'Throws 400 on negative amount' },
          { source: 'cartCalculator', target: 'orderTable', relationship: 'writes_state', isVulnerable: true, notes: 'Risk of negative balance record' }
        ]
      },
      validationPillar: {
        summary: 'Existing unit tests tested carts with $250 total, $50 voucher, 20% discount ($150 total). No test verified boundary where voucher exceeds discounted price.',
        lineCoverageSummary: 100,
        semanticAdequacySummary: 35,
        falsePositiveTestsCount: 2,
        untestedEdgeCasesCount: 3,
        assertionRequirements: [
          {
            id: 'ar-price-1',
            requirementTitle: 'Cart Total Non-Negative Boundary Invariant',
            category: 'boundary_condition',
            status: 'superficial_pass',
            lineCoveragePct: 100,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'Tests happy path where cart.subtotal is significantly greater than voucher.',
            criticalMissingAssertion: 'expect(computeCartTotal({ subtotal: 30 }, promo, vip)).toBeGreaterThanOrEqual(0)',
            potentialIncidentScenario: 'Customer with $50 loyalty voucher buys $20 item with 50% discount ($10 subtotal). Cart evaluates to -$40, crashing payment provider and freezing checkout.',
            severity: 'critical'
          },
          {
            id: 'ar-price-2',
            requirementTitle: 'Voucher Residual Balance Retention',
            category: 'business_logic',
            status: 'untested_edge_case',
            lineCoveragePct: 60,
            semanticAssertionPct: 20,
            existingTestCoverageSummary: 'Does not test whether leftover voucher credit is preserved for next purchase.',
            criticalMissingAssertion: 'expect(voucher.remainingBalance).toBe(40)',
            potentialIncidentScenario: 'Full voucher is marked spent even when only a fraction was needed to cover cart.',
            severity: 'medium'
          }
        ]
      },
      generatedTestPatches: [
        {
          id: 'test-patch-cart-1',
          testSuiteTitle: 'CRITICAL BOUNDARY: cart total must never underflow below zero',
          framework: 'vitest',
          targetComponent: 'src/pricing/cartCalculator.ts',
          uncoveredInvariant: 'Cart total must clamp at 0 even when voucher exceeds discounted subtotal',
          failureExplanation: 'Fails because total = total - vip.fixedAmount produces negative float (-40).',
          testCode: `import { describe, it, expect } from 'vitest';
import { computeCartTotal } from '../src/pricing/cartCalculator';

describe('Cart Total Monetary Boundary Invariants', () => {
  it('MUST NOT allow cart total to become negative when voucher exceeds subtotal', () => {
    const smallCart = { subtotal: 50 }; // $50 subtotal
    const promo = { percent: 50 };      // 50% off -> $25
    const vipVoucher = { fixedAmount: 50 }; // $50 voucher

    const result = computeCartTotal(smallCart as any, promo, vipVoucher);

    // INVARIANT: Minimum payable total must be 0
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBe(0);
  });
});`
        }
      ],
      executiveRecommendations: {
        status: 'REQUEST_CHANGES',
        reasons: [
          'Missing boundary protection: Cart total can evaluate to negative float',
          'Payment Gateway failure: Negative amounts trigger runtime exceptions on checkout'
        ],
        immediateActionItems: [
          'Add `return Math.max(0, total)` before returning computed total',
          'Ensure tax calculation service receives minimum 0 base'
        ],
        longTermArchitecturalNotes: [
          'Introduce a Value Object (e.g. `Money`) with self-validating invariants preventing negative balances'
        ]
      },
      diffs: []
    }
  },
  {
    id: 'queue-retry-eventloop-block',
    title: 'Cloud Infrastructure: Distributed Queue Sync Sleep & DLQ Drop',
    category: 'Distributed Systems / Event Streams',
    badge: 'Thread Starvation & Message Loss',
    description: 'Developer introduced exponential backoff retry inside an SQS/Kafka consumer, but used synchronous delay that starves node event loop heartbeats and unhandled poison pills drop without DLQ routing.',
    prTitle: 'fix(worker): add exponential backoff retry for downstream network failures',
    prDescription: `## Context
Worker was failing fast on temporary Redis outages and spamming error logs.

## Changes
- Added 3 retry attempts with exponential delay inside message listener.
- All unit tests pass with mocked timers.`,
    traditionalCITestResult: 'PASS',
    traditionalCoveragePct: 95,
    underlyingHazard: 'Mocked timer tests pass. In production, synchronous sleep inside message handlers causes the consumer group to miss broker heartbeats, triggering infinite partition rebalance storms.',
    diffs: [
      {
        filename: 'src/workers/eventConsumer.ts',
        status: 'modified',
        additions: 15,
        deletions: 2,
        language: 'typescript',
        extractedSymbols: {
          functions: ['handleIncomingMessage', 'syncDelay'],
          classes: ['NotificationWorker'],
          imports: ['kafka', 'dlqProducer', 'emailClient'],
          exports: ['handleIncomingMessage'],
          modifiedVariables: ['attempts', 'backoff']
        },
        rawDiff: `@@ -30,2 +30,15 @@ export async function handleIncomingMessage(msg: KafkaMessage) {
+  let attempts = 0;
+  while (attempts < 3) {
+    try {
+      return await emailClient.send(msg.value);
+    } catch (err) {
+      attempts++;
+      // Synchronous block prevents event loop heartbeat
+      const waitMs = Math.pow(2, attempts) * 1000;
+      const start = Date.now();
+      while (Date.now() - start < waitMs) { /* sync busy spin */ }
+    }
+  }
+  // Bug: Dropped message silently instead of publishing to DLQ
+  logger.error('Failed after retries', { msgId: msg.id });
 }`
      }
    ],
    defaultReport: {
      timestamp: new Date().toISOString(),
      scenarioId: 'queue-retry-eventloop-block',
      prTitle: 'fix(worker): add exponential backoff retry for downstream network failures',
      prDescription: 'Add exponential backoff retry for downstream network failures',
      author: 'dev.ops@distributed.io',
      commitHash: '2a49f81',
      overallQualityScore: 31,
      intentFidelityScore: 58,
      blastRadiusScore: 22,
      semanticTestAdequacyScore: 20,
      regressionRiskScore: 92,
      confidenceIndex: 95,
      intentPillar: {
        summary: 'Intent was to gracefully retry transient failures. Implementation used synchronous busy-waiting loop and silently dropped failed messages instead of routing to Dead Letter Queue (DLQ).',
        intendedBehaviors: [
          'Add exponential backoff retry mechanism for transient external service errors'
        ],
        unintendedSideEffects: [
          'Synchronous busy-waiting starves the Node.js event loop, preventing Kafka heartbeat transmission',
          'Permanent poison pill messages are silently dropped without Dead Letter Queue forwarding, causing permanent data loss'
        ],
        semanticDriftDetected: true,
        semanticDriftDetails: 'Broke zero-message-loss guarantee and consumer health monitoring contract.'
      },
      contextBlastRadius: {
        directFilesChanged: 1,
        transitiveModulesImpacted: 8,
        affectedWorkflows: [
          'Kafka Consumer Group Partition Rebalancing',
          'Email Notification Delivery Pipeline',
          'Dead Letter Queue Dead-Message Auditing'
        ],
        architecturalViolations: [
          'Synchronous busy-waiting in asynchronous Node.js runtime',
          'Dropping failed unprocessable messages without DLQ dead-letter routing'
        ],
        dataModelRisks: [
          'Silent loss of customer critical notification events',
          'Broker repeatedly revoking partition ownership due to missed heartbeats'
        ],
        overallBlastRadiusScore: 89,
        nodes: [
          {
            id: 'eventConsumer',
            name: 'eventConsumer.ts::handleIncomingMessage',
            type: 'function',
            layer: 'entrypoint',
            impactLevel: 'direct',
            riskScore: 95,
            affectedWorkflows: ['Event Ingestion'],
            callerCount: 1,
            description: 'Blocks event loop and silently discards failed messages'
          },
          {
            id: 'kafkaCluster',
            name: 'Kafka::ConsumerGroupCoordinator',
            type: 'external_service',
            layer: 'infrastructure',
            impactLevel: 'indirect',
            riskScore: 90,
            affectedWorkflows: ['Broker Cluster'],
            callerCount: 10,
            description: 'Ejects worker node after 10s of missed heartbeats'
          },
          {
            id: 'dlqQueue',
            name: 'Kafka::DeadLetterQueue',
            type: 'external_service',
            layer: 'infrastructure',
            impactLevel: 'indirect',
            riskScore: 85,
            affectedWorkflows: ['Error Recovery'],
            callerCount: 2,
            description: 'Bypassed: messages vanish into log file only'
          }
        ],
        edges: [
          { source: 'eventConsumer', target: 'kafkaCluster', relationship: 'calls', isVulnerable: true, notes: 'Heartbeat starvation causes cluster rebalance' },
          { source: 'eventConsumer', target: 'dlqQueue', relationship: 'triggers_event', isVulnerable: true, notes: 'Missing DLQ publish call' }
        ]
      },
      validationPillar: {
        summary: 'Unit tests mocked timers and tested only that 3 attempts were made. Unit test environment did not monitor event loop latency or DLQ routing.',
        lineCoverageSummary: 95,
        semanticAdequacySummary: 20,
        falsePositiveTestsCount: 3,
        untestedEdgeCasesCount: 4,
        assertionRequirements: [
          {
            id: 'ar-queue-1',
            requirementTitle: 'Dead Letter Queue Routing on Final Retry Exhaustion',
            category: 'fault_tolerance',
            status: 'regression_vulnerable',
            lineCoveragePct: 100,
            semanticAssertionPct: 0,
            existingTestCoverageSummary: 'Unit test asserted logger.error was called after 3 retries.',
            criticalMissingAssertion: 'expect(dlqProducer.send).toHaveBeenCalledWith(expect.objectContaining({ originalMessage: msg }))',
            potentialIncidentScenario: 'Poison pill message fails 3 times and is dropped forever. Customer password reset email is never delivered.',
            severity: 'critical'
          },
          {
            id: 'ar-queue-2',
            requirementTitle: 'Non-Blocking Asynchronous Delay Invariant',
            category: 'concurrency_race',
            status: 'superficial_pass',
            lineCoveragePct: 100,
            semanticAssertionPct: 10,
            existingTestCoverageSummary: 'Test ran with fake timers so busy-spin loop executed in 0ms.',
            criticalMissingAssertion: 'await expect(eventLoopDelay()).toBeLessThan(50)',
            potentialIncidentScenario: 'Worker node becomes unresponsive under load, orchestrator kills container as unhealthy.',
            severity: 'high'
          }
        ]
      },
      generatedTestPatches: [
        {
          id: 'test-patch-queue-1',
          testSuiteTitle: 'CRITICAL RESILIENCE: messages failing retries must be published to DLQ',
          framework: 'vitest',
          targetComponent: 'src/workers/eventConsumer.ts',
          uncoveredInvariant: 'Failed messages must never be dropped silently',
          failureExplanation: 'Fails because current code merely calls logger.error and returns, dropping the event.',
          testCode: `import { describe, it, expect, vi } from 'vitest';
import { handleIncomingMessage } from '../src/workers/eventConsumer';
import { dlqProducer } from '../src/infrastructure/dlq';
import { emailClient } from '../src/services/email';

describe('Queue Reliability Invariants', () => {
  it('MUST forward message to DLQ after retry exhaustion to prevent message loss', async () => {
    const poisonMessage = { id: 'msg_987', value: { to: 'bad@invalid', body: 'Hello' } };
    
    vi.spyOn(emailClient, 'send').mockRejectedValue(new Error('Permanent SMTP rejection'));
    const dlqSpy = vi.spyOn(dlqProducer, 'send').mockResolvedValue({} as any);

    await handleIncomingMessage(poisonMessage as any);

    // INVARIANT: Message must be archived in DLQ
    expect(dlqSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'msg_987',
        error: expect.stringContaining('Permanent SMTP rejection')
      })
    );
  });
});`
        }
      ],
      executiveRecommendations: {
        status: 'BLOCK_CI',
        reasons: [
          'Data Loss: Messages failing retry are dropped without DLQ retention',
          'Cluster Instability: Busy-spin loop blocks Node.js event loop causing heartbeat failures'
        ],
        immediateActionItems: [
          'Replace busy-spin while loop with `await new Promise(res => setTimeout(res, waitMs))`',
          'Publish message to `dlqProducer.send` before returning from retry exhaustion',
          'Adopt broker-managed retry topics instead of in-process sleep loops'
        ],
        longTermArchitecturalNotes: [
          'Use Temporal or SQS visibility timeout backoff for resilient retry orchestration'
        ]
      },
      diffs: []
    }
  }
];

