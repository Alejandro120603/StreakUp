import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  getSession,
  hasSavedSession,
  login,
  register,
  saveSession,
  clearSession,
} from "@/services/auth/authService";

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;
const originalOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE;

function createStorage(): Storage {
  const store = new Map<string, string>();

  return {
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function createWindow() {
  return {
    localStorage: createStorage(),
    location: {
      href: "",
    },
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: createWindow(),
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });

  if (originalOfflineMode === undefined) {
    delete process.env.NEXT_PUBLIC_OFFLINE_MODE;
  } else {
    process.env.NEXT_PUBLIC_OFFLINE_MODE = originalOfflineMode;
  }
});

// 🔐 Datos fake para evitar detección de secretos
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test_password";

test("saveSession and getSession round-trip", () => {
  saveSession({
    access_token: "saved-access",
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  const session = getSession();
  assert.notEqual(session, null);
  assert.equal(session?.accessToken, "saved-access");
  assert.equal(session?.user.email, TEST_EMAIL);
});

test("clearSession removes all stored auth data", () => {
  saveSession({
    access_token: "saved-access",
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  clearSession();

  assert.equal(getSession(), null);
  assert.equal(window.localStorage.getItem("access_token"), null);
  assert.equal(window.localStorage.getItem("refresh_token"), null);
  assert.equal(window.localStorage.getItem("user"), null);
});

test("hasSavedSession returns false when no session exists", () => {
  assert.equal(hasSavedSession(), false);
});

test("hasSavedSession returns true when session exists", () => {
  saveSession({
    access_token: "saved-access",
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  assert.equal(hasSavedSession(), true);
});

test("register does not block when navigator.onLine is false", async () => {
  let fetchCalls = 0;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });

  globalThis.fetch = async (input, init) => {
    fetchCalls += 1;

    assert.equal(input, "/api/auth/register");
    assert.equal(init?.method, "POST");

    return new Response(
      JSON.stringify({
        message: "User registered successfully.",
        user: {
          id: 7,
          username: "alice",
          email: TEST_EMAIL,
          role: "user",
          created_at: "2026-03-27T00:00:00Z",
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  const result = await register({
    username: "alice",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  assert.equal(fetchCalls, 1);
  assert.equal(result.user.email, TEST_EMAIL);
});

test("register reports offline only after a real request failure", async () => {
  let fetchCalls = 0;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });

  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    register({
      username: "alice",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    (error: unknown) => {
      assert.equal(fetchCalls, 1);
      assert.equal(
        error instanceof Error ? error.message : String(error),
        "No hay conexión. El registro requiere internet.",
      );
      return true;
    },
  );
});

test("login reports offline when the backend request fails", async () => {
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    login({
      email: TEST_EMAIL.toUpperCase(),
      password: TEST_PASSWORD,
    }),
    (error: unknown) => {
      assert.equal(fetchCalls, 1);
      assert.ok(error instanceof Error);
      return true;
    },
  );
});

test("login with cached session fails securely when backend request throws", async () => {
  saveSession({
    access_token: "saved-access",
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    login({
      email: TEST_EMAIL,
      password: "wrong_password",
    }),
    (error: unknown) => {
      assert.equal(fetchCalls, 1);
      assert.ok(error instanceof Error);
      assert.equal(error.message, "No hay conexión. Usa una sesión guardada previamente.");
      return true;
    },
  );
});
