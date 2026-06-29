/**
 * Map Generator - Procedural world generation using Perlin noise
 * Enhanced with Quest V2 CSV-driven regions and structures.
 */

// Perlin Noise Implementation
class PerlinNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.permutation = this.generatePermutation();
  }

  generatePermutation() {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(this.seededRandom(i) * 256);
    }
    return p.concat(p);
  }

  seededRandom(x) {
    const seed = this.seed;
    const value = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const p = this.permutation;
    const a = p[X] + Y;
    const aa = p[a];
    const ab = p[a + 1];
    const b = p[X + 1] + Y;
    const ba = p[b];
    const bb = p[b + 1];

    return this.lerp(v,
      this.lerp(u, this.grad(p[aa], x, y), this.grad(p[ba], x - 1, y)),
      this.lerp(u, this.grad(p[ab], x, y - 1), this.grad(p[bb], x - 1, y - 1))
    );
  }
}

const DEFAULT_BIOMES = [
  { name: 'Plains', danger: 1 },
  { name: 'Forest', danger: 2 },
  { name: 'Mountains', danger: 3 },
  { name: 'Desert', danger: 2 },
  { name: 'Swamp', danger: 3 },
  { name: 'Tundra', danger: 3 },
  { name: 'Volcanic', danger: 4 }
];

const DEFAULT_STRUCTURES = [
  'village',
  'town',
  'city',
  'dungeon',
  'ruins',
  'cave',
  'shrine',
  'tower',
  'camp',
  'fort',
  'None'
];

const STRUCTURE_PROFILES = {
  village: { tier: 3, shopChance: 0.8, dangerMod: -1, type: 'settlement' },
  town: { tier: 4, shopChance: 0.95, dangerMod: -1, type: 'settlement' },
  city: { tier: 5, shopChance: 1, dangerMod: -1, type: 'settlement' },
  camp: { tier: 2, shopChance: 0.5, dangerMod: 0, type: 'outpost' },
  fort: { tier: 3, shopChance: 0.6, dangerMod: 0, type: 'fortification' },
  citadel: { tier: 4, shopChance: 0.25, dangerMod: 1, type: 'fortification' },
  palace: { tier: 5, shopChance: 0.65, dangerMod: 0, type: 'landmark' },
  colosseum: { tier: 3, shopChance: 0.4, dangerMod: 1, type: 'arena' },
  shrine: { tier: 2, shopChance: 0.3, dangerMod: -1, type: 'sanctum' },
  temple: { tier: 3, shopChance: 0.35, dangerMod: -1, type: 'sanctum' },
  'celestial sanctum': { tier: 4, shopChance: 0.2, dangerMod: -1, type: 'sanctum' },
  cave: { tier: 1, shopChance: 0, dangerMod: 1, type: 'wilds' },
  dungeon: { tier: 1, shopChance: 0, dangerMod: 1, type: 'wilds' },
  crypt: { tier: 1, shopChance: 0, dangerMod: 1, type: 'wilds' },
  labyrinth: { tier: 1, shopChance: 0, dangerMod: 1, type: 'wilds' },
  ruins: { tier: 1, shopChance: 0.1, dangerMod: 1, type: 'wilds' },
  'underground city': { tier: 3, shopChance: 0.4, dangerMod: 1, type: 'wilds' },
  'ancient pyramid': { tier: 2, shopChance: 0.05, dangerMod: 1, type: 'wilds' },
  'rift gate': { tier: 2, shopChance: 0.1, dangerMod: 1, type: 'landmark' },
  shipwreck: { tier: 1, shopChance: 0.05, dangerMod: 1, type: 'wilds' },
  'floating fortress': { tier: 4, shopChance: 0.15, dangerMod: 1, type: 'fortification' },
  'haunted manor': { tier: 2, shopChance: 0.05, dangerMod: 1, type: 'wilds' },
  'obsidian keep': { tier: 4, shopChance: 0.2, dangerMod: 1, type: 'fortification' },
  tower: { tier: 1, shopChance: 0.2, dangerMod: 0, type: 'landmark' },
  none: { tier: 1, shopChance: 0.05, dangerMod: 0, type: 'wilds' }
};

const NAME_PREFIXES = ['Stone', 'Iron', 'Dark', 'Silver', 'Gold', 'Shadow', 'Bright', 'Ancient', 'Lost', 'Frozen', 'Ember', 'Storm', 'Crystal', 'Misty', 'Silent'];
const NAME_SUFFIXES = ['Vale', 'Hold', 'Ridge', 'Keep', 'Haven', 'Wood', 'Peak', 'Gate', 'Hollow', 'Moor', 'Field', 'Crest', 'Watch', 'Fall', 'Bridge'];

let worldCatalogCache = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toTitleCase(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function hashToHue(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function biomeColorFromName(name) {
  const hue = hashToHue(name);
  return `hsl(${hue}, 45%, 46%)`;
}

function pickWithCoverage(pool, index) {
  if (!pool.length) return null;
  if (index < pool.length) return pool[index];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildBiomeCatalogFromQuestData() {
  const source = typeof window !== 'undefined' ? window.QUEST_V2_MAP_DATA : null;
  const fallback = DEFAULT_BIOMES.map((biome) => ({
    name: biome.name,
    danger: biome.danger,
    color: biomeColorFromName(biome.name)
  }));

  if (!source || !Array.isArray(source.biomes) || source.biomes.length === 0) {
    return fallback;
  }

  const unique = new Map();
  source.biomes.forEach((entry) => {
    const name = toTitleCase(entry?.name);
    if (!name) return;
    if (unique.has(name)) return;
    unique.set(name, {
      name,
      danger: clamp(Number.parseInt(entry?.danger, 10) || 2, 1, 5),
      color: biomeColorFromName(name)
    });
  });

  return unique.size ? Array.from(unique.values()) : fallback;
}

function buildStructureCatalogFromQuestData() {
  const source = typeof window !== 'undefined' ? window.QUEST_V2_MAP_DATA : null;
  const names = (source && Array.isArray(source.structures) && source.structures.length)
    ? source.structures
    : DEFAULT_STRUCTURES;

  const ordered = [];
  const seen = new Set();

  const villageLike = names.find((n) => String(n || '').trim().toLowerCase() === 'village');
  if (villageLike) {
    ordered.push(villageLike);
  }

  names.forEach((structureName) => {
    const displayName = String(structureName || '').trim();
    if (!displayName) return;
    if (displayName.toLowerCase() === 'village') return;
    if (seen.has(displayName.toLowerCase())) return;
    ordered.push(displayName);
    seen.add(displayName.toLowerCase());
  });

  if (villageLike && !seen.has('village')) {
    seen.add('village');
  }

  return ordered.map((structureName) => {
    const raw = String(structureName || '').trim();
    const key = raw.toLowerCase() === 'none' ? 'none' : raw.toLowerCase();
    const profile = STRUCTURE_PROFILES[key] || STRUCTURE_PROFILES.none;
    const label = raw.toLowerCase() === 'none' ? 'None' : toTitleCase(raw);
    return {
      key,
      name: label,
      tier: profile.tier,
      shopChance: profile.shopChance,
      dangerMod: profile.dangerMod,
      type: profile.type
    };
  });
}

function getWorldCatalog() {
  if (worldCatalogCache) {
    return worldCatalogCache;
  }

  worldCatalogCache = {
    biomes: buildBiomeCatalogFromQuestData(),
    structures: buildStructureCatalogFromQuestData()
  };

  return worldCatalogCache;
}

function generateLocationName(biomeName, structureName, index) {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  const structure = String(structureName || '').trim();

  if (index === 0) {
    return 'Emberhold';
  }
  if (!structure || structure.toLowerCase() === 'none') {
    return `${prefix} ${suffix}`;
  }
  return `${prefix} ${structure}`;
}

function generateLore(location) {
  const region = String(location.region || location.biome || 'unknown lands').toLowerCase();
  const structure = String(location.structure || location.type || 'site').toLowerCase();
  const dangerTone = location.danger > 3 ? 'few travelers dare linger here' : 'adventurers and scouts still pass through';

  const templates = [
    `This ${structure} stands within the ${region}, where ${dangerTone}.`,
    `Old quest logs mention this ${structure} as a key waypoint in the ${region}.`,
    `Stories describe this ${structure} as one of the most notable sites in the ${region}.`,
    `Worn banners and weathered markers tie this ${structure} to conflicts across the ${region}.`,
    `The ${region} surrounds this ${structure} with shifting threats and hidden opportunities.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate procedural map
 * @param {number} nodeCount - Number of locations to generate (default: 25)
 * @param {number} seed - Random seed for reproducibility
 * @returns {object} Map data with nodes and edges
 */
function generateMap(nodeCount = 25, seed = null) {
  if (!seed) {
    seed = Math.random();
  }

  console.log('Generating map with seed:', seed);

  const catalog = getWorldCatalog();
  const biomePool = catalog.biomes;
  const structurePool = catalog.structures;

  const minimumNodes = Math.max(nodeCount, biomePool.length, structurePool.length, 25);
  const perlin = new PerlinNoise(seed);
  const nodes = [];
  const edges = [];

  const safestBiome = biomePool
    .slice()
    .sort((a, b) => a.danger - b.danger)[0] || biomePool[0];
  const startStructure = structurePool.find((s) => s.key === 'village') || structurePool[0];

  // Generate nodes
  for (let i = 0; i < minimumNodes; i++) {
    const angle = (i / minimumNodes) * Math.PI * 2;
    const radius = 150 + Math.random() * 200;
    const x = 400 + Math.cos(angle) * radius + (Math.random() - 0.5) * 100;
    const y = 300 + Math.sin(angle) * radius + (Math.random() - 0.5) * 100;

    const noiseValue = perlin.noise(x * 0.01, y * 0.01);
    const noisyBiomeIndex = Math.floor(((noiseValue + 1) / 2) * biomePool.length);
    const noisyBiome = biomePool[Math.min(noisyBiomeIndex, biomePool.length - 1)];

    let biome = pickWithCoverage(biomePool, i) || noisyBiome;
    let structure = pickWithCoverage(structurePool, i) || structurePool[0];

    if (i === 0) {
      biome = safestBiome;
      structure = startStructure;
    }

    const dangerBase = biome.danger + (structure?.dangerMod || 0);
    const danger = clamp(Math.round(dangerBase + (Math.random() * 1.2 - 0.2)), 1, 5);
    const type = structure?.key === 'none' ? 'wilds' : slugify(structure?.name || structure?.key);

    const location = {
      id: `loc_${i}`,
      name: generateLocationName(biome.name, structure?.name, i),
      type,
      structure: structure?.name || 'None',
      tier: structure?.tier ?? 1,
      region: biome.name,
      biome: biome.name,
      x,
      y,
      danger,
      lore: '',
      hasShop: Math.random() < (structure?.shopChance ?? 0.05),
      discovered: i === 0,
      color: biome.color
    };

    location.lore = generateLore(location);
    nodes.push(location);
  }

  // Generate edges (connections between locations)
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const distances = nodes
      .map((other, idx) => ({
        index: idx,
        distance: Math.sqrt(Math.pow(node.x - other.x, 2) + Math.pow(node.y - other.y, 2))
      }))
      .filter((d) => d.index !== i)
      .sort((a, b) => a.distance - b.distance);

    const connectionCount = 2 + Math.floor(Math.random() * 3);

    for (let j = 0; j < Math.min(connectionCount, distances.length); j++) {
      const targetIdx = distances[j].index;
      const edgeExists = edges.some(
        (e) => (e.source === node.id && e.target === nodes[targetIdx].id) ||
          (e.source === nodes[targetIdx].id && e.target === node.id)
      );

      if (!edgeExists) {
        edges.push({
          source: node.id,
          target: nodes[targetIdx].id,
          distance: Math.floor(distances[j].distance)
        });
      }
    }
  }

  console.log(`Map generated: ${nodes.length} nodes, ${edges.length} edges`);
  console.log(`Coverage: ${biomePool.length} regions, ${structurePool.length} structures`);

  return { nodes, edges, seed };
}

/**
 * Initialize map in game state
 */
function initializeMap(nodeCount = 25, seed = null) {
  const mapData = generateMap(nodeCount, seed);

  GAME_STATE.map.nodes = mapData.nodes;
  GAME_STATE.map.edges = mapData.edges;
  GAME_STATE.map.currentLocation = mapData.nodes[0];
  GAME_STATE.map.visitedLocations = [mapData.nodes[0].id];
  GAME_STATE.map.mapGenerated = true;
  GAME_STATE.map.seed = mapData.seed;

  console.log('Map initialized in game state');
  console.log('Starting location:', mapData.nodes[0].name);

  return mapData;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateMap, initializeMap, PerlinNoise };
}
