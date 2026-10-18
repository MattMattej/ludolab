import { describe, expect, it } from "vitest";
import { createRandomState, hashState, randomFloat, randomInt } from "../src/index.js";

describe("seeded randomness and hashing", () => {
  it("replays the same sfc32 stream from the same seed", () => {
    const first = createRandomState("demo-seed");
    const second = createRandomState("demo-seed");
    const values = Array.from({ length: 500 }, () => randomFloat(first));
    const replay = Array.from({ length: 500 }, () => randomFloat(second));
    expect(replay).toEqual(values);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("produces stable hashes regardless of object key insertion order", () => {
    expect(hashState({ b: 2, a: [1, 3] })).toBe(hashState({ a: [1, 3], b: 2 }));
  });

  it("uses the sfc32 transition, including incrementing d before adding it", () => {
    const state: [number, number, number, number] = [0, 0, 0, 0];
    expect(randomFloat(state)).toBe(1 / 0x1_0000_0000);
    expect(randomFloat(state)).toBe(2 / 0x1_0000_0000);
  });

  it("validates integer RNG bounds", () => {
    expect(randomInt(createRandomState("bounded"), 2, 2)).toBe(2);
    expect(() => randomInt(createRandomState("bad"), 3, 2)).toThrow(RangeError);
  });
});
