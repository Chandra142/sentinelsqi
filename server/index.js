import express from 'express';
import cors from 'cors';
import { parseGitDiff, detectAstHazards, evaluateSoftwareChange } from '../lib/core.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SentinelSQI Quality Intelligence Engine',
    timestamp: new Date().toISOString(),
    geminiKeyAvailable: !!process.env.GEMINI_API_KEY
  });
});

// Analyze Change Endpoint
app.post('/api/analyze', (req, res) => {
  try {
    const { prTitle, prDescription, rawDiff } = req.body;
    if (!rawDiff) {
      return res.status(400).json({ error: 'rawDiff is required' });
    }

    const report = evaluateSoftwareChange(prTitle || 'Code Change', prDescription || '', rawDiff);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SentinelSQI Backend running on http://localhost:${PORT}`);
});
