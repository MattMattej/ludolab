import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { gameRegistry, nim, tictactoe } from "../src/index.js";

describe.each(Object.entries(gameRegistry))("%s game contract", (_id, game) => {
  it("clones independently and keeps hashes stable", () => {
    const state = game.setup({ players: 2, seed: "clone-contract" });
    const copy = game.clone(state);
    const initialHash = game.hash(state);
    expect(game.hash(copy)).toBe(initialHash);
    const originalRandomWord = state.rng[0];
    copy.rng[0] = (copy.rng[0] ^ 0xffffffff) >>> 0;
    expect(state.rng[0]).toBe(originalRandomWord);
    const firstMove = game.legalMoves(copy)[0];
    if (!firstMove) throw new Error("Expected the initial game state to have legal moves");
    game.apply(copy, firstMove);
    expect(game.hash(copy)).not.toBe(initialHash);
    expect(game.isTerminal(state)).toBe(false);
  });

  it("provides scene nodes for every legal move anchor", () => {
    const state = game.setup({ players: 2, seed: "anchor-contract" });
    const scene = game.scene(state, 0);
    const nodeIds = new Set(scene.nodes.map((node) => node.id));
    for (const move of game.legalMoves(state)) {
      const anchors = game.moveAnchors(move);
      expect(anchors.length).toBeGreaterThan(0);
      expect(anchors.every((anchor) => nodeIds.has(anchor))).toBe(true);
    }
  });

  it("keeps scene ids stable for the board, slots, and zones", () => {
    const state = game.setup({ players: 2, seed: "stable-scene-ids" });
    const fixedIds = game
      .scene(state, 0)
      .nodes.filter((node) => node.kind === "board" || node.kind === "slot" || node.kind === "zone")
      .map((node) => node.id);
    const move = game.legalMoves(state)[0];
    if (!move) throw new Error("Expected a legal move");
    game.apply(state, move);
    const nextIds = new Set(game.scene(state, 0).nodes.map((node) => node.id));
    expect(fixedIds.every((id) => nextIds.has(id))).toBe(true);
  });

  it("plays to a terminal state for a broad range of seeds", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 24 }), (seed) => {
        const state = game.setup({ players: 2, seed });
        let steps = 0;
        while (!game.isTerminal(state) && steps < 30) {
          const legal = game.legalMoves(state);
          expect(legal.length).toBeGreaterThan(0);
          const move = legal[steps % legal.length];
          if (!move) throw new Error("Expected a legal move");
          expect(game.moveKey(move)).toBeDefined();
          game.apply(state, move);
          steps += 1;
          const copy = game.clone(state);
          expect(game.hash(copy)).toBe(game.hash(state));
        }
        expect(game.isTerminal(state)).toBe(true);
        expect(game.outcome(state).payoffs.every((payoff) => payoff >= 0 && payoff <= 1)).toBe(
          true,
        );
      }),
      { numRuns: 100 },
    );
  });
});

describe("reference games", () => {
  it("Nim identifies the player who takes the last stone", () => {
    const state = nim.setup({ players: 2, seed: "last-stone" });
    state.stones = 1;
    nim.apply(state, { kind: "nim", take: 1 });
    expect(nim.outcome(state).payoffs).toEqual([1, 0]);
    expect(nim.outcome(state).reason).toContain("last stone");
  });

  it("Tic-tac-toe recognizes a line and a full-board draw", () => {
    const winning = tictactoe.setup({ players: 2, seed: "win" });
    for (const cell of [0, 3, 1, 4, 2]) tictactoe.apply(winning, { kind: "tictactoe", cell });
    expect(tictactoe.outcome(winning).payoffs).toEqual([1, 0]);

    const drawn = tictactoe.setup({ players: 2, seed: "draw" });
    for (const cell of [0, 1, 2, 4, 3, 5, 7, 6, 8]) {
      if (!tictactoe.isTerminal(drawn)) tictactoe.apply(drawn, { kind: "tictactoe", cell });
    }
    expect(tictactoe.outcome(drawn).payoffs).toEqual([0.5, 0.5]);
  });

  it("rejects wrong player counts and illegal moves", () => {
    expect(() => nim.setup({ players: 3, seed: "bad" })).toThrow(RangeError);
    const state = tictactoe.setup({ players: 2, seed: "illegal" });
    tictactoe.apply(state, { kind: "tictactoe", cell: 0 });
    expect(() => tictactoe.apply(state, { kind: "tictactoe", cell: 0 })).toThrow(RangeError);
  });
});
