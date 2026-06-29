/**
 * Response Processor - Detect triggers in AI responses
 * Analyzes story responses for combat, shop, and skill check triggers
 */

/**
 * Process AI story response for triggers
 * @param {string} response - AI narrative response
 */
function processStoryResponse(response) {
  console.log('Processing story response for triggers...');

  // Check for triggers in priority order
  const combatDetected = detectCombatTrigger(response);
  if (combatDetected) {
    console.log('Combat trigger detected!');
    return;
  }

  const skillCheckDetected = detectSkillCheckTrigger(response);
  if (skillCheckDetected) {
    console.log('Skill check trigger detected!');
    return;
  }

  console.log('No triggers detected in response');
}

// Export function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processStoryResponse
  };
}
