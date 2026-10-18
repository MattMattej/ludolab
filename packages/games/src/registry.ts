import type { GameMeta, GameModule, Scene, Seed, SetupOptions, Viewer } from "@tabletest/core";
import { type NimMove, type NimState, nim } from "./nim.js";
import { type TicTacToeMove, type TicTacToeState, tictactoe } from "./tictactoe.js";

export type GameState = NimState | TicTacToeState;
export type AnyMove = NimMove | TicTacToeMove;

export type GameMove = AnyMove;

function adaptGame<S extends GameState, M extends AnyMove>(
  game: GameModule<S, M, S>,
  acceptsState: (state: GameState) => state is S,
  acceptsMove: (move: AnyMove) => move is M,
): GameModule<GameState, GameMove, GameState> {
  const stateFor = (state: GameState): S => {
    if (!acceptsState(state)) throw new TypeError(`State does not belong to ${game.meta.id}`);
    return state;
  };
  const moveFor = (move: GameMove): M => {
    if (!acceptsMove(move)) throw new TypeError(`Move does not belong to ${game.meta.id}`);
    return move;
  };
  const meta: GameMeta = game.meta;
  return {
    meta,
    setup: (options: SetupOptions) => game.setup(options),
    toAct: (state) => game.toAct(stateFor(state)),
    legalMoves: (state) => game.legalMoves(stateFor(state)),
    apply: (state, move) => game.apply(stateFor(state), moveFor(move)),
    isTerminal: (state) => game.isTerminal(stateFor(state)),
    outcome: (state) => game.outcome(stateFor(state)),
    observe: (state, player) => game.observe(stateFor(state), player),
    determinize: (observation, player, seed: Seed) =>
      game.determinize(stateFor(observation), player, seed),
    clone: (state) => game.clone(stateFor(state)),
    hash: (state) => game.hash(stateFor(state)),
    moveKey: (move) => game.moveKey(moveFor(move)),
    describeMove: (move) => game.describeMove(moveFor(move)),
    scene: (state, viewer: Viewer): Scene => game.scene(stateFor(state), viewer),
    moveAnchors: (move) => game.moveAnchors(moveFor(move)),
  };
}

export const gameRegistry: Readonly<Record<string, GameModule<GameState, GameMove, GameState>>> = {
  nim: adaptGame(
    nim,
    (state): state is NimState => state.kind === "nim",
    (move): move is NimMove => move.kind === "nim",
  ),
  tictactoe: adaptGame(
    tictactoe,
    (state): state is TicTacToeState => state.kind === "tictactoe",
    (move): move is TicTacToeMove => move.kind === "tictactoe",
  ),
};

export function getGame(id: string): GameModule<GameState, GameMove, GameState> {
  const game = gameRegistry[id];
  if (!game) throw new RangeError(`Unknown game "${id}". Choose nim or tictactoe.`);
  return game;
}
