// Generic object pool — zero per-frame allocation in the hot loop (Performance Budget law).

export class Pool<T> {
  private free: T[] = [];
  taken = 0;
  constructor(private factory: () => T, prealloc = 0) {
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }
  get(): T { this.taken++; return this.free.pop() ?? this.factory(); }
  put(o: T) { this.taken--; this.free.push(o); }
  get available() { return this.free.length; }
}
