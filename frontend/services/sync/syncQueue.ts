import { DB_KEYS, type PendingOperation, dbRead, dbWrite } from "@/services/storage/offlineDb";

function readOps(): PendingOperation[] {
  return dbRead<PendingOperation[]>(DB_KEYS.pendingOps, []);
}

function writeOps(ops: PendingOperation[]): void {
  dbWrite(DB_KEYS.pendingOps, ops);
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Enqueue a toggle_checkin op, or cancel an existing one for the same
 * (habitId, date, userId) pair so double-toggles leave a clean queue.
 */
export function enqueueOrCancelToggleCheckin(
  habitId: number,
  date: string,
  userId: number,
): "enqueued" | "cancelled" {
  const ops = readOps();
  const existingIndex = ops.findIndex(
    (op) =>
      op.kind === "toggle_checkin" &&
      op.userId === userId &&
      op.payload.habit_id === habitId &&
      op.payload.date === date,
  );

  if (existingIndex >= 0) {
    ops.splice(existingIndex, 1);
    writeOps(ops);
    return "cancelled";
  }

  ops.push({
    id: makeId(),
    kind: "toggle_checkin",
    userId,
    payload: { habit_id: habitId, date },
    createdAt: new Date().toISOString(),
  });
  writeOps(ops);
  return "enqueued";
}

export function dequeuePendingOp(id: string): void {
  writeOps(readOps().filter((op) => op.id !== id));
}

export function getPendingOps(userId: number): PendingOperation[] {
  return readOps().filter((op) => op.userId === userId);
}

export function getPendingOpsCount(userId: number): number {
  return getPendingOps(userId).length;
}

export function hasPendingCheckin(habitId: number, date: string, userId: number): boolean {
  return getPendingOps(userId).some(
    (op) =>
      op.kind === "toggle_checkin" &&
      op.payload.habit_id === habitId &&
      op.payload.date === date,
  );
}
