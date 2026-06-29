/**
 * Combat Detector - Detect combat triggers in AI responses
 */

// Combat trigger keywords
const COMBAT_KEYWORDS = [
  'attack', 'attacks', 'attacking',
  'enemy', 'enemies', 'hostile',
  'combat', 'fight', 'fighting', 'battle',
  'ambush', 'ambushed',
  'lunges', 'leaps', 'charges',
  'draws weapon', 'weapons drawn',
  'threatens', 'menaces'
];

// Common enemy types
const ENEMY_TYPES = {
  'bandit': { name: 'Bandit', hp: 25, attack: 5, defense: 3, xp: 15, gold: 10 },
  'wolf': { name: 'Wolf', hp: 20, attack: 6, defense: 2, xp: 12, gold: 5 },
  'goblin': { name: 'Goblin', hp: 18, attack: 4, defense: 3, xp: 10, gold: 8 },
  'skeleton': { name: 'Skeleton', hp: 22, attack: 5, defense: 4, xp: 14, gold: 6 },
  'orc': { name: 'Orc', hp: 35, attack: 7, defense: 5, xp: 25, gold: 15 },
  'troll': { name: 'Troll', hp: 50, attack: 9, defense: 6, xp: 40, gold: 25 },
  'zombie': { name: 'Zombie', hp: 28, attack: 5, defense: 2, xp: 16, gold: 4 },
  'spider': { name: 'Giant Spider', hp: 24, attack: 6, defense: 3, xp: 18, gold: 7 },
  'rat': { name: 'Giant Rat', hp: 15, attack: 4, defense: 2, xp: 8, gold: 3 },
  'bear': { name: 'Bear', hp: 40, attack: 8, defense: 5, xp: 30, gold: 12 },
  'cultist': { name: 'Cultist', hp: 26, attack: 5, defense: 4, xp: 20, gold: 14 },
  'guard': { name: 'Guard', hp: 30, attack: 6, defense: 5, xp: 22, gold: 18 }
};

/**
 * Detect if combat should trigger from AI response
 * @param {string} response - AI narrative text
 * @returns {boolean} Whether combat was triggered
 */
function detectCombatTrigger(response) {
  const lowerResponse = response.toLowerCase();

  // Check for combat keywords
  const hasCombatKeyword = COMBAT_KEYWORDS.some(keyword =>
    lowerResponse.includes(keyword)
  );

  if (!hasCombatKeyword) {
    return false;
  }

  console.log('Combat keywords detected, parsing enemies...');

  // Parse enemies from the response
  const enemies = parseEnemiesFromText(response);

  if (enemies.length === 0) {
    console.log('Combat keywords found but no enemies parsed');
    return false;
  }

  // Trigger combat
  triggerCombat(enemies);

  return true;
}

/**
 * Parse enemy information from text
 * @param {string} text - AI response text
 * @returns {Array} Array of enemy objects
 */
function parseEnemiesFromText(text) {
  const lowerText = text.toLowerCase();
  const enemies = [];

  // Number words mapping
  const numberWords = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'a': 1, 'an': 1, 'single': 1, 'pair': 2, 'couple': 2,
    'several': 3, 'few': 2
  };

  // Try to find enemy patterns
  for (const [enemyKey, enemyTemplate] of Object.entries(ENEMY_TYPES)) {
    // Look for patterns like "three bandits", "a wolf", "two orcs"
    const patterns = [
      new RegExp(`(\\w+)\\s+${enemyKey}s?`, 'i'),  // "three bandits"
      new RegExp(`${enemyKey}s?`, 'i')  // just "bandit"
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern);

      if (match) {
        let count = 1;

        // Try to extract number
        if (match[1]) {
          const numberWord = match[1].toLowerCase();

          if (numberWords[numberWord]) {
            count = numberWords[numberWord];
          } else if (!isNaN(parseInt(numberWord))) {
            count = parseInt(numberWord);
          }
        }

        // Check for plural "s"
        if (match[0].endsWith('s') && count === 1) {
          count = 2; // If plural form but no number, assume 2
        }

        // Add enemies based on count
        for (let i = 0; i < count && i < 5; i++) {  // Max 5 enemies
          const enemy = createEnemy(enemyTemplate, i);
          enemies.push(enemy);
        }

        console.log(`Parsed ${count} ${enemyKey}(s) from text`);
        break;  // Found this enemy type, move to next
      }
    }
  }

  // If no specific enemies found but combat keywords present, generate generic enemies
  if (enemies.length === 0) {
    console.log('No specific enemies parsed, generating generic enemy');
    const dangerLevel = GAME_STATE.map.currentLocation.danger || 2;
    enemies.push(createGenericEnemy(dangerLevel));
  }

  return enemies;
}

/**
 * Create enemy from template
 */
function createEnemy(template, index = 0) {
  const locationDanger = GAME_STATE.map.currentLocation.danger || 2;
  const dangerMultiplier = 1 + (locationDanger - 2) * 0.2;

  return {
    id: `enemy_${Date.now()}_${index}`,
    name: index > 0 ? `${template.name} ${index + 1}` : template.name,
    hp: Math.floor(template.hp * dangerMultiplier),
    maxHp: Math.floor(template.hp * dangerMultiplier),
    attack: Math.floor(template.attack * dangerMultiplier),
    defense: Math.floor(template.defense * dangerMultiplier),
    xpReward: Math.floor(template.xp * dangerMultiplier),
    goldReward: Math.floor(template.gold * dangerMultiplier),
    isEnemy: true
  };
}

/**
 * Create generic enemy based on danger level
 */
function createGenericEnemy(dangerLevel) {
  const baseStats = {
    1: { name: 'Thug', hp: 20, attack: 4, defense: 2, xp: 10, gold: 5 },
    2: { name: 'Ruffian', hp: 25, attack: 5, defense: 3, xp: 15, gold: 10 },
    3: { name: 'Marauder', hp: 30, attack: 6, defense: 4, xp: 20, gold: 15 },
    4: { name: 'Warrior', hp: 40, attack: 8, defense: 5, xp: 30, gold: 20 },
    5: { name: 'Champion', hp: 50, attack: 10, defense: 6, xp: 50, gold: 30 }
  };

  const stats = baseStats[Math.min(dangerLevel, 5)] || baseStats[2];

  return {
    id: `enemy_${Date.now()}_0`,
    name: stats.name,
    hp: stats.hp,
    maxHp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    xpReward: stats.xp,
    goldReward: stats.gold,
    isEnemy: true
  };
}

/**
 * Trigger combat mode with enemies
 */
function triggerCombat(enemies) {
  console.log('Triggering combat with enemies:', enemies);

  // Initialize combat state
  startCombat(enemies);

  // Switch to combat UI mode
  setUIMode('combat');

  showNotification(`Combat started with ${enemies.length} ${enemies.length === 1 ? 'enemy' : 'enemies'}!`, 'warning');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectCombatTrigger,
    parseEnemiesFromText,
    createEnemy,
    ENEMY_TYPES
  };
}
