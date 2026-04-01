import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Capacitor } from "@capacitor/core";

import {
  OfflineModeError,
  UnauthorizedError,
  apiRequest,
  shouldUseOfflineFallback,
} from "@/services/api/client";
import {
  ApiBaseUrlConfigurationError,
  isOfflineModeActive,
} from "@/services/config/runtime";

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;
const originalOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
const originalIsNativePlatform = Capacitor.isNativePlatform;
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
  process.env.NEXT_PUBLIC_API_URL = "";
  replacedTo = null;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: createWindow(),
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Capacitor.isNativePlatform = originalIsNativePlatform;
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
    return;
  }

  process.env.NEXT_PUBLIC_OFFLINE_MODE = originalOfflineMode;

  if (originalApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
    return;
  }

  process.env.NEXT_PUBLIC_API_URL = originalApiBaseUrl;
});

test("isOfflineModeActive ignores navigator.onLine", () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });

  assert.equal(isOfflineModeActive(), false);
});

test("apiRequest still attempts fetch when navigator reports offline", async () => {
  let fetchCalls = 0;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });

  globalThis.fetch = async (input, init) => {
    fetchCalls += 1;

    assert.equal(input, "/api/habits");
    assert.equal(init?.method, "GET");

    return new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await apiRequest<Array<{ id: number }>>({
    path: "/api/habits",
    method: "GET",
  });

  assert.equal(fetchCalls, 1);
  assert.deepEqual(result, [{ id: 1 }]);
});

test("apiRequest adds the bearer token when a saved session exists", async () => {
  window.localStorage.setItem("access_token", "saved-access");

  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.headers instanceof Headers, false);
    assert.deepEqual(init?.headers, {
      "Content-Type": "application/json",
      Authorization: "Bearer saved-access",
    });

    return new Response(JSON.stringify([{ id: 1 }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await apiRequest<Array<{ id: number }>>({
    path: "/api/habits",
    method: "GET",
  });
});

test("apiRequest uses OfflineModeError only for explicit forced offline mode", async () => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "true";
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(null, { status: 204 });
  };

  await assert.rejects(
    apiRequest({
      path: "/api/habits",
      method: "GET",
    }),
    (error: unknown) => error instanceof OfflineModeError,
  );

  assert.equal(fetchCalls, 0);
});

test("apiRequest rejects localhost for native apps", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";
  Capacitor.isNativePlatform = () => true;
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(null, { status: 204 });
  };

  await assert.rejects(
    apiRequest({
      path: "/api/habits",
      method: "GET",
    }),
    (error: unknown) =>
      error instanceof ApiBaseUrlConfigurationError &&
      error.message.includes("localhost"),
  );

  assert.equal(fetchCalls, 0);
});

test("apiRequest accepts a LAN IP for native apps", async () => {
  process.env.NEXT_PUBLIC_API_URL = "http://192.168.1.50:5000/";
  Capacitor.isNativePlatform = () => true;

  globalThis.fetch = async (input) => {
    assert.equal(input, "http://192.168.1.50:5000/api/habits");

    return new Response(JSON.stringify([{ id: 2 }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await apiRequest<Array<{ id: number }>>({
    path: "/api/habits",
    method: "GET",
  });

  assert.deepEqual(result, [{ id: 2 }]);
});

test("apiRequest clears the saved session and redirects on 401 responses", async () => {
  window.localStorage.setItem("access_token", "expired-token");
  window.localStorage.setItem("refresh_token", "expired-refresh");
  window.localStorage.setItem("user", JSON.stringify({ id: 7, email: "test@example.com" }));

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Token expired." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    apiRequest({
      path: "/api/habits",
      method: "GET",
    }),
    (error: unknown) =>
      error instanceof UnauthorizedError &&
      error.message === "Token expired.",
  );

  assert.equal(window.localStorage.getItem("access_token"), null);
  assert.equal(window.localStorage.getItem("refresh_token"), null);
  assert.equal(window.localStorage.getItem("user"), null);
  assert.equal(replacedTo, "/login");
});

test("apiRequest can skip the global redirect when unauthorized handling is disabled", async () => {
  window.localStorage.setItem("access_token", "saved-access");
  window.localStorage.setItem("user", JSON.stringify({ id: 7, email: "test@example.com" }));

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Invalid credentials." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    apiRequest({
      path: "/api/auth/login",
      method: "POST",
      redirectOnUnauthorized: false,
    }),
    (error: unknown) =>
      error instanceof UnauthorizedError &&
      error.message === "Invalid credentials.",
  );

  assert.equal(window.localStorage.getItem("access_token"), "saved-access");
  assert.notEqual(window.localStorage.getItem("user"), null);
  assert.equal(replacedTo, null);
});

test("shouldUseOfflineFallback matches network failures but not HTTP errors", async () => {
  const networkError = new TypeError("Failed to fetch");
  const httpError = new Error("API request failed with status 500");

  globalThis.fetch = async () => {
    throw networkError;
  };

  await assert.rejects(
    apiRequest({
      path: "/api/habits",
      method: "GET",
    }),
    (error: unknown) => {
      assert.equal(error, networkError);
      return true;
    },
  );

  assert.equal(shouldUseOfflineFallback(networkError), true);
  assert.equal(shouldUseOfflineFallback(httpError), false);
});
