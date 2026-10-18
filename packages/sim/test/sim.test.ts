import { createRandomPlayer } from "@tabletest/players";
import { describe, expect, it } from "vitest";
import { type GameMove, type GameState, getGame } from "../../games/src/index.js";
import { seatAdvantage, simulate, wilsonInterval } from "../src/index.js";

describe("simulation and D1 seat advantage", () => {
  it("replays the same games from the same base seed", () => {
    const game = getGame("tictactoe");
    const players = [
      createRandomPlayer<GameState, GameMove>(),
      createRandomPlayer<GameState, GameMove>(),
    ];
    const first = simulate({ game, players, games: 150, seed: "replay-test" });
    const replay = simulate({ game, players, games: 150, seed: "replay-test" });
    expect(replay.games).toEqual(first.games);
    expect(replay.completed).toBe(150);
  });

  it("matches the known 95% Wilson interval for 50 of 100 wins", () => {
    const interval = wilsonInterval(50, 100);
    expect(interval.estimate).toBe(0.5);
    expect(interval.lower).toBeCloseTo(0.4038, 3);
    expect(interval.upper).toBeCloseTo(0.5962, 3);
  });

  it("counts wins and draws by seat and excludes stalled games", () => {
    const results = [
      {
        index: 0,
        seed: "a",
        status: "finished" as const,
        moves: 5,
        outcome: { payoffs: [1, 0], ranking: [[0], [1]], reason: "win" },
      },
      {
        index: 1,
        seed: "b",
        status: "finished" as const,
        moves: 6,
        outcome: { payoffs: [0.5, 0.5], ranking: [[0, 1]], reason: "draw" },
      },
      { index: 2, seed: "c", status: "stalled" as const, moves: 0 },
    ];
    const metric = seatAdvantage(results, 2);
    expect(metric.completed).toBe(2);
    expect(metric.seats[0]?.successes).toBe(1);
    expect(metric.seats[1]?.successes).toBe(0);
    expect(metric.draws.successes).toBe(1);
  });

  it("rejects invalid simulation requests", () => {
    const game = getGame("nim");
    const player = createRandomPlayer<GameState, GameMove>();
    expect(() => simulate({ game, players: [player], games: 1, seed: "bad" })).toThrow(
      /requires exactly/,
    );
    expect(() => simulate({ game, players: [player, player], games: 0, seed: "bad" })).toThrow(
      /games/,
    );
  });
});
