/**
 * State Manager - Safe state update functions
 * Always use these functions instead of directly modifying GAME_STATE
 */

// Character Updates
function updateHP(amount) {
  GAME_STATE.character.hp = Math.max(0, Math.min(
    GAME_STATE.character.hp + amount,
    GAME_STATE.character.maxHp
  ));

  if (GAME_STATE.character.hp === 0) {
    handlePlayerDeath();
  }

  updateCharacterDisplay();
}

function updateMP(amount) {
  GAME_STATE.character.mp = Math.max(0, Math.min(
    GAME_STATE.character.mp + amount,
    GAME_STATE.character.maxMp
  ));
  updateCharacterDisplay();
}

function updateGold(amount) {
  GAME_STATE.character.gold = Math.max(0, GAME_STATE.character.gold + amount);
  updateCharacterDisplay();
}

function addXP(amount) {
  GAME_STATE.character.xp += amount;

  while (GAME_STATE.character.xp >= GAME_STATE.character.xpToNextLevel) {
    levelUp();
  }

  updateCharacterDisplay();
}

function levelUp() {
  GAME_STATE.character.level++;
  GAME_STATE.character.xp -= GAME_STATE.character.xpToNextLevel;
  GAME_STATE.character.xpToNextLevel = Math.floor(GAME_STATE.character.xpToNextLevel * 1.5);

  // Stat increases
  GAME_STATE.character.maxHp += 10;
  GAME_STATE.character.maxMp += 5;
  GAME_STATE.character.hp = GAME_STATE.character.maxHp;
  GAME_STATE.character.mp = GAME_STATE.character.maxMp;

  // Stat point allocation (auto for now)
  const statToIncrease = ['body', 'mind', 'soul'][Math.floor(Math.random() * 3)];
  GAME_STATE.character.stats[statToIncrease] += 2;

  recalculateDerivedStats();

  addStoryMessage('system', `🎉 Level Up! You are now level ${GAME_STATE.character.level}!`);

  console.log(`Level Up! Now level ${GAME_STATE.character.level}`);
}

function recalculateDerivedStats() {
  const stats = GAME_STATE.character.stats;
  GAME_STATE.character.derived.attack = Math.floor(stats.body * 0.5 + stats.mind * 0.2);
  GAME_STATE.character.derived.defense = Math.floor(stats.body * 0.4 + stats.soul * 0.2);
  GAME_STATE.character.derived.magic = Math.floor(stats.mind * 0.6 + stats.soul * 0.3);
  GAME_STATE.character.derived.speed = Math.floor(stats.body * 0.3 + stats.mind * 0.3);
}

// Inventory Management
function addItem(item) {
  GAME_STATE.character.inventory.push(item);
  updateInventoryDisplay();
  console.log(`Added item: ${item.name}`);
}

function removeItem(itemId) {
  const index = GAME_STATE.character.inventory.findIndex(item => item.id === itemId);
  if (index !== -1) {
    const removed = GAME_STATE.character.inventory.splice(index, 1)[0];
    updateInventoryDisplay();
    console.log(`Removed item: ${removed.name}`);
    return removed;
  }
  return null;
}

function equipItem(itemId) {
  const item = GAME_STATE.character.inventory.find(i => i.id === itemId);
  if (!item || !item.equipSlot) return false;

  // Unequip current item in that slot
  if (GAME_STATE.character.equipped[item.equipSlot]) {
    unequipItem(item.equipSlot);
  }

  // Equip new item
  GAME_STATE.character.equipped[item.equipSlot] = item;
  removeItem(itemId);
  applyItemEffects(item, true);

  updateCharacterDisplay();
  updateInventoryDisplay();
  return true;
}

function unequipItem(slot) {
  const item = GAME_STATE.character.equipped[slot];
  if (!item) return false;

  applyItemEffects(item, false);
  GAME_STATE.character.equipped[slot] = null;
  addItem(item);

  updateCharacterDisplay();
  updateInventoryDisplay();
  return true;
}

function applyItemEffects(item, equip = true) {
  const multiplier = equip ? 1 : -1;

  if (item.effects) {
    if (item.effects.maxHp) {
      GAME_STATE.character.maxHp += item.effects.maxHp * multiplier;
    }
    if (item.effects.maxMp) {
      GAME_STATE.character.maxMp += item.effects.maxMp * multiplier;
    }
    if (item.effects.attack) {
      GAME_STATE.character.derived.attack += item.effects.attack * multiplier;
    }
    if (item.effects.defense) {
      GAME_STATE.character.derived.defense += item.effects.defense * multiplier;
    }
    if (item.effects.magic) {
      GAME_STATE.character.derived.magic += item.effects.magic * multiplier;
    }
  }
}

// Location and Map
function changeLocation(locationId) {
  const newLocation = GAME_STATE.map.nodes.find(node => node.id === locationId);
  if (!newLocation) {
    console.error(`Location ${locationId} not found`);
    return false;
  }

  GAME_STATE.map.currentLocation = newLocation;

  if (!GAME_STATE.map.visitedLocations.includes(locationId)) {
    GAME_STATE.map.visitedLocations.push(locationId);
  }

  console.log(`Moved to: ${newLocation.name}`);
  return true;
}

function getNearbyLocations() {
  if (!GAME_STATE.map.currentLocation) return [];

  const currentId = GAME_STATE.map.currentLocation.id;
  const connectedIds = GAME_STATE.map.edges
    .filter(edge => edge.source === currentId || edge.target === currentId)
    .map(edge => edge.source === currentId ? edge.target : edge.source);

  return GAME_STATE.map.nodes.filter(node => connectedIds.includes(node.id));
}

// Story Management
function addStoryMessage(role, content) {
  const message = {
    role,  // 'user', 'assistant', 'system'
    content,
    timestamp: Date.now()
  };

  GAME_STATE.storyLog.push(message);

  // Also add to conversation history for AI context (limit to last 20 messages)
  if (role !== 'system') {
    GAME_STATE.conversationHistory.push({ role, content });
    if (GAME_STATE.conversationHistory.length > 20) {
      GAME_STATE.conversationHistory.shift();
    }
  }
}

function clearStoryLog() {
  GAME_STATE.storyLog = [];
  GAME_STATE.conversationHistory = [];
}

// Combat State
function startCombat(enemies) {
  GAME_STATE.combat = {
    enemies: enemies,
    turnOrder: [],
    currentTurn: 0,
    playerAction: null,
    combatLog: [],
    round: 1
  };

  console.log('Combat started with', enemies.length, 'enemies');
}

function endCombat(victory = true) {
  if (victory) {
    // Award XP and gold
    const totalXP = GAME_STATE.combat.enemies.reduce((sum, e) => sum + (e.xpReward || 0), 0);
    const totalGold = GAME_STATE.combat.enemies.reduce((sum, e) => sum + (e.goldReward || 0), 0);

    addXP(totalXP);
    updateGold(totalGold);

    addStoryMessage('system', `Victory! Gained ${totalXP} XP and ${totalGold} gold.`);
  } else {
    addStoryMessage('system', 'You have been defeated...');
  }

  GAME_STATE.combat = null;
  console.log('Combat ended. Victory:', victory);
}

// Shop State
function openShop(shopInventory, shopType, shopTier) {
  GAME_STATE.shop = {
    inventory: shopInventory,
    cart: [],
    shopType,
    shopTier
  };

  console.log(`Opened ${shopType} shop (Tier ${shopTier})`);
}

function closeShop() {
  GAME_STATE.shop = null;
  console.log('Shop closed');
}

function addToCart(item) {
  if (GAME_STATE.shop) {
    GAME_STATE.shop.cart.push(item);
  }
}

function removeFromCart(itemId) {
  if (GAME_STATE.shop) {
    GAME_STATE.shop.cart = GAME_STATE.shop.cart.filter(item => item.id !== itemId);
  }
}

function purchaseCart() {
  if (!GAME_STATE.shop) return false;

  const totalCost = GAME_STATE.shop.cart.reduce((sum, item) => sum + item.price, 0);

  if (GAME_STATE.character.gold < totalCost) {
    console.log('Not enough gold!');
    return false;
  }

  updateGold(-totalCost);
  GAME_STATE.shop.cart.forEach(item => addItem(item));
  GAME_STATE.shop.cart = [];

  console.log(`Purchased items for ${totalCost} gold`);
  return true;
}

// Utility Functions
function handlePlayerDeath() {
  console.log('Player has died!');
  addStoryMessage('system', '💀 You have fallen in battle...');

  // Respawn with penalty
  GAME_STATE.character.hp = Math.floor(GAME_STATE.character.maxHp * 0.5);
  GAME_STATE.character.gold = Math.floor(GAME_STATE.character.gold * 0.8);

  if (GAME_STATE.combat) {
    endCombat(false);
  }
}

function updateCharacterDisplay() {
  // This will be called by UI to refresh character stats display
  if (typeof refreshCharacterUI === 'function') {
    refreshCharacterUI();
  }
}

function updateInventoryDisplay() {
  // This will be called by UI to refresh inventory display
  if (typeof refreshInventoryUI === 'function') {
    refreshInventoryUI();
  }
}

// Save/Load
function saveGame() {
  try {
    const saveData = JSON.stringify(GAME_STATE);
    localStorage.setItem('fatesRealmSave', saveData);
    GAME_STATE.lastSaveTime = Date.now();
    console.log('Game saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

function loadGame() {
  try {
    const saveData = localStorage.getItem('fatesRealmSave');
    if (!saveData) {
      console.log('No save data found');
      return false;
    }

    const loadedState = JSON.parse(saveData);
    Object.assign(GAME_STATE, loadedState);
    console.log('Game loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load game:', error);
    return false;
  }
}

function deleteSave() {
  localStorage.removeItem('fatesRealmSave');
  console.log('Save data deleted');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateHP, updateMP, updateGold, addXP, levelUp, recalculateDerivedStats,
    addItem, removeItem, equipItem, unequipItem,
    changeLocation, getNearbyLocations,
    addStoryMessage, clearStoryLog,
    startCombat, endCombat,
    openShop, closeShop, addToCart, removeFromCart, purchaseCart,
    saveGame, loadGame, deleteSave
  };
}
