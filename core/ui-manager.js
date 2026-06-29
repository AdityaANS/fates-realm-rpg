/**
 * UI Manager - Handle mode switching and UI updates
 */

/**
 * Set the active UI mode
 * @param {string} mode - 'intro', 'character-creation', 'story', 'combat', 'shop', 'map'
 */
function setUIMode(mode) {
  console.log(`Switching UI mode to: ${mode}`);

  GAME_STATE.mode = mode;

  // Hide all mode panels
  const modes = ['intro-screen', 'login-screen', 'character-creation-screen', 'starter-screen', 'story-mode', 'combat-mode', 'shop-mode', 'map-mode'];
  modes.forEach(modeId => {
    const element = document.getElementById(modeId);
    if (element) {
      element.classList.remove('active');
      element.style.display = 'none';
    }
  });

  // Show the selected mode
  let targetElement;
  switch(mode) {
    case 'intro':
      targetElement = document.getElementById('intro-screen');
      break;
    case 'login':
      targetElement = document.getElementById('login-screen');
      break;
    case 'character-creation':
      targetElement = document.getElementById('character-creation-screen');
      break;
    case 'starter':
      targetElement = document.getElementById('starter-screen');
      break;
    case 'story':
      targetElement = document.getElementById('story-mode');
      refreshStoryUI();
      break;
    case 'combat':
      targetElement = document.getElementById('combat-mode');
      initializeCombatUI();
      break;
    case 'shop':
      targetElement = document.getElementById('shop-mode');
      initializeShopUI();
      break;
    case 'map':
      targetElement = document.getElementById('map-mode');
      // Need to show the panel first, then initialize canvas after it's visible
      // This will be done after the targetElement.style.display = 'flex' below
      break;
  }

  if (targetElement) {
    targetElement.classList.add('active');
    targetElement.style.display = 'flex';
  }

  // Special handling for map mode - initialize canvas after it's visible
  if (mode === 'map') {
    setTimeout(() => {
      if (!mapCanvas || !mapCtx || mapCanvas.width === 0) {
        initMapCanvas();
      }
      renderMap();
    }, 50);
  }

  updateLayoutForMode(mode);

  // Update persistent UI elements
  updatePersistentUI();
}

function updateLayoutForMode(mode) {
  const topBar = document.getElementById('top-bar');
  const sidebar = document.getElementById('sidebar');
  const hideChromeModes = ['intro', 'login', 'character-creation', 'starter'];
  const shouldHideChrome = hideChromeModes.includes(mode);

  if (topBar) {
    topBar.style.display = shouldHideChrome ? 'none' : 'flex';
  }

  if (sidebar) {
    sidebar.style.display = shouldHideChrome ? 'none' : 'flex';
  }
}

/**
 * Update persistent UI elements (HP bar, stats sidebar, etc.)
 */
function updatePersistentUI() {
  const char = GAME_STATE.character;

  // Update top bar stats
  const hpBar = document.getElementById('hp-bar');
  const mpBar = document.getElementById('mp-bar');
  const hpText = document.getElementById('hp-text');
  const mpText = document.getElementById('mp-text');
  const levelText = document.getElementById('level-text');
  const goldText = document.getElementById('gold-text');

  if (hpBar) {
    const hpPercent = (char.hp / char.maxHp) * 100;
    hpBar.style.width = `${hpPercent}%`;
  }

  if (mpBar) {
    const mpPercent = (char.mp / char.maxMp) * 100;
    mpBar.style.width = `${mpPercent}%`;
  }

  if (hpText) hpText.textContent = `${char.hp}/${char.maxHp}`;
  if (mpText) mpText.textContent = `${char.mp}/${char.maxMp}`;
  if (levelText) levelText.textContent = `Lv ${char.level}`;
  if (goldText) goldText.textContent = `${char.gold}g`;

  // Update sidebar if visible
  refreshCharacterUI();
  refreshInventoryUI();
}

/**
 * Refresh character stats display in sidebar
 */
function refreshCharacterUI() {
  const char = GAME_STATE.character;
  const statsContainer = document.getElementById('character-stats');

  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <h3>${char.name || 'Adventurer'}</h3>
    <p class="class-name">${char.class || 'Wanderer'} - Level ${char.level}</p>

    <div class="stat-row">
      <span>Body:</span>
      <span>${char.stats.body}</span>
    </div>
    <div class="stat-row">
      <span>Mind:</span>
      <span>${char.stats.mind}</span>
    </div>
    <div class="stat-row">
      <span>Soul:</span>
      <span>${char.stats.soul}</span>
    </div>

    <hr>

    <div class="stat-row">
      <span>Attack:</span>
      <span>${char.derived.attack}</span>
    </div>
    <div class="stat-row">
      <span>Defense:</span>
      <span>${char.derived.defense}</span>
    </div>
    <div class="stat-row">
      <span>Magic:</span>
      <span>${char.derived.magic}</span>
    </div>
    <div class="stat-row">
      <span>Speed:</span>
      <span>${char.derived.speed}</span>
    </div>
  `;
}

/**
 * Refresh inventory display in sidebar
 */
function refreshInventoryUI() {
  const inventoryContainer = document.getElementById('inventory-list');

  if (!inventoryContainer) return;

  const char = GAME_STATE.character;

  if (char.inventory.length === 0) {
    inventoryContainer.innerHTML = '<p class="empty-message">No items</p>';
    return;
  }

  inventoryContainer.innerHTML = char.inventory.map(item => `
    <div class="inventory-item" data-item-id="${item.id}">
      <span class="item-name">${item.name}</span>
      ${item.equipSlot ? `<button class="equip-btn" onclick="equipItem('${item.id}')">Equip</button>` : ''}
      <button class="use-btn" onclick="useItem('${item.id}')">Use</button>
    </div>
  `).join('');
}

/**
 * Refresh story log display
 */
function refreshStoryUI() {
  const storyLog = document.getElementById('story-log');
  if (!storyLog) return;

  storyLog.innerHTML = GAME_STATE.storyLog.map(msg => {
    const roleClass = msg.role === 'user' ? 'user-message' :
                      msg.role === 'system' ? 'system-message' : 'ai-message';

    return `
      <div class="story-message ${roleClass}">
        <div class="message-content">${msg.content}</div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  storyLog.scrollTop = storyLog.scrollHeight;
}

/**
 * Show loading indicator
 */
function showLoading(message = 'Loading...') {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    loader.textContent = message;
    loader.style.display = 'block';
  }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  const loader = document.getElementById('loading-indicator');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Confirm dialog
 */
function showConfirm(message, callback) {
  const confirmed = confirm(message);
  if (confirmed && callback) {
    callback();
  }
  return confirmed;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setUIMode,
    updatePersistentUI,
    refreshCharacterUI,
    refreshInventoryUI,
    refreshStoryUI,
    showLoading,
    hideLoading,
    showNotification,
    showConfirm
  };
}
