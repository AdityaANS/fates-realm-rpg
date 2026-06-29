# Fate's Realm - Integrated RPG Game

A fully integrated RPG experience combining procedural map generation, AI-powered narration, turn-based combat, skill checks, and shopping.

## Features

- **Procedural World Generation**: Unique maps created with Perlin noise
- **AI Dungeon Master**: GPT-4o-mini narrates your adventure using actual map data
- **Arena Combat**: Turn-based tactical combat that triggers naturally from the story
- **Automatic Skill Checks**: Dice rolls triggered by the AI with character stats
- **Dynamic Shopping**: Location-based merchant inventories
- **Unified Theme**: "Arcane Parchment" medieval fantasy aesthetic

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

3. Start the server:
```bash
npm start
```

4. Open your browser to:
```
http://localhost:3000
```

## Game Flow

1. **New Game** → Map generates with ~25 unique locations
2. **Character Creation** → Choose name and class (Warrior, Mage, Rogue, Cleric)
3. **Story Mode** → AI narrates your adventure
4. **Combat** → Automatically triggered when AI mentions enemies
5. **Skill Checks** → Auto-rolled when AI requests checks
6. **Shopping** → Opens when you visit merchants
7. **Map** → View and travel to discovered locations

## Project Structure

```
integrated-rpg/
├── server.js                 # Express backend
├── index.html                # Main game page
├── core/                     # Core game systems
│   ├── game-state.js         # Unified state
│   ├── state-manager.js      # State updates
│   ├── ui-manager.js         # Mode switching
│   └── init.js               # Initialization
├── map/                      # Map generation
│   ├── generator.js          # Perlin noise generation
│   └── renderer.js           # Canvas rendering
├── story/                    # AI narration
│   ├── ai-client.js          # OpenAI API
│   ├── prompt-builder.js     # Map-aware prompts
│   └── response-processor.js # Trigger detection
├── combat/                   # Combat system
│   ├── combat-detector.js    # Detect triggers
│   ├── arena-combat.js       # Combat engine
│   └── combat-ui.js          # Combat interface
├── dice/                     # Skill checks
│   ├── skill-detector.js     # Detect checks
│   └── skill-roller.js       # Auto-rolling
└── shop/                     # Shopping system
    ├── shop-detector.js      # Detect shops
    ├── shop-generator.js     # Generate inventory
    └── emporium.js           # Shop UI
```

## Controls

- **Story Mode**: Type actions, AI responds
- **Combat Mode**: Click enemies to attack, use skills
- **Map**: Click neighboring locations to travel
- **Shop**: Add items to cart, purchase
- **Save/Load**: Buttons in top bar

## Technology

- **Frontend**: Vanilla JavaScript, Canvas API
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Custom CSS with "Arcane Parchment" theme

## Tips

- Explore different locations to find higher-tier loot
- Danger levels affect combat difficulty and skill check DCs
- Some locations have shops - look for merchant NPCs in the story
- Save frequently using the Save button

## Development

The game uses a unified state management system (`GAME_STATE`) that all modules read from and write to. The `state-manager.js` provides safe update functions.

Mode switching is handled by `ui-manager.js` which shows/hides different UI panels based on game state.

AI responses are processed by `response-processor.js` to detect combat, skill checks, and shopping triggers.

## License

MIT
