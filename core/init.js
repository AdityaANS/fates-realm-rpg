/**
 * Game Initialization - Setup and startup sequence
 */

const LOGIN_CREDENTIALS = {
  userId: 'admin',
  password: 'admin123'
};

const CREATION_RULES = {
  base: 10,
  min: 0,
  max: 20,
  removedPerBonus: 5,
  bonusPerChunk: 1
};

const ELDEN_STAT_KEYS = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane'];
const EMPORIUM_SYNC_KEY = 'fatesRealmEmporiumSync';
const LOGIN_SESSION_KEY = 'fatesRealmLoggedIn';
let lastValidCreationStats = null;

/**
 * Initialize the game on page load
 */
function initializeGame() {
  console.log('=== Fate\'s Realm - Initializing ===');

  setupEventListeners();
  populateClassOptions();
  setCreationLimits();
  clearCharacterForm();

  const userInput = document.getElementById('login-user-input');
  const passInput = document.getElementById('login-pass-input');
  if (userInput && !userInput.value) userInput.value = LOGIN_CREDENTIALS.userId;
  if (passInput && !passInput.value) passInput.value = LOGIN_CREDENTIALS.password;

  // Pull latest synced balance from emporium if available.
  applyEmporiumGoldSyncFromStorage();

  // Keep user session sticky whenever a valid profile exists.
  if (loadGame() && hasConfiguredCharacter()) {
    localStorage.setItem(LOGIN_SESSION_KEY, '1');
  }

  // Route users back into the game when returning from Emporium.
  if (tryHandleEmporiumReturn()) {
    console.log('Returned from Emporium, restored game view');
    return;
  }

  // Persisted session avoids forcing sign-in every refresh.
  const hasSession = localStorage.getItem(LOGIN_SESSION_KEY) === '1';
  if (hasSession) {
    const loaded = loadGame();
    if (loaded && hasConfiguredCharacter()) {
      setUIMode('story');
      refreshStoryUI();
      updatePersistentUI();
      return;
    }
    startNewCharacterProfile();
    setUIMode('character-creation');
  } else {
    setUIMode('login');
  }

  console.log('Game initialization complete');
}

function tryHandleEmporiumReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('fromEmporium') !== '1') return false;

  const loaded = loadGame();
  if (!loaded || !hasConfiguredCharacter()) {
    localStorage.setItem(LOGIN_SESSION_KEY, '1');
    startNewCharacterProfile();
    setUIMode('character-creation');
    return true;
  }

  setUIMode('story');
  refreshStoryUI();
  updatePersistentUI();
  if (typeof window.history?.replaceState === 'function') {
    window.history.replaceState({}, '', '/');
  }
  showNotification('Returned from Fate\'s Emporium.', 'success');
  return true;
}

function setCreationLimits() {
  const maxElement = document.getElementById('builder-max-stat');
  if (maxElement) {
    maxElement.textContent = String(CREATION_RULES.max);
  }

  ELDEN_STAT_KEYS.forEach((key) => {
    const input = document.getElementById(`stat-${key}-input`);
    if (!input) return;
    input.min = String(CREATION_RULES.min);
    input.max = String(CREATION_RULES.max);
    input.value = String(CREATION_RULES.base);
  });
}

function populateClassOptions() {
  const classSelect = document.getElementById('char-class-select');
  if (!classSelect) return;

  classSelect.innerHTML = '<option value="">Select a class...</option>';
  Object.entries(CLASS_TEMPLATES).forEach(([key, template]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${template.name} - ${template.description}`;
    classSelect.appendChild(option);
  });
}

function handleLogin() {
  const userInput = document.getElementById('login-user-input');
  const passInput = document.getElementById('login-pass-input');
  if (!userInput || !passInput) return;

  const userId = userInput.value.trim();
  const password = passInput.value;

  if (userId !== LOGIN_CREDENTIALS.userId || password !== LOGIN_CREDENTIALS.password) {
    showNotification('Invalid credentials. Use admin / admin123.', 'danger');
    return;
  }

  localStorage.setItem(LOGIN_SESSION_KEY, '1');
  showNotification('Login successful', 'success');
  routeAfterLogin();
}

function routeAfterLogin() {
  localStorage.setItem(LOGIN_SESSION_KEY, '1');
  const loaded = loadGame();
  if (loaded && hasConfiguredCharacter()) {
    setUIMode('starter');
    return;
  }

  startNewCharacterProfile();
  setUIMode('character-creation');
}

function hasConfiguredCharacter() {
  const char = GAME_STATE.character || {};
  const stats = char.stats || {};
  return Boolean(
    char.name &&
    char.class &&
    char.profileConfigured &&
    Number.isFinite(stats.body) &&
    Number.isFinite(stats.mind) &&
    Number.isFinite(stats.soul)
  );
}

function startNewCharacterProfile() {
  localStorage.setItem(LOGIN_SESSION_KEY, '1');
  Object.assign(GAME_STATE, {
    map: { nodes: [], edges: [], currentLocation: null, visitedLocations: [], mapGenerated: false, seed: null },
    character: {
      name: "",
      class: "",
      profileConfigured: false,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      gold: 100,
      stats: { body: 10, mind: 10, soul: 10 },
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
      derived: { attack: 5, defense: 5, magic: 5, speed: 5 },
      inventory: [],
      equipped: { weapon: null, armor: null, accessory: null },
      skills: [],
      activeEffects: []
    },
    storyLog: [],
    conversationHistory: [],
    mode: 'character-creation',
    combat: null,
    shop: null,
    lastSkillCheck: null,
    gameStartTime: Date.now()
  });

  clearCharacterForm();
}

function clearCharacterForm() {
  const nameInput = document.getElementById('char-name-input');
  const classSelect = document.getElementById('char-class-select');
  if (nameInput) nameInput.value = '';
  if (classSelect) classSelect.value = '';

  ELDEN_STAT_KEYS.forEach((key) => {
    const input = document.getElementById(`stat-${key}-input`);
    if (input) input.value = String(CREATION_RULES.base);
  });

  lastValidCreationStats = readEldenStatsFromForm(false);
  updateCreationPointDisplay(lastValidCreationStats);
}

/**
 * Start new game from legacy intro flow
 */
function startNewGame() {
  startNewCharacterProfile();
  setUIMode('character-creation');
}

/**
 * Continue existing game from legacy intro flow
 */
function continueGame() {
  if (loadGame() && hasConfiguredCharacter()) {
    setUIMode('starter');
    showNotification('Profile loaded successfully', 'success');
  } else {
    showNotification('No valid saved profile found', 'warning');
    setUIMode('character-creation');
  }
}

function readEldenStatsFromForm(strict = true) {
  const stats = {};

  for (const key of ELDEN_STAT_KEYS) {
    const input = document.getElementById(`stat-${key}-input`);
    const value = Number.parseInt(input?.value ?? '', 10);

    const min = CREATION_RULES.min;
    const max = CREATION_RULES.max;
    if (!Number.isFinite(value) || value < min || value > max) {
      if (strict) {
        throw new Error(`Each creation stat must be between ${min} and ${max}.`);
      }
      return null;
    }

    stats[key] = value;
  }

  return stats;
}

function calculateCreationBudget(stats) {
  const base = CREATION_RULES.base;
  const removed = ELDEN_STAT_KEYS.reduce((sum, key) => sum + Math.max(0, base - stats[key]), 0);
  const bonus = Math.floor(removed / CREATION_RULES.removedPerBonus) * CREATION_RULES.bonusPerChunk;
  const spent = ELDEN_STAT_KEYS.reduce((sum, key) => sum + Math.max(0, stats[key] - base), 0);
  return { removed, bonus, spent, remaining: bonus - spent };
}

function updateCreationPointDisplay(stats) {
  const points = document.getElementById('creation-points-left');
  if (!points || !stats) return;

  const budget = calculateCreationBudget(stats);
  points.textContent = String(budget.remaining);
  points.style.color = budget.remaining < 0 ? 'var(--color-danger)' : 'var(--color-gold)';
}

function applyStatsToInputs(stats) {
  ELDEN_STAT_KEYS.forEach((key) => {
    const input = document.getElementById(`stat-${key}-input`);
    if (input) input.value = String(stats[key]);
  });
}

function validateCreationBudgetLive(changedKey) {
  const currentStats = readEldenStatsFromForm(false);
  if (!currentStats) return;

  const budget = calculateCreationBudget(currentStats);
  if (budget.remaining < 0) {
    if (lastValidCreationStats) {
      applyStatsToInputs(lastValidCreationStats);
      updateCreationPointDisplay(lastValidCreationStats);
    }
    showNotification(`Not enough bonus points. Every ${CREATION_RULES.removedPerBonus} removed gives only ${CREATION_RULES.bonusPerChunk}.`, 'warning');
    return;
  }

  lastValidCreationStats = { ...currentStats };
  updateCreationPointDisplay(currentStats);

  // Make feedback clear for the input the user just touched.
  if (changedKey) {
    const changedInput = document.getElementById(`stat-${changedKey}-input`);
    if (changedInput) {
      changedInput.title = `Remaining points: ${budget.remaining}`;
    }
  }
}

function attachCreationInputListeners() {
  ELDEN_STAT_KEYS.forEach((key) => {
    const input = document.getElementById(`stat-${key}-input`);
    if (!input) return;
    input.addEventListener('input', () => validateCreationBudgetLive(key));
  });
}

function buildCoreStatsFromElden(er) {
  const body = Math.round((er.strength + er.dexterity + er.endurance + er.vigor) / 4);
  const mind = Math.round((er.mind + er.intelligence + er.arcane) / 3);
  const soul = Math.round((er.faith + er.arcane + er.mind) / 3);
  return { body, mind, soul };
}

function applyClassAndStats(selectedClass, erStats) {
  const classTemplate = CLASS_TEMPLATES[selectedClass];
  if (!classTemplate) {
    throw new Error('Invalid class selected');
  }

  const mappedStats = buildCoreStatsFromElden(erStats);
  const hpBonus = (erStats.vigor - CREATION_RULES.base) * 4 + (erStats.endurance - CREATION_RULES.base) * 2;
  const mpBonus = (erStats.mind - CREATION_RULES.base) * 4 + (erStats.intelligence - CREATION_RULES.base) * 2 + (erStats.faith - CREATION_RULES.base);

  GAME_STATE.character.class = classTemplate.name;
  GAME_STATE.character.stats = mappedStats;
  GAME_STATE.character.eldenStats = erStats;
  GAME_STATE.character.maxHp = Math.max(30, classTemplate.hp + hpBonus);
  GAME_STATE.character.hp = GAME_STATE.character.maxHp;
  GAME_STATE.character.maxMp = Math.max(10, classTemplate.mp + mpBonus);
  GAME_STATE.character.mp = GAME_STATE.character.maxMp;
  GAME_STATE.character.skills = [...classTemplate.skills];
  GAME_STATE.character.profileConfigured = true;
}

/**
 * Complete character creation
 */
function completeCharacterCreation() {
  try {
    const nameInput = document.getElementById('char-name-input');
    const classSelect = document.getElementById('char-class-select');

    const name = nameInput?.value.trim();
    const selectedClass = classSelect?.value;
    if (!name || !selectedClass) {
      showNotification('Please set a name and class first.', 'warning');
      return;
    }

    const eldenStats = readEldenStatsFromForm(true);
    const budget = calculateCreationBudget(eldenStats);
    if (budget.remaining < 0) {
      showNotification('You spent more points than allowed by the conversion rule.', 'danger');
      return;
    }

    GAME_STATE.character.name = name;
    localStorage.setItem(LOGIN_SESSION_KEY, '1');
    applyClassAndStats(selectedClass, eldenStats);
    recalculateDerivedStats();
    initializeMap(25);

    saveGame();
    setUIMode('starter');
    showNotification('Character saved. Entering prologue...', 'success');
  } catch (error) {
    showNotification(error.message || 'Failed to save character', 'danger');
  }
}

function ensureMapReady() {
  if (!GAME_STATE.map.mapGenerated || !GAME_STATE.map.currentLocation) {
    initializeMap(25);
  }
}

async function enterGameWorld() {
  ensureMapReady();
  setUIMode('story');

  setTimeout(async () => {
    if (GAME_STATE.storyLog.length === 0) {
      await startStory();
    } else {
      refreshStoryUI();
    }
  }, 100);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const storyInput = document.getElementById('story-input');
  const storySendBtn = document.getElementById('story-send-btn');
  const loginBtn = document.getElementById('login-btn');
  const loginPassInput = document.getElementById('login-pass-input');
  const loginUserInput = document.getElementById('login-user-input');

  if (storyInput && storySendBtn) {
    storySendBtn.addEventListener('click', handleStoryInput);
    storyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleStoryInput();
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  [loginPassInput, loginUserInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    });
  });

  attachCreationInputListeners();

  const mapBtn = document.getElementById('map-btn');
  const emporiumBtn = document.getElementById('emporium-btn');
  const newCharacterBtn = document.getElementById('new-character-btn');
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      ensureMapReady();
      setUIMode('map');
    });
  }

  if (emporiumBtn) {
    emporiumBtn.addEventListener('click', () => {
      if (typeof openFatesEmporiumManually === 'function') {
        openFatesEmporiumManually();
      }
    });
  }

  if (newCharacterBtn) {
    newCharacterBtn.addEventListener('click', createNewCharacter);
  }

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (saveGame()) {
        showNotification('Game saved!', 'success');
      }
    });
  }

  window.addEventListener('resize', () => {
    if (GAME_STATE.mode === 'map') {
      ensureMapReady();
      renderMap();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === EMPORIUM_SYNC_KEY) {
      applyEmporiumGoldSyncFromStorage(event.newValue);
    }
  });
}

function applyEmporiumGoldSyncFromStorage(rawValue = null) {
  try {
    const raw = rawValue ?? localStorage.getItem(EMPORIUM_SYNC_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload?.source !== 'emporium') return;
    const gold = Number(payload.gold);
    if (!Number.isFinite(gold) || gold < 0) return;

    GAME_STATE.character.gold = Math.floor(gold);
    updatePersistentUI();
    saveGame();
  } catch (error) {
    console.warn('Failed to sync gold from emporium:', error);
  }
}

function createNewCharacter() {
  const confirmed = showConfirm('Create a new character? This will delete your current saved profile.', () => {
    deleteSave();
    localStorage.setItem(LOGIN_SESSION_KEY, '1');
    startNewCharacterProfile();
    setUIMode('character-creation');
    showNotification('Previous character deleted. Create your new hero.', 'warning');
  });

  return confirmed;
}

/**
 * Handle story input from player
 */
function handleStoryInput() {
  const storyInput = document.getElementById('story-input');
  if (!storyInput) return;

  const message = storyInput.value.trim();
  if (!message) return;

  storyInput.value = '';
  sendStoryMessage(message);
}

/**
 * Use item from inventory
 */
function useItem(itemId) {
  const item = GAME_STATE.character.inventory.find(i => i.id === itemId);
  if (!item) return;

  if (item.effects) {
    if (item.effects.heal) {
      updateHP(item.effects.heal);
      showNotification(`Used ${item.name}, restored ${item.effects.heal} HP`, 'success');
    }
    if (item.effects.restoreMP) {
      updateMP(item.effects.restoreMP);
      showNotification(`Used ${item.name}, restored ${item.effects.restoreMP} MP`, 'success');
    }

    if (item.type === 'consumable') {
      removeItem(itemId);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initializeGame);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeGame,
    startNewGame,
    continueGame,
    completeCharacterCreation,
    enterGameWorld,
    calculateCreationBudget
  };
}
