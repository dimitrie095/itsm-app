import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { checkApiAuth } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    // Check authentication and permission to view knowledge
    const authResult = await checkApiAuth(request, undefined, ['knowledge.view'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { user } = authResult
    
    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const category = url.searchParams.get('category')
    const publishedOnly = url.searchParams.get('published') !== 'false'
    
    // Build where clause
    const whereClause: any = {}
    
    if (category) {
      whereClause.category = category
    }
    
    if (publishedOnly) {
      whereClause.isPublished = true
    }
    
    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: whereClause,
      take: Math.min(limit, 100),
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    
    return NextResponse.json({ 
      articles,
      userRole: user.role,
      total: articles.length
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication and permission to create knowledge articles
    const authResult = await checkApiAuth(request, undefined, ['knowledge.create'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { user } = authResult
    const body = await request.json()
    
    // Validate required fields
    if (!body.title || !body.content || !body.category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      )
    }
    
    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        tags: JSON.stringify(body.tags || []),
        isPublished: body.isPublished || false,
        authorId: user.id
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    
    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error("POST /api/knowledge error:", error)
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 })
  }
}