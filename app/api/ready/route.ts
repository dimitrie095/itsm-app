import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const REQUIRED_ENV_VARS = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const

function getMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key]
    return typeof value !== "string" || value.trim().length === 0
  })
}

export async function GET() {
  const missingEnv = getMissingEnvVars()
  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        ready: false,
        reason: "missing_environment_variables",
        missing: missingEnv,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      {
        ready: true,
        checks: {
          database: "ok",
          environment: "ok",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        ready: false,
        reason: "database_unreachable",
        checks: {
          database: "failed",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
