# Contributing to SentinelSQI

Thank you for your interest in contributing to **SentinelSQI**!

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sentinelsqi.git
   cd sentinelsqi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local Vite development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run automated unit tests:**
   ```bash
   npm test
   ```

5. **Test the CLI tool:**
   ```bash
   node cli/sentinel.js --scenario stripe
   ```

---

## 📐 Adding New Invariant Scanners

To add a new static AST hazard detector:
1. Open [`lib/core.js`](file:///c:/Users/ramch/OneDrive/Desktop/myco/lib/core.js) and [`src/services/staticParser.ts`](file:///c:/Users/ramch/OneDrive/Desktop/myco/src/services/staticParser.ts).
2. Add your pattern detection logic to `detectAstHazards(rawDiff)`.
3. Add a corresponding test in [`tests/sqi.test.js`](file:///c:/Users/ramch/OneDrive/Desktop/myco/tests/sqi.test.js).
4. Run `npm test` to ensure all tests pass.

---

## 🤝 Code Style & Commit Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
- Maintain test coverage for any new parser or scoring features.
- Ensure `npm run build` passes with zero TypeScript warnings before opening a PR.

