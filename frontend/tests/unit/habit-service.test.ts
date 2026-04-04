import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { updateHabit } from "@/services/habits/habitService";

const originalOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE;

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";
});

afterEach(() => {
  if (originalOfflineMode === undefined) {
    delete process.env.NEXT_PUBLIC_OFFLINE_MODE;
  } else {
    process.env.NEXT_PUBLIC_OFFLINE_MODE = originalOfflineMode;
  }
});

test("updateHabit rejects immediately if not in offline mode", async () => {
  await assert.rejects(
    updateHabit(1, { name: "Test", habit_type: "boolean", frequency: "daily", section: "fire" }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "La edición de hábitos en la nube se implementará próximamente.");
      return true;
    },
  );
});
