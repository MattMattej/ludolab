# CLAUDE.md — instructions for coding assistants

Tabletest is a testbench for board and card games: a rules language (Rulebook, `.rules` files), an engine, an automatic visual table, bots, a simulator and an analyzer that finds broken rules. The full plan is in `docs/PLAN.md` (Spanish). Before writing code, read §5 (principles), §8 (contracts), §13 (visual layer), §22–24 (repo, tooling, tests) and §28–29 (current scope).

## Current scope

**Only Chapter 1 (PLAN §28) is in scope** until the author says otherwise:

- `packages/core`: `GameModule` and `Scene` contracts exactly as in PLAN §8, seeded RNG (sfc32 + splitmix32), hashing.
- `packages/players`: `random` bot only.
- `packages/games`: Nim and Tic-tac-toe written by hand in TypeScript, including `scene()` and `moveAnchors()`.
- `packages/sim`: sequential runner, derived seeds, seat rotation, seat-advantage metric with Wilson intervals.
- `packages/cli`: `tabletest sim <nim|tictactoe> --games N --seed S`.
- `packages/render`: minimal React + SVG renderer (grid board, row zones, pieces, counters) with basic FLIP animation keyed by stable node ids.
- `apps/web`: pick a game → watch bot vs bot with speed control, or play against the bot by clicking (legal moves highlighted via anchors).
- Language docs only (`docs/language/overview.md`), **no parser**.

Do not start the parser, compiler, cards/hidden information, search bots, workers, report, themes or the creation wizard.

## Commands

```bash
pnpm install
pnpm build            # tsc -b across packages + vite build for apps/web
pnpm test             # vitest
pnpm lint             # biome
pnpm tabletest sim tictactoe --games 20000 --seed demo
pnpm --filter web dev
```

Run `pnpm build && pnpm test && pnpm lint` after every change.

## Hard rules

- Implement `GameModule` and `Scene` exactly as in PLAN §8. Propose changes, with reasons, before making them.
- **No game-specific UI code.** The renderer draws any `Scene`; interaction comes from `moveAnchors()`.
- Scene node ids are stable across states: the same component keeps the same id so it can be animated.
- All randomness goes through the seeded RNG stored in the state. No `Math.random()` in game, bot or sim code.
- `apply` mutates; `clone` returns a fully independent state.
- Dependency direction: `core` imports nothing internal; `render` knows only `Scene`; nothing imports from `cli` or `apps/*`.
- TypeScript strict. Code, identifiers and comments in English.
- Only the dependencies listed in PLAN §23 unless justified.
- Reference games are public-domain or original. No copyrighted commercial games or assets.
- No machine learning, telemetry, user accounts or personal data. Never commit secrets.
- Work in small, verifiable steps and suggest a Conventional Commit message after each one. The author makes the commits.
