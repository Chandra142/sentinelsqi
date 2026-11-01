# 🛡️ SentinelSQI | AI-Powered Software Quality Intelligence System
> Built for the **Myco Engineering Assessment**

[![Node.js](https://img.shields.io/badge/Node.js-v25.5.0-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-7%20Passed-emerald)](file:///tests/sqi.test.js)

---

## 🎯 Executive Summary & Problem Addressed

Software engineering teams ship code every day. However, **a piece of code working as expected in isolation doesn't necessarily mean it is correct.**

Conventional CI/CD tools rely on a dangerous fallacy: **"If tests pass and coverage is high, the change is safe."**
1. **The Mocking Illusion:** Engineers write unit tests that mock external dependencies to always return success. The test suite executes 100% of lines, but never tests what happens when network timeouts, concurrency races, or unhandled errors occur.
2. **Context Blindness:** A change might satisfy an isolated ticket requirement while silently breaking downstream caller contracts, leaking distributed locks, or breaching multi-tenant boundaries.
3. **Semantic Drift:** The developer's stated requirement (PR description, ticket context) often diverges subtly from the actual AST code mutations.

**SentinelSQI** is a functional prototype built to solve this problem. It ingests **what the developer intended**, examines the change in the **context of the existing software**, and evaluates whether the implementation has been **semantically validated** before shipping to production.

---

## 🌟 Key Features

- **Intent vs. Reality Engine:** Extracts requirements from PR titles, descriptions, and commit history, comparing them with AST deltas to flag semantic drift and unintended side effects.
- **Contextual Blast Radius Graph:** Visualizes call hierarchies, impacted entrypoints, downstream callers, database tables, and external infrastructure (Redis, Kafka, PostgreSQL).
- **Semantic Test Adequacy Matrix:** Exposes **"Superficial Pass"** tests that execute code without asserting invariants, highlights **untested edge cases**, and identifies **regression hazards**.
- **Automated Invariant Test Synthesizer:** Automatically generates executable Vitest/Jest unit tests targeting the exact uncovered failure boundaries and invariants.
- **Live Diff Playground:** Test any custom Git diff and PR description in real time with either the deterministic cognitive engine or live Google Gemini AI.
- **CLI & CI/CD Pipeline Gating:** Run `node cli/sentinel.js` in GitHub Actions to block PRs (`exit 1`) when quality scores drop below acceptable thresholds.
- **Full CI/CD Audit Export:** Exports Markdown comments for GitHub PR review bots and JSON telemetry for CI pipelines.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js:** v18+ (tested on Node v25.5.0)
- **npm:** v9+

### 2. Run the Interactive Web UI
```bash
# Start Vite development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

Or build and preview the optimized production bundle:
```bash
npm run build
npm run preview
```

### 3. Run the CLI Tool
Analyze any diff directly in your terminal:
```bash
# Run on pre-built benchmark scenario (e.g. stripe idempotency hazard)
node cli/sentinel.js --scenario stripe

# Run with custom threshold (exits with code 1 if quality < threshold)
node cli/sentinel.js --scenario rbac --threshold 70

# Run on custom diff patch file
node cli/sentinel.js --diff ./sample.patch --intent "Add payment lock"

# Output machine-readable JSON for CI pipelines
node cli/sentinel.js --scenario queue --json
```

### 4. Run Automated Unit Tests
```bash
npm test
```
Runs the native Node test suite verifying the AST diff parser, hazard detectors, and scoring engine.

### 5. Start the REST API Backend
```bash
npm run server
```
Runs the Express API on **[http://localhost:4000](http://localhost:4000)** (`/api/health`, `/api/analyze`, `/api/scenarios`).

---

## 🧪 The 4 Benchmark Scenarios

The prototype comes pre-loaded with 4 realistic production incident scenarios that mirror real engineering teams:

### Scenario 1: Fintech Webhook Refund Idempotency & Precision Loss
- **Stated Intent:** Prevent duplicate refund payouts from Stripe webhooks using a Redis lock.
- **What Developer Did:** Acquired lock via `redisClient.set(lockKey, 'processing')` and formatted currency via `Math.floor(amount * 100) / 10000`.
- **Underlying Hidden Hazard:** Lock acquired without TTL or `try...finally` block; downstream database failure deadlocks legitimate future retries forever. Currency conversion truncates fractional cents.
- **Conventional CI:** **PASS** (98% Line Coverage).
- **SentinelSQI Intelligence:** **BLOCK_CI** (Score: 25/100, Distributed Lock Deadlock, Precision Loss).

### Scenario 2: SaaS Multi-Tenant RBAC Cache Key Collision
- **Stated Intent:** Performance optimization to cache user role permissions in Redis for 5 minutes.
- **What Developer Did:** Cached role at `auth:user:${userId}:role`.
- **Underlying Hidden Hazard:** Dropped `tenantId` from the cache key! A user who is an Admin in Organization A gains unauthorized Admin privileges when accessing Organization B.
- **Conventional CI:** **PASS** (100% Line Coverage).
- **SentinelSQI Intelligence:** **BLOCK_CI** (Score: 25/100, Critical Multi-Tenant Isolation Breach).

### Scenario 3: E-Commerce Dynamic Coupon Stacking Underflow
- **Stated Intent:** Allow seasonal percentage promo codes to stack with VIP fixed gift vouchers.
- **What Developer Did:** Subtracted fixed voucher from discounted subtotal without boundary clamp.
- **Underlying Hidden Hazard:** If voucher exceeds discounted subtotal, cart total becomes negative (-$14.00), crashing the payment gateway or crediting free merchandise.
- **Conventional CI:** **PASS** (100% Line Coverage on happy-path $200 carts).
- **SentinelSQI Intelligence:** **REQUEST_CHANGES** (Score: 48/100, Arithmetic Underflow Hazard).

### Scenario 4: Cloud Queue Synchronous Sleep & DLQ Drop
- **Stated Intent:** Add exponential backoff retry to worker message handler for network blips.
- **What Developer Did:** Synchronous busy-waiting `while (Date.now() - start < waitMs)` loop and logged error after 3 retries.
- **Underlying Hidden Hazard:** Synchronous busy loop blocks the Node.js event loop, starving Kafka/SQS consumer heartbeats and triggering continuous cluster rebalances. Failed messages are logged but dropped without forwarding to Dead Letter Queue (DLQ).
- **Conventional CI:** **PASS** (95% Line Coverage with mocked timers).
- **SentinelSQI Intelligence:** **BLOCK_CI** (Score: 25/100, Event Loop Thread Starvation & Message Loss).

---

## 🏛️ System Architecture

```
                            PULL REQUEST CONTEXT
                    (PR Title, Description, Git Diff)
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  SENTINEL SQI CORE ENGINE │
                    └─────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Intent & Goal    │    │ Contextual Blast │    │ Semantic Test    │
│ Modeling Engine  │    │ Radius Graph     │    │ Adequacy Matrix  │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ CORRECTNESS SYNTHESIS &   │
                    │ INVARIANT TEST GENERATOR  │
                    └─────────────┬─────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       INTERACTIVE WEB UI        │       │         CI/CD CLI GATE          │
│   • Dashboard & Metrics Cards   │       │   • Terminal colored report     │
│   • Intent vs Reality View      │       │   • Automated PR Commenting     │
│   • Interactive Call Graph      │       │   • Exit code 0 (Pass) / 1 (Fail│
│   • Invariant Test Exporter     │       │   • JSON telemetry output       │
└─────────────────────────────────┘       └─────────────────────────────────┘
```

For complete technical specifications, see:
- [**ARCHITECTURE.md**](file:///c:/Users/ramch/OneDrive/Desktop/myco/ARCHITECTURE.md) — Comprehensive technical design, information ingestion model, and multi-stage reasoning pipeline.
- [**DESIGN_RATIONALE.md**](file:///c:/Users/ramch/OneDrive/Desktop/myco/DESIGN_RATIONALE.md) — Explanation of technical decisions, assumptions, limitations, and engineering trade-offs.

---

## 🧠 Optional: Enabling Live Google Gemini AI

SentinelSQI works **100% offline out-of-the-box** using its deterministic static AST analyzer and heuristic cognitive engine.

To enable **Live Generative AI Reasoning**:
1. In the Web UI, click the **"Gemini Mode"** toggle or **"Set Gemini Key"** in the Live Diff Playground.
2. Provide your Google Gemini API key (or set `export GEMINI_API_KEY="AIzaSy..."` in your environment).
3. The system will leverage **Gemini 2.5 Flash** to perform live multi-turn semantic reasoning, drift detection, and dynamic invariant test generation.

---

## 📊 Alignment with Assessment Criteria

| Assessment Expectation | SentinelSQI Implementation | Reference |
| :--- | :--- | :--- |
| **Understand the problem before jumping into implementation** | Formulated the Goodhart's Law paradox of code coverage; designed a 3-pillar information model (Intent, Context, Validation). | [ARCHITECTURE.md](file:///c:/Users/ramch/OneDrive/Desktop/myco/ARCHITECTURE.md#1-problem-formulation) |
| **Identify information your system needs** | Extracted explicit PR intent, AST deltas, import/export call hierarchies, distributed contracts, and assertion-level test source code. | [ARCHITECTURE.md](file:///c:/Users/ramch/OneDrive/Desktop/myco/ARCHITECTURE.md#2-information-architecture) |
| **Think about how system reasons about correctness** | Designed a 4-stage cognitive reasoning pipeline (Intent Extraction ➔ Blast Radius Traversal ➔ Semantic Invariant Matrix ➔ Gating Synthesis). | [ARCHITECTURE.md](file:///c:/Users/ramch/OneDrive/Desktop/myco/ARCHITECTURE.md#3-cognitive-reasoning-pipeline) |
| **Build a functional prototype demonstrating approach** | Full-stack application with React 18 UI, 4 realistic benchmark incident case studies, custom diff playground, synthesized test modal, and CLI. | [src/App.tsx](file:///c:/Users/ramch/OneDrive/Desktop/myco/src/App.tsx) & [cli/sentinel.js](file:///c:/Users/ramch/OneDrive/Desktop/myco/cli/sentinel.js) |
| **Explain technical decisions, assumptions, limitations, & trade-offs** | Comprehensive rationale covering hybrid AST/LLM design, latency vs depth trade-offs, false positive management, and limitations. | [DESIGN_RATIONALE.md](file:///c:/Users/ramch/OneDrive/Desktop/myco/DESIGN_RATIONALE.md) |

---

*SentinelSQI — Moving beyond superficial pass rates to true semantic software correctness.*

