/**
 * Dice UI - Visual dice rolling interface
 */

function showDiceRoll(result) {
  // Visual feedback for dice roll
  console.log('Dice roll:', result);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showDiceRoll };
}
