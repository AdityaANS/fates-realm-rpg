/**
 * Skill Detector - Detect skill check requests in AI responses
 */

const SKILL_TYPES = ['perception', 'stealth', 'athletics', 'persuasion', 'arcana', 'survival', 'investigation'];

function detectSkillCheckTrigger(response) {
  const lowerResponse = response.toLowerCase();

  for (const skill of SKILL_TYPES) {
    if (lowerResponse.includes(`${skill} check`) || lowerResponse.includes(`make a ${skill}`)) {
      console.log(`Skill check detected: ${skill}`);
      performSkillCheck(skill);
      return true;
    }
  }

  return false;
}

function performSkillCheck(skillType) {
  const result = rollSkillCheck(skillType);

  showNotification(`${skillType.toUpperCase()} CHECK: ${result.total} (d20: ${result.roll} + mod: ${result.modifier}) vs DC ${result.dc} - ${result.success ? 'SUCCESS' : 'FAILURE'}`, result.success ? 'success' : 'danger');

  // Add to story log
  addStoryMessage('system', `Skill Check: ${skillType} - Rolled ${result.total} vs DC ${result.dc} - ${result.success ? 'Success!' : 'Failed.'}`);

  // Narrate the result
  setTimeout(() => {
    narrateSkillCheckResult(skillType, result.success, result.total, result.dc);
  }, 2000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectSkillCheckTrigger, SKILL_TYPES };
}
