/**
 * Combat UI - Interface for arena combat
 */

function initializeCombatUI() {
  if (!GAME_STATE.combat) {
    console.error('No combat state to display');
    return;
  }

  initializeCombat();
  updateCombatUI();
}

function updateCombatUI() {
  const combatLog = document.getElementById('combat-log');
  const enemyList = document.getElementById('enemy-list');
  const actionButtons = document.getElementById('combat-actions');

  if (!combatLog || !enemyList || !actionButtons) return;

  // Update combat log
  combatLog.innerHTML = GAME_STATE.combat.combatLog.map(log =>
    `<div class="combat-log-entry">${log}</div>`
  ).join('');
  combatLog.scrollTop = combatLog.scrollHeight;

  // Update enemy list
  enemyList.innerHTML = GAME_STATE.combat.enemies.map(enemy => {
    const hpPercent = (enemy.hp / enemy.maxHp) * 100;
    return `
      <div class="enemy-card ${enemy.hp <= 0 ? 'defeated' : ''}" data-enemy-id="${enemy.id}">
        <div class="enemy-name">${enemy.name}</div>
        <div class="enemy-hp-bar">
          <div class="enemy-hp-fill" style="width: ${hpPercent}%"></div>
          <span class="enemy-hp-text">${enemy.hp}/${enemy.maxHp}</span>
        </div>
        ${enemy.hp > 0 ? `<button class="btn btn-danger" onclick="playerAttack('${enemy.id}')">Attack</button>` : ''}
      </div>
    `;
  }).join('');

  // Update action buttons (disable if not player's turn)
  const current = GAME_STATE.combat.turnOrder[GAME_STATE.combat.currentTurn];
  const isPlayerTurn = current && current.isPlayer;

  actionButtons.querySelectorAll('button').forEach(btn => {
    btn.disabled = !isPlayerTurn;
  });

  updatePersistentUI();
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeCombatUI, updateCombatUI };
}
