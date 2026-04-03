import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'
import { analyzeTicketsAndGenerateSuggestions } from '@/lib/services/ticket-analysis'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permission to generate suggestions
    const authResult = await checkApiAuth(request, undefined, ['knowledge.suggestions.generate'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Optional limit parameter
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 200

    // Generate suggestions
    const suggestions = await analyzeTicketsAndGenerateSuggestions(user.id)

    return NextResponse.json({
      success: true,
      generated: suggestions.length,
      suggestions
    })
  } catch (error) {
    console.error('POST /api/knowledge/suggestions/generate error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}