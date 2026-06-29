/**
 * Unified Game State - Single source of truth for all game data
 * All systems read from and write to this centralized state
 */

const GAME_STATE = {
  // Map and World Data
  map: {
    nodes: [],                  // All map locations
    edges: [],                  // Connections between locations
    currentLocation: null,      // Current location object
    visitedLocations: [],       // Array of visited location IDs
    mapGenerated: false
  },

  // Character Data
  character: {
    name: "",
    class: "",
    profileConfigured: false,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,

    // Resources
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    gold: 100,

    // Core Stats
    stats: {
      body: 10,      // Physical strength and endurance
      mind: 10,      // Intelligence and perception
      soul: 10       // Willpower and charisma
    },
    eldenStats: {
      vigor: 10,
      mind: 10,
      endurance: 10,
      strength: 10,
      dexterity: 10,
      intelligence: 10,
      faith: 10,
      arcane: 10
    },

    // Derived Stats (calculated from core stats)
    derived: {
      attack: 5,
      defense: 5,
      magic: 5,
      speed: 5
    },

    // Equipment and Items
    inventory: [],
    equipped: {
      weapon: null,
      armor: null,
      accessory: null
    },

    // Skills and Abilities
    skills: [],
    activeEffects: []
  },

  // Story and Narrative
  storyLog: [],              // Array of story messages {role, content, timestamp}
  conversationHistory: [],   // For AI context
  currentQuestObjective: null,

  // UI Mode
  mode: 'intro',  // 'intro', 'story', 'combat', 'shop', 'map', 'character'

  // Combat State
  combat: null,  // null when not in combat, otherwise combat data:
  /* {
    enemies: [],
    turnOrder: [],
    currentTurn: 0,
    playerAction: null,
    combatLog: []
  } */

  // Shop State
  shop: null,  // null when not shopping, otherwise shop data:
  /* {
    inventory: [],
    cart: [],
    shopType: '',
    shopTier: 0
  } */

  // Dice/Skill Check State
  lastSkillCheck: null,  // Last skill check result

  // Game Meta
  gameStartTime: null,
  lastSaveTime: null,
  difficulty: 'normal'  // 'easy', 'normal', 'hard'
};

// Class Templates
const CLASS_TEMPLATES = {
  warrior: {
    name: "Warrior",
    description: "Masters of martial combat with high HP and physical prowess",
    stats: { body: 14, mind: 8, soul: 10 },
    hp: 120,
    mp: 30,
    growth: { hp: 1.2, mp: 0.8, attack: 1.15, defense: 1.1, magic: 0.85, speed: 0.95 },
    skills: ['Power Strike', 'Shield Bash', 'Battle Cry']
  },
  berserker: {
    name: "Berserker",
    description: "Ferocious melee class that trades defense for huge damage",
    stats: { body: 16, mind: 6, soul: 8 },
    hp: 130,
    mp: 20,
    growth: { hp: 1.25, mp: 0.7, attack: 1.2, defense: 0.9, magic: 0.75, speed: 1.0 },
    skills: ['Rage Cleave', 'Blood Roar', 'Reckless Charge']
  },
  mage: {
    name: "Mage",
    description: "Wielders of arcane power with devastating spells",
    stats: { body: 8, mind: 14, soul: 10 },
    hp: 80,
    mp: 80,
    growth: { hp: 0.85, mp: 1.25, attack: 0.8, defense: 0.9, magic: 1.25, speed: 1.0 },
    skills: ['Fireball', 'Ice Shard', 'Arcane Barrier']
  },
  sorcerer: {
    name: "Sorcerer",
    description: "Ranged spell specialist with precision magic",
    stats: { body: 7, mind: 15, soul: 9 },
    hp: 75,
    mp: 90,
    growth: { hp: 0.8, mp: 1.3, attack: 0.75, defense: 0.85, magic: 1.3, speed: 1.05 },
    skills: ['Soul Spear', 'Magic Barrage', 'Spell Focus']
  },
  pyromancer: {
    name: "Pyromancer",
    description: "Hybrid caster who mixes fire magic and close combat",
    stats: { body: 10, mind: 12, soul: 10 },
    hp: 95,
    mp: 70,
    growth: { hp: 1.0, mp: 1.1, attack: 1.0, defense: 0.95, magic: 1.15, speed: 1.0 },
    skills: ['Fire Whip', 'Flame Surge', 'Burning Guard']
  },
  rogue: {
    name: "Rogue",
    description: "Swift and cunning, striking from the shadows",
    stats: { body: 10, mind: 12, soul: 10 },
    hp: 100,
    mp: 50,
    growth: { hp: 1.0, mp: 1.0, attack: 1.05, defense: 0.95, magic: 0.9, speed: 1.2 },
    skills: ['Backstab', 'Poison Dart', 'Shadow Step']
  },
  assassin: {
    name: "Assassin",
    description: "Extreme burst damage and evasive mobility",
    stats: { body: 11, mind: 11, soul: 8 },
    hp: 90,
    mp: 45,
    growth: { hp: 0.95, mp: 0.95, attack: 1.2, defense: 0.85, magic: 0.85, speed: 1.3 },
    skills: ['Assassinate', 'Smoke Veil', 'Venom Edge']
  },
  ranger: {
    name: "Ranger",
    description: "Skirmisher class with balanced offense and utility",
    stats: { body: 11, mind: 10, soul: 9 },
    hp: 105,
    mp: 45,
    growth: { hp: 1.05, mp: 0.95, attack: 1.05, defense: 1.0, magic: 0.85, speed: 1.15 },
    skills: ['Piercing Shot', 'Hunter Mark', 'Evasive Roll']
  },
  cleric: {
    name: "Cleric",
    description: "Divine healers who balance offense and support",
    stats: { body: 10, mind: 10, soul: 12 },
    hp: 100,
    mp: 60,
    growth: { hp: 1.0, mp: 1.05, attack: 0.95, defense: 1.0, magic: 1.05, speed: 0.95 },
    skills: ['Heal', 'Smite', 'Divine Shield']
  },
  paladin: {
    name: "Paladin",
    description: "Armored holy knight with sustain and control",
    stats: { body: 13, mind: 9, soul: 12 },
    hp: 120,
    mp: 55,
    growth: { hp: 1.15, mp: 1.0, attack: 1.1, defense: 1.2, magic: 0.95, speed: 0.9 },
    skills: ['Judgment Strike', 'Holy Guard', 'Lay on Hands']
  },
  druid: {
    name: "Druid",
    description: "Nature caster with balanced forms and survival tools",
    stats: { body: 9, mind: 11, soul: 12 },
    hp: 95,
    mp: 75,
    growth: { hp: 0.95, mp: 1.15, attack: 0.9, defense: 0.95, magic: 1.15, speed: 1.0 },
    skills: ['Entangle', 'Moonfire', 'Wild Mend']
  },
  necromancer: {
    name: "Necromancer",
    description: "Dark caster who manipulates life and death",
    stats: { body: 7, mind: 13, soul: 13 },
    hp: 80,
    mp: 85,
    growth: { hp: 0.85, mp: 1.2, attack: 0.8, defense: 0.9, magic: 1.25, speed: 0.95 },
    skills: ['Bone Spear', 'Life Drain', 'Raise Dead']
  },
  spellblade: {
    name: "Spellblade",
    description: "Hybrid battlemage with melee and magic combos",
    stats: { body: 12, mind: 12, soul: 9 },
    hp: 110,
    mp: 65,
    growth: { hp: 1.05, mp: 1.05, attack: 1.1, defense: 1.0, magic: 1.1, speed: 1.0 },
    skills: ['Arcane Slash', 'Runic Guard', 'Blink Strike']
  },
  monk: {
    name: "Monk",
    description: "Fast disciplined fighter with spiritual techniques",
    stats: { body: 11, mind: 10, soul: 11 },
    hp: 100,
    mp: 55,
    growth: { hp: 1.0, mp: 1.0, attack: 1.05, defense: 1.0, magic: 1.0, speed: 1.2 },
    skills: ['Flurry Palm', 'Inner Focus', 'Chi Wave']
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GAME_STATE, CLASS_TEMPLATES };
}
