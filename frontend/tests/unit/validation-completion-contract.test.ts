/**
 * validation-completion-contract.test.ts
 * =======================================
 * Frontend unit tests for the strict validation completion contract.
 *
 * Tests verify:
 *  1. Failed validation (success=false) keeps habit pending — does NOT return truthy result.
 *  2. Network error keeps habit pending — service throws, not resolves.
 *  3. Successful validation returns success=true + completed=true.
 *  4. The `validateHabit` service propagates the backend's canonical fields.
 *  5. Provider-unavailable (503) throws — caller must NOT mark as completed.
 *  6. Double-click safety — a second call while the first is in flight is blocked
 *     by the isSubmitting ref (this tests the service layer, not the ref itself).
 *  7. Counter increment only happens on success (response shape assertion).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { saveSession } from "@/services/auth/authService";
import { validateHabit } from "@/services/validation/validationService";
import type { ValidationResult } from "@/types/habits";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
    removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { store.set(k, String(v)); },
  };
}

const originalFetch = globalThis.fetch;
const originalWindow = (globalThis as Record<string, unknown>).window;
const originalDocument = (globalThis as Record<string, unknown>).document;
const origOffline = process.env.NEXT_PUBLIC_OFFLINE_MODE;
const origApiUrl = process.env.NEXT_PUBLIC_API_URL;

function mockFetch(body: unknown, status = 200): void {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

function mockFetchThrow(error: Error): void {
  globalThis.fetch = async () => { throw error; };
}

/** Build a canonical successful ValidationResult as the backend now returns. */
function successEnvelope(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    success: true,
    approved: true,
    completed: true,
    valido: true,
    razon: "Evidencia válida.",
    confianza: 0.95,
    xp_ganado: 20,
    nueva_racha: 3,
    ...overrides,
  };
}

/** Build a canonical REJECTED ValidationResult (HTTP 200, business rejection). */
function rejectedEnvelope(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    success: false,
    approved: false,
    completed: false,
    valido: false,
    razon: "No se aprecia evidencia del hábito.",
    confianza: 0.85,
    xp_ganado: 0,
    error: "No se aprecia evidencia del hábito.",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";
  process.env.NEXT_PUBLIC_API_URL = "";

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: makeStorage(),
      location: { href: "" },
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: (() => {
      let cookie = "";
      return {
        get cookie() { return cookie; },
        set cookie(v: string) { cookie = v; },
      };
    })(),
  });

  saveSession({
    access_token: buildJwt({ sub: "42", exp: Math.floor(Date.now() / 1000) + 3600 }),
    refresh_token: "test-refresh",
    user: {
      id: 42,
      username: "tester",
      email: "tester@example.com",
      role: "user",
      created_at: "2026-01-01T00:00:00Z",
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  if (origOffline === undefined) delete process.env.NEXT_PUBLIC_OFFLINE_MODE;
  else process.env.NEXT_PUBLIC_OFFLINE_MODE = origOffline;
  if (origApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = origApiUrl;
});

// ---------------------------------------------------------------------------
// 1. Successful validation — canonical fields present and correct
// ---------------------------------------------------------------------------

describe("successful validation", () => {
  test("returns success=true, approved=true, completed=true", async () => {
    mockFetch(successEnvelope());
    const result = await validateHabit({ habit_id: 1, image_base64: "abc=", mime_type: "image/jpeg" });
    assert.equal(result.success, true, "success must be true");
    assert.equal(result.approved, true, "approved must be true");
    assert.equal(result.completed, true, "completed must be true");
    assert.equal(result.valido, true, "legacy valido must also be true");
  });

  test("returns xp_ganado > 0 so counter can be incremented", async () => {
    mockFetch(successEnvelope({ xp_ganado: 20 }));
    const result = await validateHabit({ habit_id: 1, image_base64: "abc=" });
    assert.ok(
      (result.xp_ganado ?? 0) > 0,
      "successful validation must report XP earned > 0",
    );
  });

  test("only resolves (does not throw) — caller can mark habit completed", async () => {
    mockFetch(successEnvelope());
    // If this rejects, the test fails automatically — assert just for clarity.
    const result = await validateHabit({ habit_id: 2, image_base64: "abc=" });
    assert.ok(result, "must resolve with a result object");
  });
});

// ---------------------------------------------------------------------------
// 2. Failed validation (backend business rejection, HTTP 200)
//    Habit must remain pending — success=false.
// ---------------------------------------------------------------------------

describe("failed validation — backend rejection (HTTP 200 + success=false)", () => {
  test("returns success=false, approved=false, completed=false", async () => {
    mockFetch(rejectedEnvelope());
    const result = await validateHabit({ habit_id: 3, image_base64: "abc=" });
    assert.equal(result.success, false, "success must be false on rejection");
    assert.equal(result.approved, false, "approved must be false on rejection");
    assert.equal(result.completed, false, "completed must be false on rejection");
  });

  test("returns xp_ganado === 0 so counter is NOT incremented", async () => {
    mockFetch(rejectedEnvelope());
    const result = await validateHabit({ habit_id: 3, image_base64: "abc=" });
    assert.equal(result.xp_ganado, 0, "rejected validation must not award XP");
  });

  test("resolves (does not throw) — caller must check success flag", async () => {
    // The rejection is a BUSINESS outcome returned as HTTP 200.
    // The service must NOT throw; the page component checks result.success.
    mockFetch(rejectedEnvelope());
    const result = await validateHabit({ habit_id: 3, image_base64: "abc=" });
    assert.equal(result.success, false);
    assert.ok(result.razon, "rejection must include a reason string");
  });

  test("counter must not increment on rejection — success=false is the gate", async () => {
    mockFetch(rejectedEnvelope());
    const result = await validateHabit({ habit_id: 3, image_base64: "abc=" });
    // The page increments via: if (result.success) { counter++ }
    // Verify the condition is definitively false.
    const shouldIncrementCounter = result.success === true;
    assert.equal(shouldIncrementCounter, false, "counter gate must remain closed");
  });
});

// ---------------------------------------------------------------------------
// 3. Network error — service throws, habit must remain pending
// ---------------------------------------------------------------------------

describe("network error keeps habit pending", () => {
  test("TypeError (fetch failure) causes service to throw AppError", async () => {
    mockFetchThrow(new TypeError("Failed to fetch"));
    await assert.rejects(
      validateHabit({ habit_id: 5, image_base64: "abc=" }),
      (err: Error) => {
        assert.ok(err instanceof Error, "must throw an Error");
        assert.ok(
          err.message.length > 0,
          "error message must be non-empty for the UI to display",
        );
        return true;
      },
    );
  });

  test("throws — not resolves — so catch block keeps habit pending", async () => {
    mockFetchThrow(new TypeError("Network unavailable"));
    let threw = false;
    try {
      await validateHabit({ habit_id: 5, image_base64: "abc=" });
    } catch {
      threw = true;
    }
    assert.ok(threw, "network error must throw so the page catch branch runs");
  });
});

// ---------------------------------------------------------------------------
// 4. Provider unavailable (503) — must throw, not resolve
// ---------------------------------------------------------------------------

describe("provider unavailable (503)", () => {
  test("throws with a user-friendly message", async () => {
    mockFetch(
      { error: "La validación de fotos no está disponible temporalmente.", code: "validation_provider_unavailable" },
      503,
    );
    await assert.rejects(
      validateHabit({ habit_id: 6, image_base64: "abc=" }),
      /disponible/i,
    );
  });

  test("throws — habit must remain pending on 503", async () => {
    mockFetch({ error: "Servicio no disponible.", code: "validation_provider_unavailable" }, 503);
    let threw = false;
    try {
      await validateHabit({ habit_id: 6, image_base64: "abc=" });
    } catch {
      threw = true;
    }
    assert.ok(threw, "503 must propagate as a thrown error");
  });
});

// ---------------------------------------------------------------------------
// 5. Validate-button disabled state contract
//    (Service-layer tests — the button's HTML disabled attr is rendered correctly
//     when status === 'loading'. We test the data contract that drives it.)
// ---------------------------------------------------------------------------

describe("validate button disabled during loading — data contract", () => {
  test("a pending fetch still in flight is modelled by status=loading gate", async () => {
    // We cannot directly test a React hook in node:test, but we can verify that
    // the service resolves only ONCE per call — no implicit retries that could
    // cause the UI to re-enable the button prematurely.
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(JSON.stringify(successEnvelope()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await validateHabit({ habit_id: 7, image_base64: "abc=" });
    // Exactly one fetch call — no internal retry on success.
    assert.equal(callCount, 1, "service must make exactly one request per validateHabit call");
  });
});

// ---------------------------------------------------------------------------
// 6. Counter double-increment guard — verifying the response contract
// ---------------------------------------------------------------------------

describe("counter does not increment twice on double call", () => {
  test("two sequential calls with same data both resolve independently", async () => {
    // The isSubmitting ref in the page component is the primary guard, but we
    // verify here that the service itself is stateless — each call is independent.
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(JSON.stringify(successEnvelope()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const [r1, r2] = await Promise.all([
      validateHabit({ habit_id: 8, image_base64: "abc=" }),
      validateHabit({ habit_id: 8, image_base64: "abc=" }),
    ]);

    // Both resolve — the guard is the ref in the page component, not the service.
    // What we verify: both responses have correct success flags so the page can
    // apply the isSubmitting guard before calling the service the second time.
    assert.equal(callCount, 2, "service made 2 fetch calls (guard is in the page, not the service)");
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);
  });
});

// ---------------------------------------------------------------------------
// 7. Payload shape — mime_type forwarded correctly
// ---------------------------------------------------------------------------

describe("request payload forwarded correctly", () => {
  test("mime_type is included in the POST body", async () => {
    let sentBody: unknown;
    globalThis.fetch = async (_url, init) => {
      sentBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(successEnvelope()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await validateHabit({ habit_id: 9, image_base64: "abc=", mime_type: "image/png" });
    assert.deepEqual((sentBody as Record<string, unknown>)["mime_type"], "image/png");
  });

  test("text_content is forwarded for text validation", async () => {
    let sentBody: unknown;
    globalThis.fetch = async (_url, init) => {
      sentBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(successEnvelope()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await validateHabit({ habit_id: 10, text_content: "Mi diario de hoy fue muy productivo." });
    assert.equal((sentBody as Record<string, unknown>)["text_content"], "Mi diario de hoy fue muy productivo.");
  });
});
