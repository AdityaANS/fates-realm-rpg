/**
 * AI Client - Communication with OpenAI API for story narration
 */

/**
 * Send a message to the AI and get a response
 * @param {string} userMessage - The player's action/message
 * @returns {Promise<string>} AI response
 */
async function sendStoryMessage(userMessage) {
  try {
    showLoading('The tale unfolds...');

    // Build the system prompt with map context
    const systemPrompt = buildSystemPrompt();

    // Add user message to conversation history
    addStoryMessage('user', userMessage);

    // Prepare messages for API
    const messages = GAME_STATE.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('Sending to AI with', messages.length, 'messages');

    // Call backend API
    const response = await fetch('/api/story', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemPrompt,
        messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();
    const aiResponse = data.response;

    console.log('AI Response received:', aiResponse.substring(0, 100) + '...');

    // Add AI response to story log
    addStoryMessage('assistant', aiResponse);

    // Process response for triggers (combat, shop, skill checks)
    processStoryResponse(aiResponse);

    // Update UI
    refreshStoryUI();

    hideLoading();

    return aiResponse;

  } catch (error) {
    console.error('Error in sendStoryMessage:', error);

    hideLoading();

    showNotification('Failed to get AI response: ' + error.message, 'danger');

    return null;
  }
}

/**
 * Handle location arrival - generate AI narrative for new location
 */
async function handleLocationArrival(location) {
  const arrivalPrompt = `I arrive at ${location.name}. What do I see and experience here?`;

  await sendStoryMessage(arrivalPrompt);
}

/**
 * Start a new story chapter with the AI
 */
async function startStory() {
  const char = GAME_STATE.character;
  const loc = GAME_STATE.map.currentLocation;

  const introMessage = `I am ${char.name}, a ${char.class}. I find myself in ${loc.name}, ${loc.lore} What adventures await me?`;

  await sendStoryMessage(introMessage);
}

/**
 * Continue story after combat
 */
async function continueAfterCombat(victory, enemies) {
  const enemyNames = enemies.map(e => e.name).join(', ');

  let message;
  if (victory) {
    message = `I have defeated the ${enemyNames}. What happens next?`;
  } else {
    message = `I was defeated by the ${enemyNames}, but I survived. What happens now?`;
  }

  await sendStoryMessage(message);
}

/**
 * Continue story after shopping
 */
async function continueAfterShopping(purchases) {
  if (purchases.length === 0) {
    await sendStoryMessage('I leave the shop without purchasing anything. What do I do next?');
  } else {
    const itemNames = purchases.map(p => p.name).join(', ');
    await sendStoryMessage(`I purchased ${itemNames} from the shop. What happens next?`);
  }
}

/**
 * Handle skill check result in story
 */
async function narrateSkillCheckResult(skillType, success, roll, dc) {
  const message = success
    ? `I succeeded on the ${skillType} check (rolled ${roll} vs DC ${dc}). What happens?`
    : `I failed the ${skillType} check (rolled ${roll} vs DC ${dc}). What happens?`;

  await sendStoryMessage(message);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendStoryMessage,
    handleLocationArrival,
    startStory,
    continueAfterCombat,
    continueAfterShopping,
    narrateSkillCheckResult
  };
}
