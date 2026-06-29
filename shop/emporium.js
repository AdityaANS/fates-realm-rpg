/**
 * Emporium - Shop UI and purchasing system
 */

function initializeShopUI() {
  if (!GAME_STATE.shop) {
    console.error('No shop state');
    return;
  }

  updateShopUI();
}

function updateShopUI() {
  const shopInventory = document.getElementById('shop-inventory');
  const shopCart = document.getElementById('shop-cart');

  if (!shopInventory) return;

  // Display shop items
  shopInventory.innerHTML = GAME_STATE.shop.inventory.map(item => `
    <div class="shop-item">
      <div class="item-name">${item.name}</div>
      <div class="item-price">${item.price}g</div>
      <button class="btn btn-primary" onclick="addItemToCart('${item.id}')">Add to Cart</button>
    </div>
  `).join('');

  // Display cart
  if (shopCart) {
    const totalCost = GAME_STATE.shop.cart.reduce((sum, item) => sum + item.price, 0);

    shopCart.innerHTML = `
      <h3>Cart</h3>
      ${GAME_STATE.shop.cart.map(item => `
        <div class="cart-item">
          ${item.name} - ${item.price}g
          <button onclick="removeItemFromCart('${item.id}')">Remove</button>
        </div>
      `).join('')}
      <div class="cart-total">Total: ${totalCost}g</div>
      <button class="btn btn-primary" onclick="completePurchase()" ${totalCost > GAME_STATE.character.gold ? 'disabled' : ''}>Purchase</button>
      <button class="btn btn-secondary" onclick="closeShopUI()">Leave Shop</button>
    `;
  }
}

function addItemToCart(itemId) {
  const item = GAME_STATE.shop.inventory.find(i => i.id === itemId);
  if (item) {
    addToCart(item);
    updateShopUI();
  }
}

function removeItemFromCart(itemId) {
  removeFromCart(itemId);
  updateShopUI();
}

function completePurchase() {
  const purchases = [...GAME_STATE.shop.cart];

  if (purchaseCart()) {
    showNotification('Purchase successful!', 'success');
    updateShopUI();

    // After purchasing, close shop and continue story
    setTimeout(() => {
      closeShopUI();
      continueAfterShopping(purchases);
    }, 1000);
  }
}

function closeShopUI() {
  closeShop();
  setUIMode('story');
}

function openFatesEmporiumManually() {
  if (typeof saveGame === 'function') {
    saveGame();
  }

  const payload = {
    source: 'rpg',
    gold: Math.floor(GAME_STATE.character.gold || 0),
    updatedAt: Date.now()
  };
  localStorage.setItem('fatesRealmEmporiumSync', JSON.stringify(payload));

  const popup = window.open('/fates-emporium', '_blank', 'noopener');
  if (!popup) {
    // Fallback if popup blockers are enabled.
    window.location.href = '/fates-emporium';
  } else {
    showNotification("Fate's Emporium opened in a new tab.", 'info');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeShopUI, updateShopUI, openFatesEmporiumManually };
}
