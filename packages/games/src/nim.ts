import {
  type GameModule,
  type Outcome,
  type Scene,
  createRandomState,
  hashState,
} from "@tabletest/core";

export interface NimState {
  readonly kind: "nim";
  stones: number;
  currentPlayer: number;
  winner: number | null;
  movesPlayed: number;
  history: string[];
  rng: ReturnType<typeof createRandomState>;
}

export interface NimMove {
  readonly kind: "nim";
  readonly take: number;
}

export const nim: GameModule<NimState, NimMove, NimState> = {
  meta: { id: "nim", name: "Nim", minPlayers: 2, maxPlayers: 2, variants: [] },
  setup({ players, seed }) {
    if (players !== 2) throw new RangeError("Nim requires exactly 2 players");
    return {
      kind: "nim",
      stones: 21,
      currentPlayer: 0,
      winner: null,
      movesPlayed: 0,
      history: [],
      rng: createRandomState(seed),
    };
  },
  toAct: (state) => (state.winner === null ? state.currentPlayer : null),
  legalMoves(state) {
    if (state.winner !== null) return [];
    return Array.from({ length: Math.min(3, state.stones) }, (_, index) => ({
      kind: "nim" as const,
      take: index + 1,
    }));
  },
  apply(state, move) {
    if (!this.legalMoves(state).some((legal) => legal.take === move.take)) {
      throw new RangeError(`Illegal Nim move: take ${move.take}`);
    }
    state.stones -= move.take;
    state.movesPlayed += 1;
    state.history.push(`Player ${state.currentPlayer + 1} takes ${move.take}`);
    if (state.stones === 0) {
      state.winner = state.currentPlayer;
    } else {
      state.currentPlayer = 1 - state.currentPlayer;
    }
  },
  isTerminal: (state) => state.winner !== null,
  outcome(state): Outcome {
    if (state.winner === null) throw new Error("Nim outcome requested before the game ended");
    const loser = 1 - state.winner;
    return {
      payoffs: state.winner === 0 ? [1, 0] : [0, 1],
      ranking: [[state.winner], [loser]],
      reason: `Player ${state.winner + 1} took the last stone`,
    };
  },
  observe(state) {
    return this.clone(state);
  },
  determinize(observation) {
    return this.clone(observation);
  },
  clone(state) {
    return { ...state, history: [...state.history], rng: [...state.rng] };
  },
  hash: hashState,
  moveKey: (move) => `take:${move.take}`,
  describeMove: (move) => `Take ${move.take} ${move.take === 1 ? "stone" : "stones"}`,
  scene(state): Scene {
    const nodes: Scene["nodes"][number][] = [
      {
        id: "stones",
        kind: "zone",
        parent: "table",
        order: 0,
        arrangement: "row",
        label: "Stones",
      },
    ];
    for (let index = 0; index < state.stones; index += 1) {
      nodes.push({
        id: `stone:${index}`,
        kind: "piece",
        parent: "stones",
        order: index,
        shape: "stone",
        color: "#d6a86a",
        label: String(index + 1),
      });
    }
    nodes.push({
      id: "stone-count",
      kind: "counter",
      parent: "table",
      order: 1,
      label: "Stones remaining",
      value: state.stones,
    });
    return {
      seats: [
        {
          id: 0,
          name: "Player 1",
          color: "#0072b2",
          active: state.winner === null && state.currentPlayer === 0,
        },
        {
          id: 1,
          name: "Player 2",
          color: "#d55e00",
          active: state.winner === null && state.currentPlayer === 1,
        },
      ],
      nodes,
      status:
        state.winner === null
          ? `Player ${state.currentPlayer + 1} to act`
          : `Player ${state.winner + 1} wins`,
      log: state.history.slice(-8),
    };
  },
  moveAnchors: (move) => [`stone:${move.take - 1}`],
};
