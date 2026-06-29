# Fate's Realm — Critical Improvements Roadmap

## 🔴 Break First

**1. No persistence — game state is in-memory only**
`GAME_STATE` is a plain JS object. Refresh the page, everything is gone. No save system, no user accounts.
Fix: PostgreSQL (or even SQLite) + session tokens. This is the single biggest blocker to being a real app.

**2. Regex combat detection is unreliable**
`combat-detector.js` fires combat when keywords like `"attack"`, `"fight"`, or `"charges"` appear — even in past-tense narration or NPC dialogue. A peaceful scene where a guard "attacks a thief" will lock the player in combat.
Fix: Replace with OpenAI **function/tool calling**. Give the model a `trigger_combat(enemies[])` tool and let it decide explicitly. Far more reliable and demonstrates real LLM knowledge.

**3. Full conversation history sent every request**
`ai-client.js` sends the entire `conversationHistory` array on every call. A long session will hit the context limit, responses will degrade, and cost spikes.
Fix: Summarise every 10 turns — compress old history into a short paragraph injected as system context.

**4. Vercel serverless + in-memory state = broken**
Each Vercel invocation is stateless. If two requests hit different instances, `GAME_STATE` differs between them.
Fix: Move all mutable state server-side behind a session ID (Redis or DB).

---

## 🟡 LLM Quality

- **No streaming** — player waits 3–5s staring at a spinner. Add SSE streaming (`stream: true`), text appears token by token.
- **`max_tokens: 500` cuts off mid-sentence** — raise to 800–1000 for proper narrative closure.
- **No retry on failure** — if OpenAI returns a 429 or 500, the player just sees an error. Add exponential backoff.
- **Two overlapping stat systems** (`stats` + `eldenStats`) in `game-state.js` — pick one and remove the other.

---

## 🟡 Architecture

- **Global mutable state everywhere** — every module reads/writes `GAME_STATE` directly. No encapsulation, impossible to test.
- **No rate limiting** — a single user can spam hundreds of API calls. Add per-session request throttling server-side.
- **No input validation on `/api/story`** — `messages` array is forwarded to OpenAI without sanitisation. At minimum check length and content type.
- **`console.log` used for everything** — replace with a proper logger (e.g. `pino`) with log levels so production isn't noisy.

---

## 🟢 Quick Wins (high visibility, low effort)

| What | Why it matters |
|---|---|
| Streaming responses | Most visible UX improvement, 2 hrs work |
| `.env` validation on startup | Crash fast with a clear message instead of a mysterious 500 |
| GitHub Actions CI | Auto-deploy to Vercel on push — standard practice |
| User auth (JWT) | Unlocks persistence and makes it a full-stack app |
| OpenAI cost cap | Set a hard limit in billing before sharing publicly |

---

---

## 🔴 Defeat & Death — Currently Broken

`endCombatDefeat()` just calls `setUIMode('story')` and continues the narrative. There is no penalty, no death screen, no consequence. Dying feels identical to winning.

**What it needs:**
- **Death screen** with cause of death, enemies involved, final stats
- **Actual penalties** — lose a % of gold, drop equipped item, or respawn at last inn with reduced HP
- **Permadeath option** — wipe the save, start over. High risk/reward, very replayable
- **Injury system** — surviving a brutal fight leaves a debuff (wounded leg = -speed, burned = -defense) that persists until healed at a healer NPC
- **Narrative acknowledgement** — the AI should narrate defeat differently based on *how* you lost (overwhelmed, poisoned, fled) not just "you were defeated"

---

## 🔴 Enemies — Shallow and Ignored

The CSV (`dnd_quests_v2.csv`) contains 100s of named boss types, minion types, biome pairings, suitable weapons, and loot grades — **none of it is used**. `combat-detector.js` has a hardcoded list of 12 generic enemies (Bandit, Wolf, Goblin…) with flat stats.

**What needs to change:**

**1. Use the CSV data**
- Parse `Quest Boss Type` and `Quest Boss Minion Type` columns into a proper enemy registry
- Use `Map Biome` to filter which enemies appear where (wolves don't spawn in the Coral Reef, Mudcrabs don't spawn in the Tundra)
- Use `Quest Grade` (F → SSS) to scale enemy stats to the player's level
- Use `Suitable Attribute` to give enemies elemental resistances/weaknesses

**2. Enemy tiers and scaling**
- Low-level zones (Grade F/E): rats, imps, stray dogs — weak, educational
- Mid-level (Grade C/D): bandits, goblin captains, skeleton warriors
- High-level (Grade A/S/SS): named bosses with unique abilities, multi-phase fights
- Currently all enemies have flat static stats — scale HP/attack/defense to player level

**3. Boss encounters**
- Named bosses from the CSV (e.g. `Gnoll Warlord Hyenaclaw`, `Slime King Oozeborn`) should be rare, telegraphed, and mechanically distinct
- Bosses should have phases (enrages below 50% HP), minion summons, and unique loot
- Defeating a boss should feel like an event, not just a longer version of a regular fight

**4. Encounter logic — when and what you fight**
Currently enemies are triggered by regex on any combat-adjacent word. Needs a proper encounter system:
- **Location danger level** (1–5 from CSV) gates enemy tier — you can't fight a level-40 boss in a danger-1 zone
- **Biome-appropriate enemies** — Desert spawns Dust Bunny Cursed, Sand Imps, Scorpions. Tundra spawns Frost Wolves, Mushroom Walkers. Abyssal Rift spawns undead, demons
- **Random encounter rate** — not every step triggers a fight, roll a chance based on danger level
- **Ambush vs. scouted** — enemies hiding in structures (dungeon, ruins) vs. open field encounters play differently

---

## 🔴 Items & Shop — Only 5 Items, No Variety

`shop-generator.js` has exactly 5 hardcoded item templates recycled with a tier multiplier. The description is always `"A basic consumable."` The CSV's `Loot Drop Grade` and `Suitable Weapon Type` columns are unused.

**What it needs:**

**Weapon types from CSV** — the CSV lists: Longsword, Axe, Crossbow, Rapier, Maul, Trident, Staff, Wand, Runic Blade, Soul Sword, Hand Cannon, Bow, Greatsword, Spear. Build these out with distinct stat profiles (Axes: high damage low speed; Rapiers: low damage high crit; Staves: low physical high magic).

**Loot grade tied to Loot Drop Grade** — Grade F drops Common junk, Grade S drops Legendary gear. Currently loot grade from the CSV is read but never applied to drops.

**Consumable variety** — right now: Health Potion, Mana Potion. Add: Antidote, Smoke Bomb, Sharpening Stone, Bandage, Torch, Elixir of Speed.

**Item descriptions that aren't placeholder** — "A basic consumable." on every item is embarrassing. Either write real descriptions or use the AI to generate one-liners.

**Location-specific shops** — a blacksmith in a colosseum sells different things than a hedge witch in the Ethereal Mist. Use the `Structure` column from the CSV to vary inventory type.

---

## 🟡 Additional Improvements

- **Quest system** — the CSV is literally a quest database. Add a quest board where players accept quests, track objectives, and collect rewards. All the data is already there.
- **Character classes matter** — currently class (Warrior, Mage, Rogue, Cleric) is just a name. It should determine starting stats, available skills, and shop item availability.
- **Skill checks need consequences** — failing a skill check currently just triggers `narrateSkillCheckResult()` with the AI narrating. It should apply real outcomes: fail a Strength check = take damage, fail a Perception check = get ambushed, fail a Charisma check = NPC becomes hostile.
- **Map travel time** — instant teleport to any discovered location. Should cost gold (travel fee) or time (which affects day/night cycle and encounter rates).
- **Day/night cycle** — enemy types, NPC availability, and danger levels shift between day and night. Undead stronger at night, merchants closed after dark.

---

## Priority Order

1. Streaming (visible impact immediately)
2. Tool calling for combat (fixes the worst bug + encounter logic)
3. Enemy system rewrite using CSV data (biome-aware, scaled, bosses)
4. Defeat consequences (death screen, penalties, injury system)
5. Item/shop expansion (weapon types, loot grades, location variety)
6. Database + auth (makes it a real product)
7. Conversation summarisation (makes long sessions viable)
8. Quest system (the CSV data is already there)
9. Rate limiting + input validation (production safety)
