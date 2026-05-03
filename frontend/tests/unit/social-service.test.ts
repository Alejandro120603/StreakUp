import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { saveSession } from "@/services/auth/authService";
import {
  createSharedGroup,
  fetchSharedGroups,
  joinSharedGroup,
  leaveSharedGroup,
} from "@/services/social/socialService";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalOfflineMode = process.env.NEXT_PUBLIC_OFFLINE_MODE;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

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

function createDocument() {
  let cookie = "";

  return {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
  };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "";
  process.env.NEXT_PUBLIC_API_URL = "";

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: createWindow(),
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: createDocument(),
  });

  saveSession({
    access_token: buildJwt({ sub: "7", exp: Math.floor(Date.now() / 1000) + 3600 }),
    refresh_token: "saved-refresh",
    user: {
      id: 7,
      username: "alice",
      email: "alice@example.com",
      role: "user",
      created_at: "2026-04-05T00:00:00Z",
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  });

  if (originalOfflineMode === undefined) {
    delete process.env.NEXT_PUBLIC_OFFLINE_MODE;
  } else {
    process.env.NEXT_PUBLIC_OFFLINE_MODE = originalOfflineMode;
  }

  if (originalApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalApiBaseUrl;
  }
});

test("social service creates and joins groups through social endpoints", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        id: 4,
        name: "Equipo",
        invite_code: "ABC123",
        owner_user_id: 7,
        member_count: 2,
        created_at: "2026-05-03T00:00:00Z",
        shared_streak: {
          current: 3,
          today_completed_members: 2,
          required_members: 2,
          ready: true,
        },
        members: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const created = await createSharedGroup({ name: "Equipo" });
  const joined = await joinSharedGroup({ invite_code: "ABC123" });

  assert.equal(calls[0]?.url.endsWith("/api/social/groups"), true);
  assert.equal(calls[0]?.init?.body, JSON.stringify({ name: "Equipo" }));
  assert.equal(calls[1]?.url.endsWith("/api/social/groups/join"), true);
  assert.equal(calls[1]?.init?.body, JSON.stringify({ invite_code: "ABC123" }));
  assert.equal(created.shared_streak.current, 3);
  assert.equal(joined.member_count, 2);
});

test("social service lists and leaves groups", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(`${init?.method ?? "GET"} ${String(input)}`);
    if (init?.method === "DELETE") {
      return new Response(JSON.stringify({ left: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await fetchSharedGroups();
  await leaveSharedGroup(9);

  assert.equal(calls[0]?.endsWith("/api/social/groups"), true);
  assert.equal(calls[1]?.includes("DELETE"), true);
  assert.equal(calls[1]?.endsWith("/api/social/groups/9/membership"), true);
});

test("offline mode does not fabricate social success", async () => {
  process.env.NEXT_PUBLIC_OFFLINE_MODE = "true";

  await assert.rejects(fetchSharedGroups(), /requieren conexión/);
  await assert.rejects(createSharedGroup({ name: "Equipo" }), /requieren conexión/);
});
