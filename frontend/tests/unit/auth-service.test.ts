import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  getSession,
  getCurrentUser,
  getToken,
  hasSavedSession,
  login,
  register,
  removeToken,
  saveSession,
  setToken,
} from "@/services/auth/authService";

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;
const originalOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE;
let replacedTo: string | null = null;

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
      replace(path: string) {
        replacedTo = path;
      },
    },
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";
  replacedTo = null;

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

function createToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("token helpers round-trip the access token in storage", () => {
  assert.equal(getToken(), null);

  setToken("saved-access");
  assert.equal(getToken(), "saved-access");

  removeToken();
  assert.equal(getToken(), null);
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
      assert.equal(
        error instanceof Error ? error.message : String(error),
        "No hay conexión. El inicio de sesión requiere conexión.",
      );
      return true;
    },
  );
});

test("getSession clears malformed auth state", () => {
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

  assert.equal(getSession(), null);
  assert.equal(getToken(), null);
  assert.equal(window.localStorage.getItem("refresh_token"), null);
  assert.equal(window.localStorage.getItem("user"), null);
});

test("hasSavedSession rejects expired tokens and clears storage", () => {
  saveSession({
    access_token: createToken({ exp: Math.floor(Date.now() / 1000) - 60 }),
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  assert.equal(hasSavedSession(), false);
  assert.equal(getToken(), null);
  assert.equal(window.localStorage.getItem("refresh_token"), null);
  assert.equal(window.localStorage.getItem("user"), null);
});

test("getCurrentUser returns the backend-authenticated user", () => {
  saveSession({
    access_token: createToken({ exp: Math.floor(Date.now() / 1000) + 60 }),
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "user_test",
      email: TEST_EMAIL,
      role: "user",
      created_at: "2026-03-27T00:00:00Z",
    },
  });

  assert.deepEqual(getCurrentUser(), {
    id: 7,
    username: "user_test",
    email: TEST_EMAIL,
    role: "user",
    created_at: "2026-03-27T00:00:00Z",
  });
});

test("login clears the saved session on invalid credentials", async () => {
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

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Invalid email or password." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    login({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    (error: unknown) => {
      assert.equal(
        error instanceof Error ? error.message : String(error),
        "Invalid email or password.",
      );
      return true;
    },
  );

  assert.equal(getToken(), null);
  assert.equal(window.localStorage.getItem("refresh_token"), null);
  assert.equal(window.localStorage.getItem("user"), null);
  assert.equal(replacedTo, null);
});

test("register does not trigger the global unauthorized redirect path", async () => {
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

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Unauthorized register attempt." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    register({
      username: "alice",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
    (error: unknown) => {
      assert.equal(
        error instanceof Error ? error.message : String(error),
        "Unauthorized register attempt.",
      );
      return true;
    },
  );

  assert.equal(getToken(), "saved-access");
  assert.equal(replacedTo, null);
});
