import { type RandomState, randomInt } from "@tabletest/core";

export interface PlayerContext {
  readonly rng: RandomState;
}

export interface Player<O, M> {
  readonly id: string;
  choose(observation: O, legalMoves: readonly M[], context: PlayerContext): M;
}

export function createRandomPlayer<O, M>(): Player<O, M> {
  return {
    id: "random",
    choose(_observation, legalMoves, context) {
      if (legalMoves.length === 0) {
        throw new RangeError("Random player cannot choose from no legal moves");
      }
      const move = legalMoves[randomInt(context.rng, 0, legalMoves.length - 1)];
      if (move === undefined) throw new Error("Random player selected a missing legal move");
      return move;
    },
  };
}

export const randomPlayer = createRandomPlayer<unknown, unknown>();
