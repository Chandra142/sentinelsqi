# SentinelSQI Design Rationale, Assumptions, Limitations & Trade-offs

This document details the engineering considerations, architectural trade-offs, operating assumptions, and boundaries behind the **SentinelSQI** (AI-Powered Software Quality Intelligence System).

---

## 1. Technical Decisions & Justifications

### Decision 1: Hybrid Dual-Engine Architecture (Deterministic AST + Generative LLM)
- **Choice:** We implemented a two-tier architecture:
  1. A deterministic AST and pattern hazard detector that executes in `< 5ms` with zero external network dependencies.
  2. A generative LLM reasoning pipeline (Google Gemini 2.5) that interprets high-level business nuance, semantic drift, and PR intent.
- **Justification:** LLMs are exceptional at semantic understanding, synthesizing context from natural language PR descriptions, and drafting test specs. However, relying purely on LLMs for CI gating introduces non-determinism, network latency, token expenses, and occasional hallucination. By pairing deterministic static AST checks with LLM cognitive reasoning, the system guarantees 100% reliable detection of known catastrophic patterns (e.g. lock deadlocks, missing DLQ, un-scoped cache keys) while retaining deep generative semantic comprehension.

### Decision 2: Focus on Semantic Assertion Adequacy over Line Coverage
- **Choice:** Instead of measuring how many lines were executed during a test run, SentinelSQI evaluates **what invariants were asserted**.
- **Justification:** High code coverage is frequently superficial. A test that calls a function without assertions, or tests that mock all dependencies to always succeed, provide 100% line coverage while catching 0% of runtime failure modes. Analyzing test adequacy at the assertion level reveals false-positive test suites.

### Decision 3: Interactive Visual Exploration + Zero-Dependency CLI
- **Choice:** Delivered both a rich, developer-centric Web UI (React 18 + Vite + Tailwind CSS) and an executable CLI tool (`cli/sentinel.js`) running on native Node.js.
- **Justification:** 
  - Code reviewers and engineering managers need an interactive dashboard to visualize the blast radius, explore the component call tree, and copy auto-generated test patches.
  - CI/CD pipelines (GitHub Actions, GitLab CI) require a lightweight, exit-code-driven CLI tool that can fail a pipeline build (`exit 1`) in milliseconds when quality drops below a configured threshold.

---

## 2. Key Assumptions

1. **Information Availability in PR Workflows:**
   - The system assumes pull requests include meaningful context (PR title, description, issue ticket reference). In cases where description is minimal, the system infers intent from function names, variable alterations, and commit log conventions (Conventional Commits: `feat`, `fix`, `perf`).
2. **Standard Unified Diff Format:**
   - The parser assumes standard Git patch / unified diff formatting (`diff --git`, `--- a/`, `+++ b/`, `@@ -x,y +a,b @@`).
3. **Layered Architectural Boundaries:**
   - In analyzing blast radius, the system presumes software is partitioned into standard conceptual tiers: Entrypoint/API, Domain Service, Infrastructure Client, and Storage/Persistence.

---

## 3. System Limitations

1. **Dynamic Language Reflection & Metaprogramming:**
   - In dynamic runtimes (e.g., JavaScript/Python with `eval()`, dynamic imports, or string-based method invocation), static AST analysis cannot trace 100% of runtime call paths without executing the code under observation.
2. **Context Window vs Giant Monorepo Diffs:**
   - In massive refactoring PRs spanning hundreds of files, feeding the entire codebase into an LLM context window is cost-prohibitive. SentinelSQI solves this by pruning the graph: only files within 2 hops of the modified symbols in the AST call graph are ingested.
3. **Flaky & Non-Deterministic Tests:**
   - The system analyzes test source code semantics; it does not execute live network integration tests against third-party staging services (like live Stripe API calls) unless connected to a dynamic sandbox harness.

---

## 4. Engineering Trade-offs Matrix

| Dimension | Option A: Pure Static Analysis | Option B: Pure LLM Agent | SentinelSQI Hybrid Approach (Chosen) | Trade-off Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Execution Latency** | < 10ms | 3,000ms - 8,000ms | **Sub-second AST + Async LLM** | Enables instantaneous local developer feedback via CLI, while CI background jobs perform deep LLM reasoning. |
| **Semantic Nuance** | Poor (rigid rules) | Exceptional (understands intent) | **High (Intent mapped to AST rules)** | Static rules detect code smells; LLM maps whether the change fulfilled the specific business ticket requirements. |
| **Determinism & Trust** | 100% Deterministic | Stochastic / Varied | **Guaranteed Baseline Rules** | Critical security/deadlock hazards always block CI with 100% reproducibility. |
| **Operational Cost** | \$0 / Run | \$0.01 - \$0.05 / PR | **Zero Cost for AST, Negligible for LLM** | Teams can run the CLI unlimited times locally without API quotas. |
| **Test Quality Signal** | Line / Branch % | Qualitative Review | **Semantic Assertion Depth** | Exposes tests that execute lines without asserting invariant preservation. |

---

## 5. False Positive Management & Engineer Trust

One of the greatest dangers in automated quality tools is **"Alert Fatigue"**. If a tool blocks PRs on trivial style disagreements, developers will disable or ignore it.

SentinelSQI guards against this via:
1. **Tiered Severities:** Hazards are strictly categorized into `CRITICAL`, `HIGH`, and `MEDIUM`. Only `CRITICAL` hazards (e.g. data loss, cross-tenant leaks, distributed deadlock) trigger hard `BLOCK_CI` verdicts.
2. **Configurable Confidence Thresholds:** Engineering teams can calibrate sensitivity (`--threshold 60`) based on repository maturity (e.g., strict gating for payment services, advisory warnings for internal dashboards).
3. **Actionable Constructive Output:** Rather than simply rejecting a PR with an error, SentinelSQI **auto-generates the exact invariant unit test** needed to verify the fix, transforming friction into developer productivity.

---

## 6. Future Architectural Roadmap

- **Dynamic Symbol Tracing via eBPF / Test Telemetry:** Ingesting live OpenTelemetry traces from staging environments to confirm that mocked downstream calls mirror production behavior.
- **Automated Regression Mutation Testing:** Running synthetic mutations on PR diffs to mathematically prove whether test suites catch introduced defects.
- **IDE LSP Plugin:** Real-time in-editor annotations in VS Code / Antigravity IDE highlighting unhandled invariants as code is typed.

