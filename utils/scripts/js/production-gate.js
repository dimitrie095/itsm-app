#!/usr/bin/env node

const { spawnSync } = require("node:child_process")

const REQUIRED_COMMANDS = [
  "npm run build",
  "npm run test:security",
  "npm run test:e2e:core",
  "npm run test:e2e:roles",
]

function runCommand(command) {
  const startedAt = Date.now()
  console.log(`\n> ${command}`)
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  })
  const elapsedMs = Date.now() - startedAt
  return { code: result.status ?? 1, elapsedMs }
}

function main() {
  console.log("Production gate started")
  const failures = []

  for (const command of REQUIRED_COMMANDS) {
    const { code, elapsedMs } = runCommand(command)
    if (code !== 0) {
      failures.push({ command, code, elapsedMs })
      break
    }
  }

  if (failures.length > 0) {
    const failure = failures[0]
    console.error("\nProduction gate FAILED")
    console.error(
      `Failed command: "${failure.command}" (exit=${failure.code}, duration_ms=${failure.elapsedMs})`
    )
    process.exitCode = 1
    return
  }

  console.log("\nProduction gate PASSED")
}

main()
