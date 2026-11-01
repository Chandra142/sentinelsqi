## 📝 Pull Request Overview

### Stated Intent & Context
<!-- Describe what you intended to achieve with this pull request. What user problem or bug does this address? -->

### Linked Issue / Ticket
<!-- e.g. Fixes #123 -->

---

## 🔍 Change Summary
- [ ] Added new functionality
- [ ] Refactored existing module
- [ ] Bug fix / resilience improvement
- [ ] Dependency update

---

## 🛡️ Invariant & Boundary Validation Checklist
<!-- Conventional CI checks if tests pass. SentinelSQI checks if invariants were asserted. -->
- [ ] **Error Path Recovery:** Did you test behavior when downstream dependencies (DB, Redis, network) throw exceptions?
- [ ] **State & Lock Cleanup:** Are distributed locks, file handles, and timeouts guaranteed to be cleaned up in a `finally` block?
- [ ] **Boundary Conditions:** Have you asserted on negative numbers, zero, null/empty payloads, or large arrays?
- [ ] **Multi-Tenant / Security Scope:** If caching permissions or keys, is the cache key scoped to the proper tenant/organization?
- [ ] **Downstream Contracts:** Did you ensure modified function signatures do not break downstream callers?

---

*Verified with SentinelSQI Quality Intelligence System.*

