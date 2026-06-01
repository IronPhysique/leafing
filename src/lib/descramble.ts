export interface TileOp {
  srcCol: number;
  srcRow: number;
  dstCol: number;
  dstRow: number;
}

export function computeTileOps(
  tiles: number[],
  tileCols: number,
): TileOp[] {
  return tiles.map((j, w) => ({
    srcCol: w % tileCols,
    srcRow: Math.floor(w / tileCols),
    dstCol: j % tileCols,
    dstRow: Math.floor(j / tileCols),
  }));
}
