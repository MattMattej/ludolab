export type RandomState = [number, number, number, number];

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 0x01000193);
  }
  return hash >>> 0;
}

function splitmix32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x9e3779b9) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    return (mixed ^ (mixed >>> 15)) >>> 0;
  };
}

export function createRandomState(seed: string): RandomState {
  const next = splitmix32(hashSeed(seed));
  return [next(), next(), next(), next()];
}

export function randomFloat(state: RandomState): number {
  const [a, b, c, d] = state;
  const nextD = (d + 1) >>> 0;
  const result = (a + b + nextD) >>> 0;
  const nextA = (b ^ (b >>> 9)) >>> 0;
  const nextB = (c + (c << 3)) >>> 0;
  const nextC = ((c << 21) | (c >>> 11)) >>> 0;
  state[0] = nextA;
  state[1] = nextB;
  state[2] = (nextC + result) >>> 0;
  state[3] = nextD;
  return result / 0x1_0000_0000;
}

export function randomInt(state: RandomState, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError("randomInt requires integer bounds with max >= min");
  }
  return min + Math.floor(randomFloat(state) * (max - min + 1));
}

export function deriveSeed(seed: string, index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RangeError("Seed index must be a non-negative safe integer");
  }
  const stream = splitmix32(hashSeed(`${seed}:${index}`));
  return stream().toString(16).padStart(8, "0");
}
