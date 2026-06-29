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

## Priority Order

1. Streaming (visible impact immediately)
2. Tool calling for combat (fixes the worst bug)
3. Database + auth (makes it a real product)
4. Conversation summarisation (makes long sessions viable)
5. Rate limiting + input validation (production safety)
