/**
 * Snapshot-based undo/redo stack.
 *
 * The undo stack stores snapshots of state. The bottom-most entry is the
 * "base" (oldest retained) state. canUndo is true only when there are at
 * least two entries in the stack — meaning there is a previous state to
 * return to after popping the current one.
 *
 * Behaviour:
 *   push(snapshot)  — record a new state; clears the redo stack.
 *   undo()          — step back: pops the current state to the redo stack
 *                     and returns the new top (the previous state).
 *   redo()          — step forward: pops from the redo stack, pushes back
 *                     onto the undo stack and returns that snapshot.
 */
export class UndoRedo {
  constructor(maxDepth = 50) {
    this._undoStack = [];
    this._redoStack = [];
    this._maxDepth = maxDepth;
  }

  /** True when there is a previous state to revert to. */
  get canUndo() {
    return this._undoStack.length > 1;
  }

  /** True when there is a future state to re-apply. */
  get canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * Record a new snapshot. Deep-clones the value before storing it.
   * Evicts the oldest entry when the stack exceeds maxDepth.
   * Clears the redo stack.
   *
   * @param {object} snapshot
   */
  push(snapshot) {
    this._undoStack.push(JSON.parse(JSON.stringify(snapshot)));
    if (this._undoStack.length > this._maxDepth) {
      this._undoStack.shift();
    }
    this._redoStack.length = 0;
  }

  /**
   * Step back to the previous state.
   * Moves the current snapshot to the redo stack and returns the
   * snapshot now at the top of the undo stack (i.e. the previous state).
   *
   * @returns {object|undefined} Previous snapshot, or undefined if nothing to undo.
   */
  undo() {
    if (!this.canUndo) return undefined;
    const current = this._undoStack.pop();
    this._redoStack.push(current);
    return JSON.parse(JSON.stringify(this._undoStack[this._undoStack.length - 1]));
  }

  /**
   * Step forward to the next state.
   * Moves the top of the redo stack back onto the undo stack and returns it.
   *
   * @returns {object|undefined} Re-applied snapshot, or undefined if nothing to redo.
   */
  redo() {
    if (!this.canRedo) return undefined;
    const snapshot = this._redoStack.pop();
    this._undoStack.push(snapshot);
    return JSON.parse(JSON.stringify(snapshot));
  }
}
