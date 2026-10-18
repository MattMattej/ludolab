import {
  type GameModule,
  type Outcome,
  type Scene,
  createRandomState,
  hashState,
} from "@tabletest/core";

export interface TicTacToeState {
  readonly kind: "tictactoe";
  board: (number | null)[];
  currentPlayer: number;
  winner: number | null;
  draw: boolean;
  movesPlayed: number;
  history: string[];
  rng: ReturnType<typeof createRandomState>;
}

export interface TicTacToeMove {
  readonly kind: "tictactoe";
  readonly cell: number;
}

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export const tictactoe: GameModule<TicTacToeState, TicTacToeMove, TicTacToeState> = {
  meta: { id: "tictactoe", name: "Tic-tac-toe", minPlayers: 2, maxPlayers: 2, variants: [] },
  setup({ players, seed }) {
    if (players !== 2) throw new RangeError("Tic-tac-toe requires exactly 2 players");
    return {
      kind: "tictactoe",
      board: Array.from({ length: 9 }, () => null),
      currentPlayer: 0,
      winner: null,
      draw: false,
      movesPlayed: 0,
      history: [],
      rng: createRandomState(seed),
    };
  },
  toAct: (state) => (state.winner === null && !state.draw ? state.currentPlayer : null),
  legalMoves(state) {
    if (state.winner !== null || state.draw) return [];
    return state.board.flatMap((owner, cell) =>
      owner === null ? [{ kind: "tictactoe" as const, cell }] : [],
    );
  },
  apply(state, move) {
    if (!Number.isInteger(move.cell) || state.board[move.cell] !== null || this.isTerminal(state)) {
      throw new RangeError(`Illegal Tic-tac-toe move: cell ${move.cell}`);
    }
    state.board[move.cell] = state.currentPlayer;
    state.movesPlayed += 1;
    const row = Math.floor(move.cell / 3) + 1;
    const column = (move.cell % 3) + 1;
    state.history.push(`Player ${state.currentPlayer + 1} places at ${row},${column}`);
    if (
      winningLines.some(
        ([a, b, c]) =>
          state.board[a] !== null &&
          state.board[a] === state.board[b] &&
          state.board[b] === state.board[c],
      )
    ) {
      state.winner = state.currentPlayer;
    } else if (state.movesPlayed === 9) {
      state.draw = true;
    } else {
      state.currentPlayer = 1 - state.currentPlayer;
    }
  },
  isTerminal: (state) => state.winner !== null || state.draw,
  outcome(state): Outcome {
    if (!this.isTerminal(state))
      throw new Error("Tic-tac-toe outcome requested before the game ended");
    if (state.winner === null) {
      return { payoffs: [0.5, 0.5], ranking: [[0, 1]], reason: "The board is full" };
    }
    const loser = 1 - state.winner;
    return {
      payoffs: state.winner === 0 ? [1, 0] : [0, 1],
      ranking: [[state.winner], [loser]],
      reason: `Player ${state.winner + 1} made a line`,
    };
  },
  observe(state) {
    return this.clone(state);
  },
  determinize(observation) {
    return this.clone(observation);
  },
  clone(state) {
    return { ...state, board: [...state.board], history: [...state.history], rng: [...state.rng] };
  },
  hash: hashState,
  moveKey: (move) => `cell:${move.cell}`,
  describeMove: (move) =>
    `Place at row ${Math.floor(move.cell / 3) + 1}, column ${(move.cell % 3) + 1}`,
  scene(state): Scene {
    const nodes: Scene["nodes"][number][] = [
      { id: "board", kind: "board", parent: "table", layout: { type: "grid", cols: 3, rows: 3 } },
    ];
    for (let cell = 0; cell < 9; cell += 1) {
      const row = Math.floor(cell / 3) + 1;
      const column = (cell % 3) + 1;
      nodes.push({
        id: `cell:${cell}`,
        kind: "slot",
        parent: "board",
        order: cell,
        coord: `${row},${column}`,
        label: `${String.fromCharCode(64 + column)}${row}`,
      });
      const owner = state.board[cell];
      if (owner !== null) {
        nodes.push({
          id: `mark:${cell}`,
          kind: "piece",
          parent: `cell:${cell}`,
          shape: owner === 0 ? "cross" : "circle",
          color: owner === 0 ? "#0072b2" : "#d55e00",
          label: owner === 0 ? "X" : "O",
        });
      }
    }
    return {
      seats: [
        {
          id: 0,
          name: "Player 1 · X",
          color: "#0072b2",
          active: state.winner === null && !state.draw && state.currentPlayer === 0,
        },
        {
          id: 1,
          name: "Player 2 · O",
          color: "#d55e00",
          active: state.winner === null && !state.draw && state.currentPlayer === 1,
        },
      ],
      nodes,
      status:
        state.winner === null
          ? state.draw
            ? "Draw"
            : `Player ${state.currentPlayer + 1} (${state.currentPlayer === 0 ? "X" : "O"}) to act`
          : `Player ${state.winner + 1} wins`,
      log: state.history.slice(-8),
    };
  },
  moveAnchors: (move) => [`cell:${move.cell}`],
};
