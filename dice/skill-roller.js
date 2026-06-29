/**
 * Skill Roller - Automatic skill check rolling
 */

function rollSkillCheck(skillType) {
  const char = GAME_STATE.character;
  const location = GAME_STATE.map.currentLocation;

  // Map skills to stats
  const skillToStat = {
    'perception': 'mind',
    'investigation': 'mind',
    'arcana': 'mind',
    'stealth': 'body',
    'athletics': 'body',
    'survival': 'body',
    'persuasion': 'soul'
  };

  const stat = skillToStat[skillType] || 'mind';
  const statValue = char.stats[stat];
  const modifier = Math.floor((statValue - 10) / 2);

  // Roll d20
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + modifier;

  // Determine DC based on location danger
  const baseDC = 10;
  const dc = baseDC + (location.danger || 2);

  const success = total >= dc;

  const result = {
    skill: skillType,
    roll,
    modifier,
    total,
    dc,
    success
  };

  GAME_STATE.lastSkillCheck = result;

  console.log('Skill check result:', result);

  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rollSkillCheck };
}
