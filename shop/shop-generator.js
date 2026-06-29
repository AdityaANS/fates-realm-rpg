/**
 * Shop Generator - Generate shop inventory based on location
 */

function generateShopInventory(location) {
  const tier = location.tier || 1;
  const items = [];

  // Generate 5-10 items
  const itemCount = 5 + Math.floor(Math.random() * 6);

  for (let i = 0; i < itemCount; i++) {
    items.push(generateShopItem(tier));
  }

  return items;
}

function generateShopItem(tier) {
  const itemTemplates = [
    { name: 'Health Potion', type: 'consumable', baseCost: 50, effects: { heal: 30 } },
    { name: 'Mana Potion', type: 'consumable', baseCost: 40, effects: { restoreMP: 25 } },
    { name: 'Iron Sword', type: 'weapon', equipSlot: 'weapon', baseCost: 100, effects: { attack: 5 } },
    { name: 'Steel Armor', type: 'armor', equipSlot: 'armor', baseCost: 150, effects: { defense: 5 } },
    { name: 'Lucky Charm', type: 'accessory', equipSlot: 'accessory', baseCost: 80, effects: { gold: 10 } }
  ];

  const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
  const tierMultiplier = 1 + (tier * 0.3);

  return {
    id: `item_${Date.now()}_${Math.random()}`,
    name: template.name,
    type: template.type,
    equipSlot: template.equipSlot,
    price: Math.floor(template.baseCost * tierMultiplier),
    effects: template.effects,
    description: `A ${tier >= 3 ? 'quality' : 'basic'} ${template.type}.`
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateShopInventory, generateShopItem };
}
