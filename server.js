/**
 * Fate's Realm - Express Backend Server
 * Handles OpenAI API calls for AI Dungeon narration
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
let questV2MapDataCache = null;

function resolveQuestV2CsvPath() {
  const candidates = [
    path.join(__dirname, '..', 'dnd_quests_v2.csv'),
    path.join(__dirname, '..', '..', 'dnd_quests_v2.csv'),
    path.join(process.cwd(), 'dnd_quests_v2.csv')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const QUEST_GRADE_TO_SCORE = {
  F: 1,
  E: 1.5,
  D: 2,
  C: 2.5,
  B: 3,
  A: 3.5,
  S: 4,
  SS: 4.5,
  SSS: 5
};

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadQuestV2MapData() {
  if (questV2MapDataCache) {
    return questV2MapDataCache;
  }

  const fallback = {
    source: 'fallback',
    biomes: [],
    structures: []
  };

  try {
    const csvPath = resolveQuestV2CsvPath();
    if (!fs.existsSync(csvPath)) {
      console.warn('Quest V2 CSV not found:', csvPath);
      questV2MapDataCache = fallback;
      return questV2MapDataCache;
    }

    const csvText = fs.readFileSync(csvPath, 'utf8');
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      questV2MapDataCache = fallback;
      return questV2MapDataCache;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const biomeIdx = headers.indexOf('Map Biome');
    const structureIdx = headers.indexOf('Structure');
    const levelIdx = headers.indexOf('Quest Level');
    const gradeIdx = headers.indexOf('Quest Grade');

    if (biomeIdx === -1 || structureIdx === -1) {
      console.warn('Quest V2 CSV missing required headers.');
      questV2MapDataCache = fallback;
      return questV2MapDataCache;
    }

    const biomeStats = new Map();
    const structures = new Set();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      const biome = (row[biomeIdx] || '').trim();
      const structure = (row[structureIdx] || '').trim();
      const questLevel = Number.parseFloat(row[levelIdx] || '');
      const questGrade = (row[gradeIdx] || '').trim().toUpperCase();

      if (biome) {
        const levelScore = Number.isFinite(questLevel) ? clamp(questLevel / 15, 1, 5) : null;
        const gradeScore = QUEST_GRADE_TO_SCORE[questGrade] || 2.5;
        const score = levelScore === null ? gradeScore : (levelScore * 0.7) + (gradeScore * 0.3);

        if (!biomeStats.has(biome)) {
          biomeStats.set(biome, { total: 0, count: 0 });
        }
        const current = biomeStats.get(biome);
        current.total += score;
        current.count += 1;
      }

      if (structure) {
        structures.add(structure);
      }
    }

    const biomes = Array.from(biomeStats.entries()).map(([name, stats]) => ({
      name,
      danger: clamp(Math.round(stats.total / Math.max(stats.count, 1)), 1, 5)
    }));

    const structureList = Array.from(structures);
    if (!structureList.includes('None')) {
      structureList.push('None');
    }

    questV2MapDataCache = {
      source: 'dnd_quests_v2.csv',
      biomes,
      structures: structureList
    };
    console.log(`Loaded Quest V2 map data: ${biomes.length} regions, ${structureList.length} structures`);
    return questV2MapDataCache;
  } catch (error) {
    console.error('Failed to parse Quest V2 CSV:', error.message);
    questV2MapDataCache = fallback;
    return questV2MapDataCache;
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve standalone Fate's Emporium page from the parent project folder
app.get('/fates-emporium', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'fates-emporium.html'));
});

app.get('/data/quest-v2-map-data.js', (req, res) => {
  const payload = JSON
    .stringify(loadQuestV2MapData())
    .replace(/</g, '\\u003c');
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.QUEST_V2_MAP_DATA = ${payload};`);
});

// AI Dungeon endpoint
app.post('/api/story', async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('Received story request with', messages.length, 'messages');

    // Build messages array for OpenAI
    const openaiMessages = [];

    // Add system prompt
    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history
    openaiMessages.push(...messages);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.8,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;

    console.log('OpenAI response:', response.substring(0, 100) + '...');

    res.json({ response });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data.error?.message || 'OpenAI API error'
      });
    } else {
      res.status(500).json({
        error: 'Failed to generate story response',
        details: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Export for Vercel serverless
module.exports = app;

// Start server when run directly (local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║     Fate\'s Realm - Server Running     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`\n📍 Server: http://localhost:${PORT}`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured ✓' : 'Missing ✗'}\n`);
  });
}
