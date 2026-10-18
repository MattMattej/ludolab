# ADR 0001: Mutable game state and declarative scenes

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Chapter 1 needs a single contract that handwritten games can use for simulation,
bot play, and a renderer that does not know game rules. Simulation applies many
moves, while browser interaction needs stable identifiers for visible targets.
The same contracts must remain usable by a future Rulebook compiler.

## Decision

- A `GameModule` owns setup, turn order, legal moves, mutation, outcomes,
  observations, cloning, hashing, stable move keys, scenes, and move anchors.
- `apply` mutates state; `clone` returns an independent state.
- The deterministic random stream is represented as four 32-bit words in game
  state and uses sfc32, initialized with splitmix32.
- A `Scene` is a flat list of nodes with stable ids and parent ids. The renderer
  consumes only this structure; legal interaction is derived from move anchors.
- Handwritten games and any future compiler-generated game implement the same
  contract.

## Consequences

The simulation can run without renderer dependencies, and the React renderer can
draw any scene without importing game-specific code. Mutable state requires
explicit clone-independence tests. Stable node ids are part of the rendering
contract and must be preserved across states.
