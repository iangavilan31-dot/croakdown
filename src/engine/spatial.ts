// Spatial hash (cell ~128 px) — targeting, crowd separation, tongue rays, arc queries.

export class SpatialHash<T extends { x: number; y: number }> {
  private cells = new Map<number, T[]>();
  constructor(private cellSize: number) {}
  private key(cx: number, cy: number) { return cy * 8192 + cx; }
  clear() { this.cells.clear(); }
  insert(e: T) {
    const cx = Math.floor(e.x / this.cellSize), cy = Math.floor(e.y / this.cellSize);
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    arr.push(e);
  }
  /** Visit entities in cells overlapping the circle; may include extras — caller distance-checks. */
  query(x: number, y: number, r: number, out: T[]): T[] {
    out.length = 0;
    const x0 = Math.floor((x - r) / this.cellSize), x1 = Math.floor((x + r) / this.cellSize);
    const y0 = Math.floor((y - r) / this.cellSize), y1 = Math.floor((y + r) / this.cellSize);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.cells.get(this.key(cx, cy));
      if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
    }
    return out;
  }
}
