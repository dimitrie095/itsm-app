import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/middleware'
import { SuggestionStatus } from '@/lib/generated/prisma/enums'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permission to create articles and manage suggestions
    const authResult = await withAuth({ permissions: ['knowledge.create', 'knowledge.suggestions.manage'] })(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    const body = await request.json()

    if (!body.suggestionId) {
      return NextResponse.json({ error: 'suggestionId is required' }, { status: 400 })
    }

    // Fetch the suggestion
    const suggestion = await prisma.knowledgeBaseSuggestion.findUnique({
      where: { id: body.suggestionId },
      include: { article: true }
    })

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    if (suggestion.articleId) {
      return NextResponse.json({ error: 'Suggestion already converted to article' }, { status: 400 })
    }

    // Determine category (default to 'General')
    let category = 'General'
    let tags: string[] = []
    if (suggestion.ticketCluster && typeof suggestion.ticketCluster === 'object' && !Array.isArray(suggestion.ticketCluster)) {
      const cluster = suggestion.ticketCluster as Record<string, any>
      if (typeof cluster.category === 'string') category = cluster.category
      if (Array.isArray(cluster.commonKeywords)) tags = cluster.commonKeywords.filter((k): k is string => typeof k === 'string')
    }
    const publish = body.publish === true

    // Create the article
    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title: suggestion.title,
        content: suggestion.draftResolution,
        category,
        tags: JSON.stringify(tags),
        isPublished: publish, // respect publish parameter
        authorId: user!.id
      }
    })

    // Update suggestion with article reference and mark as PUBLISHED
    const updatedSuggestion = await prisma.knowledgeBaseSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: SuggestionStatus.PUBLISHED,
        articleId: article.id,
        reviewedById: user!.id,
        reviewedAt: new Date()
      },
      include: {
        article: true,
        reviewedBy: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({
      success: true,
      article,
      suggestion: updatedSuggestion
    })
  } catch (error) {
    console.error('POST /api/knowledge/suggestions/convert error:', error)
    return NextResponse.json({ 
      error: 'Failed to convert suggestion to article',
    }, { status: 500 })
  }
}