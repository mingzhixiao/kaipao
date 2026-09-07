// ---------------- 高性能对象池与紧凑内存管理 (ObjectPool & In-Place Compaction) ----------------

export class ObjectPool {
  constructor(createFn, resetFn = null, initialSize = 50, maxSize = 300) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.pool = [];

    for (let i = 0; i < initialSize; i++) {
      const obj = this.createFn();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }
    obj.active = true;
    if (this.resetFn) {
      this.resetFn(obj);
    }
    return obj;
  }

  release(obj) {
    if (!obj) return;
    obj.active = false;
    if (this.resetFn) {
      this.resetFn(obj);
    }
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  // 释放整个列表对象至池中
  releaseAll(list) {
    for (let i = 0; i < list.length; i++) {
      this.release(list[i]);
    }
    list.length = 0;
  }

  // 高性能单趟原地紧凑化 (O(n) 0-Heap-Alloc, 彻底替代高频 array.splice(i, 1))
  static compact(arr) {
    let write = 0;
    for (let read = 0; read < arr.length; read++) {
      if (arr[read].active) {
        if (write !== read) {
          arr[write] = arr[read];
        }
        write++;
      }
    }
    arr.length = write;
    return arr;
  }
}

