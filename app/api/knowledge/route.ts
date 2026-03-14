import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}