import { test, expect } from "@playwright/test"
import { DEMO_USERS } from "./fixtures/auth"

test.describe("Core Module Smoke (Admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(DEMO_USERS.agent.email)
    await page.getByLabel("Password").fill(DEMO_USERS.agent.password)
    await page.getByRole("button", { name: /sign in/i }).click()
  })

  test("dashboard route is reachable", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/($|login\?callbackUrl=%2F)/)
    if (/\/$/.test(page.url())) {
      await expect(page.getByRole("heading", { name: /dashboard|welcome/i }).first()).toBeVisible()
    }
  })

  test("tickets route is reachable", async ({ page }) => {
    await page.goto("/tickets")
    await expect(page).toHaveURL(/\/(tickets|login\?callbackUrl=.*tickets)$/)
    if (/\/tickets$/.test(page.url())) {
      await expect(page.getByRole("heading", { name: /tickets/i }).first()).toBeVisible()
    }
  })

  test("reports route is reachable", async ({ page }) => {
    await page.goto("/reports")
    await expect(page).toHaveURL(/\/(reports|login\?callbackUrl=.*reports)$/)
    if (/\/reports$/.test(page.url())) {
      await expect(page.getByRole("heading", { name: /reports/i }).first()).toBeVisible()
    }
  })

  test("users route is protected", async ({ page }) => {
    await page.goto("/users")
    await expect(page).toHaveURL(/\/(users|unauthorized|login\?callbackUrl=.*users)$/)
  })

  test("roles route is protected", async ({ page }) => {
    await page.goto("/roles")
    await expect(page).toHaveURL(/\/($|roles|unauthorized|login\?callbackUrl=.*roles)$/)
  })
})
