import { beforeEach, describe, expect, it, vi } from "vitest"

type StoredRequest = {
  url: string
  options: RequestInit
}

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

function createApiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function installBrowserGlobals() {
  const storage = new MemoryStorage()

  vi.stubGlobal("localStorage", storage)
  vi.stubGlobal("window", {
    location: {
      hostname: "localhost",
      protocol: "http:",
    },
    setTimeout,
    clearTimeout,
  })

  return storage
}

async function loadApi() {
  vi.resetModules()
  installBrowserGlobals()
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})

  return import("./api")
}

describe("api client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("stores, reads, and clears the access token", async () => {
    const { clearToken, getStoredToken, storeToken } = await loadApi()

    expect(getStoredToken()).toBeNull()

    storeToken("access-token")
    expect(getStoredToken()).toBe("access-token")

    clearToken()
    expect(getStoredToken()).toBeNull()
  })

  it("sends JSON requests with bearer authorization to the configured API base URL", async () => {
    const requests: StoredRequest[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      return createApiResponse({
        success: true,
        data: { session: { _id: "session-1" } },
        error: null,
      })
    }))

    const { api } = await loadApi()

    await api.investStocks("jwt-token", 1250)

    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe("http://127.0.0.1:5050/api/game/stocks/invest")
    expect(requests[0].options.method).toBe("POST")
    expect(requests[0].options.body).toBe(JSON.stringify({ amount: 1250 }))

    const headers = requests[0].options.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer jwt-token")
    expect(headers.get("Content-Type")).toBe("application/json")
  })

  it("uses the current backend endpoint for specific home purchases", async () => {
    const requests: StoredRequest[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      return createApiResponse({
        success: true,
        data: { session: { ownedHome: { homeId: "townhome" } } },
        error: null,
      })
    }))

    const { api } = await loadApi()

    await api.buyHomeType("jwt-token", "townhome")

    expect(requests[0].url).toBe("http://127.0.0.1:5050/api/game/home/buy")
    expect(requests[0].options.body).toBe(JSON.stringify({ homeId: "townhome" }))
  })

  it("builds public leaderboard requests with the requested limit", async () => {
    const requests: StoredRequest[] = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      return createApiResponse({
        success: true,
        data: { entries: [] },
        error: null,
      })
    }))

    const { api } = await loadApi()

    await api.leaderboard(5)

    expect(requests[0].url).toBe("http://127.0.0.1:5050/api/leaderboard?limit=5")
    expect((requests[0].options.headers as Headers).get("Authorization")).toBeNull()
  })

  it("throws ApiRequestError with backend error code and status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      createApiResponse(
        {
          success: false,
          data: null,
          error: {
            code: "EMAIL_NOT_VERIFIED",
            message: "Verify your email before logging in.",
          },
        },
        403,
      ),
    ))

    const { ApiRequestError, api } = await loadApi()

    await expect(api.login({ email: "player@example.com", password: "Password123!" }))
      .rejects.toMatchObject({
        name: "Error",
        code: "EMAIL_NOT_VERIFIED",
        status: 403,
        message: "Verify your email before logging in.",
      })
    await expect(api.login({ email: "player@example.com", password: "Password123!" }))
      .rejects.toBeInstanceOf(ApiRequestError)
  })

  it("reports unreadable API responses as invalid responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("not-json", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      }),
    ))

    const { api } = await loadApi()

    await expect(api.me("jwt-token")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      status: 502,
      message: "The API returned a response the app could not read.",
    })
  })

  it("wraps network failures in a user-facing request error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch")
    }))

    const { api } = await loadApi()

    await expect(api.me("jwt-token")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
      message: "Could not reach the API server.",
    })
  })
})
