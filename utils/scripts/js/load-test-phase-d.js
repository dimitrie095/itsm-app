#!/usr/bin/env node

const { performance } = require("node:perf_hooks")

const BASE_URL = process.env.LOAD_TEST_BASE_URL || "http://localhost:3000"
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY || "20")
const ROUNDS = Number(process.env.LOAD_TEST_ROUNDS || "3")
const AUTH_EMAIL = process.env.LOAD_TEST_EMAIL || "agent@example.com"
const AUTH_PASSWORD = process.env.LOAD_TEST_PASSWORD || "demo123"

const TARGETS = ["/", "/tickets", "/analytics", "/api/notifications?summary=true", "/api/tickets?limit=20"]

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(index, 0)]
}

function extractSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie()
  }
  const cookie = response.headers.get("set-cookie")
  return cookie ? [cookie] : []
}

function mergeCookies(currentCookieHeader, setCookieHeaders) {
  const cookieMap = new Map()
  if (currentCookieHeader) {
    for (const pair of currentCookieHeader.split(";")) {
      const [rawName, rawValue] = pair.split("=")
      if (!rawName || typeof rawValue === "undefined") continue
      cookieMap.set(rawName.trim(), rawValue.trim())
    }
  }

  for (const setCookie of setCookieHeaders) {
    const cookieKV = setCookie.split(";")[0]
    const [rawName, rawValue] = cookieKV.split("=")
    if (!rawName || typeof rawValue === "undefined") continue
    cookieMap.set(rawName.trim(), rawValue.trim())
  }

  return [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`).join("; ")
}

function extractCsrfToken(response) {
  const body = response.headers.get("content-type")?.includes("application/json")
    ? response.json()
    : Promise.resolve({})
  return body.then((data) => data?.csrfToken || "")
}

async function authenticate() {
  let cookieHeader = ""

  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
    headers: { Accept: "application/json" },
  })
  cookieHeader = mergeCookies(cookieHeader, extractSetCookies(csrfResponse))
  const csrfToken = await extractCsrfToken(csrfResponse)

  if (!csrfToken) {
    throw new Error("Failed to obtain CSRF token for load test auth")
  }

  const body = new URLSearchParams({
    csrfToken,
    email: AUTH_EMAIL,
    password: AUTH_PASSWORD,
    callbackUrl: "/",
    json: "true",
  })

  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body,
    redirect: "manual",
  })

  cookieHeader = mergeCookies(cookieHeader, extractSetCookies(loginResponse))

  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
  })
  const sessionBody = await sessionResponse.json().catch(() => null)
  const isAuthenticated = Boolean(sessionBody?.user?.email)
  if (!isAuthenticated) {
    throw new Error("Load test authentication failed (no active session)")
  }

  return cookieHeader
}

async function callTargetAuthenticated(target, cookieHeader) {
  const startedAt = performance.now()
  try {
    const response = await fetch(`${BASE_URL}${target}`, {
      headers: {
        Cookie: cookieHeader,
      },
    })
    const duration = performance.now() - startedAt
    return { ok: response.ok, status: response.status, duration, target }
  } catch {
    const duration = performance.now() - startedAt
    return { ok: false, status: 0, duration, target }
  }
}

async function runRound(round, cookieHeader) {
  const requests = []
  for (let i = 0; i < CONCURRENCY; i += 1) {
    const target = TARGETS[i % TARGETS.length]
    requests.push(callTargetAuthenticated(target, cookieHeader))
  }
  const results = await Promise.all(requests)
  const durations = results.map((r) => r.duration)
  const errors = results.filter((r) => !r.ok).length

  console.log(
    `[round ${round}] requests=${results.length} errors=${errors} p50=${percentile(durations, 50).toFixed(
      1
    )}ms p95=${percentile(durations, 95).toFixed(1)}ms p99=${percentile(durations, 99).toFixed(1)}ms`
  )

  return results
}

async function main() {
  console.log(`Phase D load scenario`)
  console.log(`base_url=${BASE_URL} concurrency=${CONCURRENCY} rounds=${ROUNDS}`)
  console.log(`auth_email=${AUTH_EMAIL}`)

  const cookieHeader = await authenticate()
  console.log(`auth_status=ok`)

  const all = []
  for (let round = 1; round <= ROUNDS; round += 1) {
    const results = await runRound(round, cookieHeader)
    all.push(...results)
  }

  const durations = all.map((r) => r.duration)
  const errors = all.filter((r) => !r.ok).length
  const errorRate = ((errors / all.length) * 100).toFixed(2)
  const statusCounts = all.reduce((acc, item) => {
    const key = String(item.status)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  console.log(`total_requests=${all.length}`)
  console.log(`error_rate=${errorRate}%`)
  console.log(`p50=${percentile(durations, 50).toFixed(1)}ms`)
  console.log(`p95=${percentile(durations, 95).toFixed(1)}ms`)
  console.log(`p99=${percentile(durations, 99).toFixed(1)}ms`)
  console.log(`status_counts=${JSON.stringify(statusCounts)}`)
}

main().catch((error) => {
  console.error("load test failed", error)
  process.exitCode = 1
})
