import { NextRequest, NextResponse } from 'next/server'
import { downloadReport } from '@/app/reports/actions'
import { checkApiAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permission to view reports
    const authResult = await checkApiAuth(request, undefined, ['reports.view'])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { id } = await params
    
    // Report-Download-Daten erhalten
    const result = await downloadReport(id)
    
    // Response mit den Download-Daten
    // Handle both string and Buffer content
    const responseBody = result.content instanceof Buffer 
      ? result.content 
      : result.content
    
    return new NextResponse(responseBody as any, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Error downloading report:', error)
    
    if (error instanceof Error && error.message === 'Report not found') {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to download report', details: String(error) },
      { status: 500 }
    )
  }
}