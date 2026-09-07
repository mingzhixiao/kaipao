// ---------------- 可复用空间哈希 ----------------
// 避免 SynergySystem 在每次范围反应时重复创建 Map / 数组。
export class SpatialHash {
  constructor(cellSize = 96) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.lastBuildToken = null;
  }

  clear() {
    this.cells.clear();
    this.lastBuildToken = null;
  }

  _key(cx, cy) {
    return `${cx},${cy}`;
  }

  rebuild(items, token = null) {
    if (token !== null && token === this.lastBuildToken) return;
    this.cells.clear();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || !item.active) continue;
      const cx = Math.floor(item.x / this.cellSize);
      const cy = Math.floor(item.y / this.cellSize);
      const key = this._key(cx, cy);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push(item);
    }
    this.lastBuildToken = token;
  }

  forEachInRadius(x, y, radius, fn) {
    const r2 = radius * radius;
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const bucket = this.cells.get(this._key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const item = bucket[i];
          if (!item.active) continue;
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) fn(item);
        }
      }
    }
  }
}
