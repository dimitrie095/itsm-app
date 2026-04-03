import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkApiAuth } from '@/lib/api-auth-new'
import { SuggestionStatus, TargetAudience } from '@/lib/generated/prisma/enums'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and permission to view suggestions
    const authResult = await checkApiAuth(request, undefined, ['knowledge.suggestions.view'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }

    const { user } = authResult

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status') as SuggestionStatus | undefined
    const targetAudience = url.searchParams.get('audience') as TargetAudience | undefined
    const search = url.searchParams.get('search')

    // Build where clause
    const whereClause: any = {}

    if (status) {
      whereClause.status = status
    }
    if (targetAudience) {
      whereClause.targetAudience = targetAudience
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { problemSummary: { contains: search, mode: 'insensitive' } },
      ]
    }

    // For END_USER, only show suggestions targeted at END_USER? Or maybe they cannot view suggestions at all.
    // We'll rely on permission knowledge.suggestions.view which only ADMIN/AGENT have.
    // So no additional filtering.

    const suggestions = await prisma.knowledgeBaseSuggestion.findMany({
      where: whereClause,
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        reviewedBy: {
          select: { id: true, name: true, email: true }
        },
        article: {
          select: { id: true, title: true, isPublished: true }
        }
      }
    })

    return NextResponse.json({ 
      suggestions,
      total: suggestions.length
    })
  } catch (error) {
    console.error('GET /api/knowledge/suggestions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permission to create suggestions
    const authResult = await checkApiAuth(request, undefined, ['knowledge.suggestions.manage'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }

    const { user } = authResult
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.targetAudience || !body.problemSummary || !body.draftResolution) {
      return NextResponse.json(
        { error: 'Title, targetAudience, problemSummary, and draftResolution are required' },
        { status: 400 }
      )
    }

    // Validate enums
    if (!Object.values(TargetAudience).includes(body.targetAudience)) {
      return NextResponse.json(
        { error: 'Invalid targetAudience' },
        { status: 400 }
      )
    }

    const suggestion = await prisma.knowledgeBaseSuggestion.create({
      data: {
        title: body.title,
        targetAudience: body.targetAudience,
        problemSummary: body.problemSummary,
        draftResolution: body.draftResolution,
        status: SuggestionStatus.PENDING_REVIEW,
        ticketCluster: body.ticketCluster || null,
        ticketIds: body.ticketIds ? JSON.stringify(body.ticketIds) : '[]',
        complexityScore: body.complexityScore || null,
        authorId: user.id
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(suggestion, { status: 201 })
  } catch (error) {
    console.error('POST /api/knowledge/suggestions error:', error)
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication and permission to manage suggestions
    const authResult = await checkApiAuth(request, undefined, ['knowledge.suggestions.manage'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }

    const { user } = authResult
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 })
    }

    // Validate enums if provided
    if (body.targetAudience && !Object.values(TargetAudience).includes(body.targetAudience)) {
      return NextResponse.json({ error: 'Invalid targetAudience' }, { status: 400 })
    }
    if (body.status && !Object.values(SuggestionStatus).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.targetAudience !== undefined) updateData.targetAudience = body.targetAudience
    if (body.problemSummary !== undefined) updateData.problemSummary = body.problemSummary
    if (body.draftResolution !== undefined) updateData.draftResolution = body.draftResolution
    if (body.status !== undefined) {
      updateData.status = body.status
      // If status is being changed to APPROVED/REJECTED/PUBLISHED, record reviewer and timestamp
      if ([SuggestionStatus.APPROVED, SuggestionStatus.REJECTED, SuggestionStatus.PUBLISHED].includes(body.status)) {
        updateData.reviewedById = user.id
        updateData.reviewedAt = new Date()
      }
    }
    if (body.ticketCluster !== undefined) updateData.ticketCluster = body.ticketCluster
    if (body.ticketIds !== undefined) updateData.ticketIds = JSON.stringify(body.ticketIds)
    if (body.complexityScore !== undefined) updateData.complexityScore = body.complexityScore

    const suggestion = await prisma.knowledgeBaseSuggestion.update({
      where: { id: body.id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json(suggestion)
  } catch (error: any) {
    console.error('PUT /api/knowledge/suggestions error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and permission to manage suggestions
    const authResult = await checkApiAuth(request, undefined, ['knowledge.suggestions.manage'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }

    const { user } = authResult
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 })
    }

    // Check if suggestion is linked to an article (prevent deletion if published)
    const existing = await prisma.knowledgeBaseSuggestion.findUnique({
      where: { id: body.id },
      include: { article: true }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }
    if (existing.articleId) {
      return NextResponse.json(
        { error: 'Cannot delete suggestion that is already converted to an article' },
        { status: 400 }
      )
    }

    await prisma.knowledgeBaseSuggestion.delete({
      where: { id: body.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/knowledge/suggestions error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 })
  }
}