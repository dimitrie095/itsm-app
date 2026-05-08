#!/usr/bin/env node

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000"
const MAX_ATTEMPTS = Number(process.env.SMOKE_MAX_ATTEMPTS || "20")
const RETRY_DELAY_MS = Number(process.env.SMOKE_RETRY_DELAY_MS || "3000")
const REQUEST_TIMEOUT_MS = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || "5000")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function checkEndpoint(path, expectedStatus) {
  const url = `${BASE_URL}${path}`
  const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS)
  const isOk = response.status === expectedStatus
  return {
    path,
    status: response.status,
    ok: isOk,
  }
}

async function runSmokeCheck() {
  console.log("Deployment smoke check started")
  console.log(`base_url=${BASE_URL}`)
  console.log(`max_attempts=${MAX_ATTEMPTS}`)
  console.log(`retry_delay_ms=${RETRY_DELAY_MS}`)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const health = await checkEndpoint("/api/health", 200)
      const ready = await checkEndpoint("/api/ready", 200)

      console.log(
        `[attempt ${attempt}] health=${health.status} ready=${ready.status} ready_ok=${ready.ok ? "yes" : "no"}`
      )

      if (health.ok && ready.ok) {
        console.log("Deployment smoke check PASSED")
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error"
      console.log(`[attempt ${attempt}] request_failed=${message}`)
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS)
    }
  }

  console.error("Deployment smoke check FAILED")
  console.error("Instance is not healthy/ready. Stop rollout.")
  process.exitCode = 1
}

runSmokeCheck()
