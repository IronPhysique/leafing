import { describe, it, expect } from "vitest";
import { computeTileOps } from "./descramble";

describe("computeTileOps", () => {
  it("returns one TileOp per tile in the tiles array", () => {
    const ops = computeTileOps([0, 1, 2, 3], 2);
    expect(ops).toHaveLength(4);
  });

  it("identity mapping: tiles[w] === w means src === dst for every tile", () => {
    const ops = computeTileOps([0, 1, 2, 3], 2);
    for (const op of ops) {
      expect(op.srcCol).toBe(op.dstCol);
      expect(op.srcRow).toBe(op.dstRow);
    }
  });

  it("single tile: tileCols=1 always gives col=0 for both src and dst", () => {
    const ops = computeTileOps([0], 1);
    expect(ops[0]).toEqual({ srcCol: 0, srcRow: 0, dstCol: 0, dstRow: 0 });
  });

  it("2x2 grid: w=0, tiles[0]=3 maps src(0,0)→dst(1,1)", () => {
    const ops = computeTileOps([3, 1, 2, 0], 2);
    expect(ops[0]).toEqual({ srcCol: 0, srcRow: 0, dstCol: 1, dstRow: 1 });
  });

  it("2x2 grid: w=3, tiles[3]=0 maps src(1,1)→dst(0,0)", () => {
    const ops = computeTileOps([3, 1, 2, 0], 2);
    expect(ops[3]).toEqual({ srcCol: 1, srcRow: 1, dstCol: 0, dstRow: 0 });
  });

  it("4x5 grid (20 tiles): correctly computes all src/dst coords", () => {
    // AsuraScans canonical tile array from adapter fixture
    const tiles = [3, 1, 0, 2, 7, 5, 4, 6, 11, 9, 8, 10, 15, 13, 12, 14, 19, 17, 16, 18];
    const tileCols = 4;
    const ops = computeTileOps(tiles, tileCols);

    expect(ops).toHaveLength(20);
    expect(ops[0]).toEqual({ srcCol: 0, srcRow: 0, dstCol: 3, dstRow: 0 });
    expect(ops[4]).toEqual({ srcCol: 0, srcRow: 1, dstCol: 3, dstRow: 1 });
    expect(ops[19]).toEqual({ srcCol: 3, srcRow: 4, dstCol: 2, dstRow: 4 });
  });

  it("returns empty array for empty tiles", () => {
    expect(computeTileOps([], 4)).toEqual([]);
  });

  it("srcCol uses modulo of w (not j)", () => {
    const tiles = Array.from({ length: 20 }, (_, i) => 19 - i);
    const ops = computeTileOps(tiles, 4);
    expect(ops[5].srcCol).toBe(5 % 4); // 1
    expect(ops[5].srcRow).toBe(Math.floor(5 / 4)); // 1
  });

  it("dstCol uses modulo of tiles[w] (not w)", () => {
    const tiles = [7];
    const ops = computeTileOps(tiles, 4);
    expect(ops[0].dstCol).toBe(7 % 4);
    expect(ops[0].dstRow).toBe(Math.floor(7 / 4));
  });
});
