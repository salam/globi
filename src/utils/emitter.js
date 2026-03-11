export class Emitter {
  #listeners = new Map();

  on(eventName, listener) {
    const set = this.#listeners.get(eventName) ?? new Set();
    set.add(listener);
    this.#listeners.set(eventName, set);
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    const set = this.#listeners.get(eventName);
    if (!set) {
      return;
    }
    set.delete(listener);
    if (set.size === 0) {
      this.#listeners.delete(eventName);
    }
  }

  emit(eventName, payload) {
    const set = this.#listeners.get(eventName);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(payload);
    }
  }
}
