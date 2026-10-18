import {
  type GameModule,
  type Outcome,
  type RandomState,
  type Seed,
  deriveSeed,
} from "@tabletest/core";
import type { Player } from "@tabletest/players";

export interface SimulationOptions<S extends { rng: RandomState }, M, O> {
  readonly game: GameModule<S, M, O>;
  readonly players: readonly Player<O, M>[];
  readonly games: number;
  readonly seed: Seed;
  readonly maxMoves?: number;
  readonly rotateSeats?: boolean;
}

export interface GameResult {
  readonly index: number;
  readonly seed: Seed;
  readonly status: "finished" | "stalled" | "limit";
  readonly moves: number;
  readonly outcome?: Outcome;
}

export interface SimulationResult {
  readonly games: readonly GameResult[];
  readonly completed: number;
  readonly stalled: number;
  readonly limited: number;
}

export function simulate<S extends { rng: RandomState }, M, O>(
  options: SimulationOptions<S, M, O>,
): SimulationResult {
  const { game, players, seed } = options;
  const maxMoves = options.maxMoves ?? 10_000;
  if (!Number.isSafeInteger(options.games) || options.games < 1) {
    throw new RangeError("games must be a positive safe integer");
  }
  if (!Number.isSafeInteger(maxMoves) || maxMoves < 1) {
    throw new RangeError("maxMoves must be a positive safe integer");
  }
  if (players.length !== game.meta.minPlayers || game.meta.minPlayers !== game.meta.maxPlayers) {
    throw new RangeError(
      `${game.meta.id} requires exactly ${game.meta.minPlayers} player policies`,
    );
  }

  const results: GameResult[] = [];
  let completed = 0;
  let stalled = 0;
  let limited = 0;

  for (let index = 0; index < options.games; index += 1) {
    const gameSeed = deriveSeed(seed, index);
    const state = game.setup({ players: players.length, seed: gameSeed });
    const rotation = options.rotateSeats === false ? 0 : index % players.length;
    let moves = 0;
    let status: GameResult["status"] = "finished";

    while (!game.isTerminal(state)) {
      if (moves >= maxMoves) {
        status = "limit";
        break;
      }
      const seat = game.toAct(state);
      if (seat === null) break;
      const legal = game.legalMoves(state);
      if (legal.length === 0) {
        status = "stalled";
        break;
      }
      const playerIndex = (seat + rotation) % players.length;
      const player = players[playerIndex];
      if (!player) throw new Error(`Missing player for seat ${seat}`);
      const observation = game.observe(state, seat);
      const move = player.choose(observation, legal, { rng: state.rng });
      const moveId = game.moveKey(move);
      if (!legal.some((candidate) => game.moveKey(candidate) === moveId)) {
        throw new Error(`Player "${player.id}" returned an illegal move "${moveId}"`);
      }
      game.apply(state, move);
      moves += 1;
    }

    const result: GameResult =
      status === "finished"
        ? { index, seed: gameSeed, status, moves, outcome: game.outcome(state) }
        : { index, seed: gameSeed, status, moves };
    results.push(result);
    if (status === "finished") completed += 1;
    else if (status === "stalled") stalled += 1;
    else limited += 1;
  }

  return { games: results, completed, stalled, limited };
}
