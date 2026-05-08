import { describe, it, expect, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const getTokenMock = jest.fn();

jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
}));

function collectFiles(dir: string, acc: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue;
      collectFiles(fullPath, acc);
      continue;
    }
    acc.push(fullPath);
  }
  return acc;
}

describe("Penetration Security Checks", () => {
  it("enforces fail-closed redirect for unauthenticated protected routes", async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/reports");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("callbackUrl=%2Freports");
  });

  it("allows unauthenticated access to public login route", async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const { middleware } = await import("@/middleware");

    const request = new NextRequest("http://localhost:3000/login");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("does not use unsafe raw SQL primitives in app runtime", () => {
    const workspace = process.cwd();
    const appFiles = collectFiles(path.join(workspace, "app"))
      .concat(collectFiles(path.join(workspace, "lib")))
      .filter((file) => (file.endsWith(".ts") || file.endsWith(".tsx")) && !file.includes(`${path.sep}lib${path.sep}generated${path.sep}`));

    const offenders: string[] = [];
    for (const file of appFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes("$executeRawUnsafe") || content.includes("$queryRawUnsafe")) {
        offenders.push(path.relative(workspace, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("does not leak raw error details in API 500 handlers", () => {
    const workspace = process.cwd();
    const apiFiles = collectFiles(path.join(workspace, "app", "api")).filter((file) =>
      file.endsWith(".ts")
    );

    const leakPatterns = [
      "details: String(error)",
      "details: error instanceof Error ? error.message : String(error)",
      "stack: error instanceof Error ? error.stack : undefined",
    ];

    const offenders: string[] = [];
    for (const file of apiFiles) {
      const content = fs.readFileSync(file, "utf8");
      if (leakPatterns.some((pattern) => content.includes(pattern))) {
        offenders.push(path.relative(workspace, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});
