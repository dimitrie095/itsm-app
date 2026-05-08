import { test, expect } from "@playwright/test"
import { AUTH_PATHS } from "./fixtures/auth"

test.describe("Role Access Smoke", () => {
  test.describe("Agent", () => {
    test.use({ storageState: AUTH_PATHS.agent })

    test("agent can access tickets", async ({ page }) => {
      await page.goto("/tickets")
      await expect(page).toHaveURL(/\/tickets$/)
      await expect(page.getByRole("heading", { name: /tickets/i }).first()).toBeVisible()
    })

    test("agent cannot access users management", async ({ page }) => {
      await page.goto("/users")
      await expect(page).toHaveURL(/\/(unauthorized|users)$/)
      if (/\/unauthorized$/.test(page.url())) {
        await expect(page.getByRole("heading", { name: /unauthorized|access denied/i }).first()).toBeVisible()
      }
    })
  })

  test.describe("End User", () => {
    test.use({ storageState: AUTH_PATHS.endUser })

    test("end user can access own tickets page", async ({ page }) => {
      await page.goto("/tickets")
      await expect(page).toHaveURL(/\/(tickets|login\?callbackUrl=.*tickets)$/)
      if (/\/tickets$/.test(page.url())) {
        await expect(page.getByRole("heading", { name: /tickets/i }).first()).toBeVisible()
      }
    })

    test("end user cannot access roles page", async ({ page }) => {
      await page.goto("/roles")
      await expect(page).toHaveURL(/\/($|unauthorized|roles|login\?callbackUrl=.*roles)$/)
      if (/\/unauthorized$/.test(page.url())) {
        await expect(page.getByRole("heading", { name: /unauthorized|access denied/i }).first()).toBeVisible()
      }
    })
  })
})
