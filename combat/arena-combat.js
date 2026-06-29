/**
 * Arena Combat System - Turn-based combat engine
 */

/**
 * Initialize combat with turn order
 */
function initializeCombat() {
  if (!GAME_STATE.combat) {
    console.error('Combat state not initialized');
    return;
  }

  // Build turn order (player + enemies)
  const turnOrder = [
    {
      isPlayer: true,
      speed: GAME_STATE.character.derived.speed,
      id: 'player'
    },
    ...GAME_STATE.combat.enemies.map(enemy => ({
      isPlayer: false,
      speed: enemy.attack, // Use attack as speed proxy
      id: enemy.id,
      enemy: enemy
    }))
  ];

  // Sort by speed (highest first)
  turnOrder.sort((a, b) => b.speed - a.speed);

  GAME_STATE.combat.turnOrder = turnOrder;
  GAME_STATE.combat.currentTurn = 0;

  console.log('Combat initialized with turn order:', turnOrder);
}

/**
 * Execute player attack
 */
function playerAttack(targetEnemyId) {
  const enemy = GAME_STATE.combat.enemies.find(e => e.id === targetEnemyId);
  if (!enemy || enemy.hp <= 0) return;

  const player = GAME_STATE.character;
  const damage = Math.max(1, player.derived.attack - enemy.defense + Math.floor(Math.random() * 6));

  enemy.hp = Math.max(0, enemy.hp - damage);

  const log = `You attack ${enemy.name} for ${damage} damage!`;
  GAME_STATE.combat.combatLog.push(log);
  console.log(log);

  updateCombatUI();

  if (enemy.hp <= 0) {
    GAME_STATE.combat.combatLog.push(`${enemy.name} is defeated!`);
  }

  checkCombatEnd();
  if (!GAME_STATE.combat) return; // Combat ended

  nextTurn();
}

/**
 * Execute player skill
 */
function playerUseSkill(skillName, targetEnemyId) {
  const char = GAME_STATE.character;

  // Simple skill system
  const skills = {
    'Power Strike': { damage: 2, mpCost: 10 },
    'Fireball': { damage: 3, mpCost: 15 },
    'Heal': { heal: 20, mpCost: 12 }
  };

  const skill = skills[skillName];
  if (!skill || char.mp < skill.mpCost) {
    showNotification('Not enough MP!', 'danger');
    return;
  }

  updateMP(-skill.mpCost);

  if (skill.heal) {
    updateHP(skill.heal);
    GAME_STATE.combat.combatLog.push(`You use ${skillName} and restore ${skill.heal} HP!`);
  } else {
    const enemy = GAME_STATE.combat.enemies.find(e => e.id === targetEnemyId);
    if (enemy) {
      const damage = Math.floor(char.derived.magic * skill.damage);
      enemy.hp = Math.max(0, enemy.hp - damage);
      GAME_STATE.combat.combatLog.push(`You use ${skillName} on ${enemy.name} for ${damage} damage!`);

      if (enemy.hp <= 0) {
        GAME_STATE.combat.combatLog.push(`${enemy.name} is defeated!`);
      }
    }
  }

  updateCombatUI();
  checkCombatEnd();
  if (!GAME_STATE.combat) return;

  nextTurn();
}

/**
 * Player defends
 */
function playerDefend() {
  GAME_STATE.combat.playerDefending = true;
  GAME_STATE.combat.combatLog.push('You take a defensive stance!');

  updateCombatUI();
  nextTurn();
}

/**
 * Enemy turn AI
 */
function enemyTurn(enemy) {
  if (enemy.hp <= 0) {
    nextTurn();
    return;
  }

  const player = GAME_STATE.character;
  const defending = GAME_STATE.combat.playerDefending || false;

  const damage = Math.max(1, enemy.attack - (defending ? player.derived.defense * 2 : player.derived.defense) + Math.floor(Math.random() * 4));

  updateHP(-damage);

  GAME_STATE.combat.combatLog.push(`${enemy.name} attacks you for ${damage} damage!`);
  GAME_STATE.combat.playerDefending = false;

  updateCombatUI();

  if (player.hp <= 0) {
    endCombatDefeat();
    return;
  }

  setTimeout(() => nextTurn(), 1000);
}

/**
 * Next turn in combat
 */
function nextTurn() {
  GAME_STATE.combat.currentTurn++;

  if (GAME_STATE.combat.currentTurn >= GAME_STATE.combat.turnOrder.length) {
    GAME_STATE.combat.currentTurn = 0;
    GAME_STATE.combat.round++;
  }

  const current = GAME_STATE.combat.turnOrder[GAME_STATE.combat.currentTurn];

  if (current.isPlayer) {
    // Player's turn
    updateCombatUI();
  } else {
    // Enemy turn
    updateCombatUI();
    setTimeout(() => enemyTurn(current.enemy), 500);
  }
}

/**
 * Check if combat should end
 */
function checkCombatEnd() {
  const allEnemiesDefeated = GAME_STATE.combat.enemies.every(e => e.hp <= 0);

  if (allEnemiesDefeated) {
    endCombatVictory();
  }
}

/**
 * End combat with victory
 */
function endCombatVictory() {
  const enemies = GAME_STATE.combat.enemies;

  endCombat(true);
  setUIMode('story');

  continueAfterCombat(true, enemies);
}

/**
 * End combat with defeat
 */
function endCombatDefeat() {
  const enemies = GAME_STATE.combat.enemies;

  endCombat(false);
  setUIMode('story');

  continueAfterCombat(false, enemies);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeCombat,
    playerAttack,
    playerUseSkill,
    playerDefend,
    nextTurn
  };
}
