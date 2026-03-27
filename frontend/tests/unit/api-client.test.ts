import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Capacitor } from "@capacitor/core";

import {
  OfflineModeError,
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

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";
  process.env.NEXT_PUBLIC_API_URL = "";

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: createStorage() },
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
