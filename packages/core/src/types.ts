export type PlayerId = number;
export type Seed = string;
export type Viewer = PlayerId | "spectator" | "omniscient";
export type NodeId = string;

export interface GameMeta {
  readonly id: string;
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly variants: readonly string[];
}

export interface SetupOptions {
  readonly players: number;
  readonly seed: Seed;
  readonly variant?: string;
}

export interface Outcome {
  readonly payoffs: readonly number[];
  readonly ranking: readonly (readonly PlayerId[])[];
  readonly reason: string;
}

export interface GameModule<S, M, O> {
  readonly meta: GameMeta;
  setup(options: SetupOptions): S;
  toAct(state: S): PlayerId | null;
  legalMoves(state: S): readonly M[];
  apply(state: S, move: M): void;
  isTerminal(state: S): boolean;
  outcome(state: S): Outcome;
  observe(state: S, player: PlayerId): O;
  determinize(observation: O, player: PlayerId, seed: Seed): S;
  clone(state: S): S;
  hash(state: S): string;
  moveKey(move: M): string;
  describeMove(move: M): string;
  scene(state: S, viewer: Viewer): Scene;
  moveAnchors(move: M): readonly NodeId[];
}

export interface SeatInfo {
  readonly id: PlayerId;
  readonly name: string;
  readonly color: string;
  readonly active: boolean;
}

export interface Scene {
  readonly seats: readonly SeatInfo[];
  readonly nodes: readonly SceneNode[];
  readonly status?: string;
  readonly log?: readonly string[];
}

interface NodeBase {
  readonly id: NodeId;
  readonly parent: NodeId | "table" | `seat:${number}`;
  readonly order?: number;
  readonly tags?: readonly string[];
}

export type SceneNode =
  | (NodeBase & { readonly kind: "board"; readonly layout: BoardLayout; readonly style?: string })
  | (NodeBase & { readonly kind: "slot"; readonly coord: string; readonly label?: string })
  | (NodeBase & {
      readonly kind: "zone";
      readonly arrangement: "stack" | "fan" | "row" | "grid" | "spread";
      readonly label?: string;
      readonly hiddenCount?: number;
    })
  | (NodeBase & {
      readonly kind: "card";
      readonly face: CardFace | null;
      readonly template?: string;
    })
  | (NodeBase & {
      readonly kind: "piece";
      readonly shape: PieceShape;
      readonly color: string;
      readonly label?: string;
      readonly stack?: number;
    })
  | (NodeBase & { readonly kind: "die"; readonly sides: number; readonly value: number | null })
  | (NodeBase & {
      readonly kind: "counter";
      readonly label: string;
      readonly value: number;
      readonly icon?: string;
    });

export type BoardLayout =
  | {
      readonly type: "grid";
      readonly cols: number;
      readonly rows: number;
      readonly checkered?: boolean;
    }
  | { readonly type: "hex"; readonly radius: number }
  | {
      readonly type: "track";
      readonly length: number;
      readonly path?: "line" | "loop" | "snake" | "u";
    }
  | {
      readonly type: "pits";
      readonly rows: number;
      readonly perRow: number;
      readonly stores?: number;
    }
  | {
      readonly type: "graph";
      readonly nodes: readonly { readonly id: string; readonly x: number; readonly y: number }[];
      readonly edges: readonly (readonly [string, string])[];
    };

export interface CardFace {
  readonly title?: string;
  readonly corner?: string;
  readonly body?: string;
  readonly suit?: string;
  readonly rank?: string;
  readonly color?: string;
  readonly image?: string;
}

export type PieceShape = "circle" | "cross" | "square" | "triangle" | "stone" | string;
