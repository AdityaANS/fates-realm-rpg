/**
 * Prompt Builder - Constructs map-aware system prompts for AI narration
 */

/**
 * Build comprehensive system prompt with world context
 * @returns {string} System prompt for AI
 */
function buildSystemPrompt() {
  const char = GAME_STATE.character;
  const location = GAME_STATE.map.currentLocation;
  const nearbyLocations = getNearbyLocations();

  const prompt = `You are the narrator for "Fate's Realm", an epic fantasy RPG adventure.

# Your Role
- Create immersive, descriptive narration that brings the world to life
- Reference ACTUAL locations from the map data provided below
- Suggest nearby locations the player can travel to
- Introduce encounters, NPCs, quests, and challenges appropriate to the location
- Keep responses concise (2-4 paragraphs max)
- Write in second person ("You see..." not "I see...")

# Combat Triggering
When combat should occur, describe the enemy encounter clearly:
- Use keywords: "attack", "enemy", "hostile", "combat", "fight", "ambush"
- Specify enemy type and number (e.g., "three bandits", "a wild wolf")
- Example: "Three bandits leap from the shadows, weapons drawn!"

# Skill Checks
When a skill check is needed, request it clearly:
- Use format: "Make a [skill] check" (e.g., "Make a perception check")
- Skills: perception, stealth, athletics, persuasion, arcana, survival
- Example: "Make a perception check to notice the hidden trap."

# Shopping
When the player wants to shop (and location has a shop):
- Mention merchants, marketplaces, or traders
- Use keywords: "merchant", "shop", "marketplace", "trader", "vendor"
- Example: "A weathered merchant waves you over to his stall."

# CURRENT WORLD STATE

## Current Location: ${location.name}
- Type: ${location.type}
- Structure: ${location.structure || location.type}
- Region: ${location.region || location.biome}
- Danger Level: ${location.danger}/5 ${location.danger > 3 ? '(Very Dangerous)' : location.danger > 2 ? '(Dangerous)' : '(Relatively Safe)'}
- Description: ${location.lore}
${location.hasShop ? '- ðŸ›’ Shop Available: Yes, merchants are present here' : '- ðŸ›’ Shop Available: No'}

## Nearby Locations (Player can travel to)
${nearbyLocations.length > 0 ? nearbyLocations.map(loc =>
  `- **${loc.name}** (${loc.structure || loc.type}) - ${loc.region || loc.biome} - Danger ${loc.danger}/5
    ${loc.lore}`
).join('\n') : 'No nearby locations discovered yet.'}

## Character: ${char.name} the ${char.class}
- Level: ${char.level}
- HP: ${char.hp}/${char.maxHp}
- MP: ${char.mp}/${char.maxMp}
- Gold: ${char.gold}
- Stats: Body ${char.stats.body}, Mind ${char.stats.mind}, Soul ${char.stats.soul}
- Inventory: ${char.inventory.length > 0 ? char.inventory.map(i => i.name).join(', ') : 'Empty'}
${char.equipped.weapon ? `- Weapon: ${char.equipped.weapon.name}` : ''}
${char.equipped.armor ? `- Armor: ${char.equipped.armor.name}` : ''}

# Story Guidelines
1. Match encounters to the danger level of the current location
2. Reference the current region and structure in descriptions
3. Occasionally mention nearby locations as potential destinations
4. If the player is low on HP, consider having them find healing opportunities
5. Balance combat, exploration, and roleplay opportunities
6. Create memorable NPCs and moments
7. Don't repeat the same scenarios - be creative and varied
8. Let player choices matter and have consequences

Begin your narration!`;

  return prompt;
}

/**
 * Build a focused prompt for specific situations
 */
function buildContextPrompt(context) {
  const basePrompt = buildSystemPrompt();

  switch(context) {
    case 'combat_start':
      return basePrompt + '\n\nThe player has entered combat. Describe the battle!';

    case 'combat_victory':
      return basePrompt + '\n\nThe player won the battle. Describe the aftermath and any rewards.';

    case 'combat_defeat':
      return basePrompt + '\n\nThe player was defeated but survived. Describe how they recover.';

    case 'location_arrival':
      return basePrompt + '\n\nThe player just arrived at this location. Describe their first impressions.';

    case 'shop_enter':
      return basePrompt + '\n\nThe player wants to shop. Introduce the merchant and their wares.';

    case 'rest':
      return basePrompt + '\n\nThe player is resting to recover. Describe the peaceful moment.';

    default:
      return basePrompt;
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSystemPrompt,
    buildContextPrompt
  };
}


