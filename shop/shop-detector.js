/**
 * Shop Detector - Detect shop triggers in AI responses
 */

const SHOP_KEYWORDS = ['merchant', 'shop', 'marketplace', 'trader', 'vendor', 'stall', 'store', 'buy', 'purchase'];
let lastShopTriggerAt = 0;
const SHOP_TRIGGER_COOLDOWN_MS = 20000;

function detectShopTrigger(response) {
  // Deprecated: auto merchant popup disabled.
  // We now only use manual Fate's Emporium button.
  return false;
}

function triggerShop() {
  const location = GAME_STATE.map.currentLocation;
  const inventory = generateShopInventory(location);

  openShop(inventory, location.type, location.tier);
  setUIMode('shop');

  showNotification('Merchant shop opened!', 'info');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectShopTrigger, triggerShop };
}
