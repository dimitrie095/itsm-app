"use server"

import { revalidatePath } from 'next/cache'
import { generateWithDefaultLLM } from '@/lib/services/llm-service'
import { markdownToHtml } from '@/lib/formatting'
import { sendOutlookEmail } from '@/lib/outlook-mailer'
import { requireServerActionAuth } from '@/lib/auth/server-actions'
import { prisma } from '@/lib/prisma'

const MAX_RECIPIENTS = 50
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
let hasWarnedMissingReportsStore = false
let hasAttemptedReportsStoreBootstrap = false

function isMissingReportsStoreTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; meta?: { [key: string]: unknown } }
  if (candidate.code === 'P2010') {
    const metaText = JSON.stringify(candidate.meta || {}).toLowerCase()
    return metaText.includes('42p01') || metaText.includes('reports_store') || metaText.includes('tabledoesnotexist')
  }
  return false
}

function warnMissingReportsStoreOnce() {
  if (hasWarnedMissingReportsStore) return
  hasWarnedMissingReportsStore = true
  console.warn('reports_store table not found; reports persistence is disabled until migration is applied.')
}

async function ensureReportsStoreTableExists() {
  if (hasAttemptedReportsStoreBootstrap) return
  hasAttemptedReportsStoreBootstrap = true
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "reports_store" (
      "id" TEXT PRIMARY KEY,
      "payload" JSONB NOT NULL,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function readReports() {
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT "payload"
      FROM "reports_store"
      ORDER BY "created_at" DESC
    `
    return rows
      .map((row) => {
        if (typeof row.payload === "string") {
          try {
            return JSON.parse(row.payload)
          } catch {
            return null
          }
        }
        return row.payload
      })
      .filter(Boolean)
  } catch (error) {
    if (isMissingReportsStoreTable(error)) {
      try {
        await ensureReportsStoreTableExists()
        const retryRows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
          SELECT "payload"
          FROM "reports_store"
          ORDER BY "created_at" DESC
        `
        return retryRows
          .map((row) => {
            if (typeof row.payload === "string") {
              try {
                return JSON.parse(row.payload)
              } catch {
                return null
              }
            }
            return row.payload
          })
          .filter(Boolean)
      } catch (bootstrapError) {
        warnMissingReportsStoreOnce()
        console.error('Failed to bootstrap reports_store table:', bootstrapError)
        return []
      }
    }
    console.error('Error reading reports from database:', error)
    return []
  }
}

async function getReportByIdFromStore(id: string) {
  try {
    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
      SELECT "payload"
      FROM "reports_store"
      WHERE "id" = ${id}
      LIMIT 1
    `
    const payload = rows[0]?.payload
    if (!payload) return null
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload)
      } catch {
        return null
      }
    }
    return payload
  } catch (error) {
    if (isMissingReportsStoreTable(error)) {
      try {
        await ensureReportsStoreTableExists()
        const retryRows = await prisma.$queryRaw<Array<{ payload: unknown }>>`
          SELECT "payload"
          FROM "reports_store"
          WHERE "id" = ${id}
          LIMIT 1
        `
        const retryPayload = retryRows[0]?.payload
        if (!retryPayload) return null
        if (typeof retryPayload === "string") {
          try {
            return JSON.parse(retryPayload)
          } catch {
            return null
          }
        }
        return retryPayload
      } catch (bootstrapError) {
        warnMissingReportsStoreOnce()
        console.error('Failed to bootstrap reports_store table:', bootstrapError)
        return null
      }
    }
    console.error('Error reading report by id from database:', error)
    return null
  }
}

async function upsertReportToStore(report: any) {
  const reportId = String(report?.id || "").trim()
  if (!reportId) {
    throw new Error('Invalid report id')
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO "reports_store" ("id", "payload", "updated_at")
      VALUES (${reportId}, ${JSON.stringify(report)}::jsonb, NOW())
      ON CONFLICT ("id")
      DO UPDATE SET "payload" = EXCLUDED."payload", "updated_at" = NOW()
    `
  } catch (error) {
    if (isMissingReportsStoreTable(error)) {
      try {
        await ensureReportsStoreTableExists()
        await prisma.$executeRaw`
          INSERT INTO "reports_store" ("id", "payload", "updated_at")
          VALUES (${reportId}, ${JSON.stringify(report)}::jsonb, NOW())
          ON CONFLICT ("id")
          DO UPDATE SET "payload" = EXCLUDED."payload", "updated_at" = NOW()
        `
        return
      } catch (bootstrapError) {
        warnMissingReportsStoreOnce()
        console.error('Failed to bootstrap reports_store table:', bootstrapError)
        throw new Error('Reports table is missing. Please run database migrations.')
      }
    }
    console.error('Error upserting report to database:', error)
    throw new Error('Failed to persist report')
  }
}

// Report-Typen und ihre Beschreibungen
const reportTypes = {
  weekly: {
    name: 'Weekly Summary',
    description: 'Weekly ticket and performance summary report'
  },
  monthly: {
    name: 'Monthly Performance', 
    description: 'Monthly performance and SLA report'
  },
  sla: {
    name: 'SLA Compliance',
    description: 'Detailed SLA compliance analysis report'
  },
  ticket: {
    name: 'Ticket Analysis',
    description: 'Ticket trends and category breakdown report'
  },
  agent: {
    name: 'Agent Performance',
    description: 'Agent productivity and metrics report'
  }
}

// Dashboard-Daten für Report-Generierung
// Helper function to transform ticket data
function transformTicketForReport(ticket: any) {
  // Map priority to lowercase for compatibility
  const priority = ticket.priority.toLowerCase()
  
  // Map status to have first letter capitalized
  const status = ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()
  
  // Get category or default
  const category = ticket.category || 'Other'
  
  return {
    id: ticket.id,
    title: ticket.title,
    priority,
    status,
    category,
    createdAt: ticket.createdAt.toISOString(),
    // Keep original for reference
    _original: ticket
  }
}

// Helper function to calculate ticket metrics
function calculateTicketMetrics(dbTickets: any[]) {
  const openTickets = dbTickets.filter(ticket => 
    ticket.status === 'NEW' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS'
  ).length
  
  const resolvedTickets = dbTickets.filter(ticket => 
    ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  ).length
  
  return { openTickets, resolvedTickets }
}

// Helper function to calculate distribution
function calculateDistribution(items: any[], key: string, defaultValue = 'Other') {
  return items.reduce((acc: any, item: any) => {
    const value = item[key]?.toLowerCase() || defaultValue
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

// Helper function to get top categories
function getTopCategories(distribution: any, limit = 5) {
  return Object.entries(distribution)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, limit)
    .map(([category, count]: any) => ({ category, count }))
}

// Helper function to get recent tickets
function getRecentTickets(tickets: any[], limit = 10) {
  return tickets.slice(0, limit).map((ticket: any) => ({
    id: ticket.id,
    title: ticket.title,
    priority: ticket.priority,
    status: ticket.status,
    category: ticket.category,
    createdAt: ticket.createdAt
  }))
}

// Main function - refactored into smaller parts
async function getDashboardDataForReport() {
  try {
    const [totalTickets, openTickets, resolvedTickets, totalArticles, recentTicketRows, topCategoryGroups, priorityGroups] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({
        where: {
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      prisma.ticket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.knowledgeBaseArticle.count({
        where: { isPublished: true },
      }),
      prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          category: true,
          createdAt: true,
        },
      }),
      prisma.ticket.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
    ])

    const categoryDistribution: Record<string, number> = {}
    for (const row of topCategoryGroups) {
      const key = (row.category || 'Other').toLowerCase()
      categoryDistribution[key] = (categoryDistribution[key] || 0) + row._count._all
    }

    const priorityDistribution: Record<string, number> = {}
    for (const row of priorityGroups) {
      const key = String(row.priority || 'MEDIUM').toLowerCase()
      priorityDistribution[key] = (priorityDistribution[key] || 0) + row._count._all
    }

    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }))

    const recentTickets = recentTicketRows.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      priority: String(ticket.priority).toLowerCase(),
      status: String(ticket.status).charAt(0) + String(ticket.status).slice(1).toLowerCase(),
      category: ticket.category || 'Other',
      createdAt: ticket.createdAt,
    }))

    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0
    
    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      resolutionRate,
      totalArticles,
      categoryDistribution,
      priorityDistribution,
      topCategories,
      recentTickets
    }
  } catch (error) {
    console.error('Error getting dashboard data for report:', error)
    // Fallback-Daten
    return getFallbackDashboardData()
  }
}

// Helper function for fallback data
function getFallbackDashboardData() {
  return {
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    resolutionRate: 0,
    totalArticles: 0,
    categoryDistribution: {},
    priorityDistribution: {},
    topCategories: [],
    recentTickets: []
  }
}

// Hauptfunktionen
export async function getReports() {
  await requireServerActionAuth({ permissions: ["reports.view"] })
  const reports = await readReports()
  // Sortiere nach Datum (neueste zuerst)
  return reports.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getReportById(id: string) {
  await requireServerActionAuth({ permissions: ["reports.view"] })
  return getReportByIdFromStore(id)
}

export async function getReportRecipientOptions() {
  await requireServerActionAuth({ permissions: ["reports.view"] })
  try {
    const { prisma } = await import('@/lib/prisma')
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
      take: 300,
    })

    const options = users
      .filter((u) => !!u.email)
      .map((u) => ({
        email: u.email,
        label: u.name || u.email,
      }))

    return { success: true, options }
  } catch (error) {
    console.error('Error loading report recipient options:', error)
    return { success: false, options: [] as Array<{ email: string; label: string }> }
  }
}

export async function generateReportSummary(reportId: string): Promise<{ success: boolean; summary?: string; error?: string }> {
  await requireServerActionAuth({ permissions: ["reports.create"] })
  try {
    const report = await getReportByIdFromStore(reportId);
    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    // Check if LLM is configured
    const { isLlmConfigured } = await import('@/lib/services/llm-service');
    const isConfigured = await isLlmConfigured();
    if (!isConfigured) {
      return { success: false, error: 'No LLM configuration found. Please configure an LLM in Settings.' };
    }

    // Prepare prompt based on report data
    const reportData = report.data;
    const prompt = `Please provide a concise summary (in German) of the following report data:

Report Type: ${report.type}
Report Name: ${report.name}
Generated: ${report.metadata?.generatedAt}

Key Metrics:
- Total Tickets: ${reportData?.totalTickets || 'N/A'}
- Open Tickets: ${reportData?.openTickets || 'N/A'}
- Resolved Tickets: ${reportData?.resolvedTickets || 'N/A'}
- Resolution Rate: ${reportData?.resolutionRate || 'N/A'}%
- Average Resolution Time: ${reportData?.averageResolutionTime || 'N/A'} days
- SLA Compliance: ${reportData?.slaCompliance || 'N/A'}%

Top Categories: ${reportData?.topCategories?.map((c: any) => c.category + ' (' + c.count + ')').join(', ') || 'N/A'}

Please provide a brief summary highlighting key insights, trends, and recommendations.`;

    const systemPrompt = 'You are a helpful ITSM analyst. Summarize report data in clear, concise German. Focus on key insights and actionable recommendations.';

    const response = await generateWithDefaultLLM(prompt, systemPrompt, { temperature: 0.7, maxTokens: 500 });

    // Update report with summary
    report.summary = response.content;
    report.updatedAt = new Date().toISOString();
    await upsertReportToStore(report);
    revalidatePath(`/reports/${reportId}`);

    return { success: true, summary: response.content };
  } catch (error: any) {
    console.error('Error generating report summary:', error);
    return { success: false, error: error.message || 'Failed to generate summary' };
  }
}

export async function updateReportSummary(reportId: string, summary: string) {
  await requireServerActionAuth({ permissions: ["reports.create"] })
  try {
    const report = await getReportByIdFromStore(reportId)
    if (!report) {
      return { success: false, error: 'Report not found' }
    }

    report.summary = String(summary || '').trim()
    report.updatedAt = new Date().toISOString()
    await upsertReportToStore(report)
    revalidatePath(`/reports/${reportId}`)

    return { success: true, summary: report.summary }
  } catch (error: any) {
    console.error('Error updating report summary:', error)
    return { success: false, error: error.message || 'Failed to update summary' }
  }
}

export async function generateReport(data: {
  type: keyof typeof reportTypes
  name?: string
  format: 'pdf' | 'html' | 'json'
  emailRecipients?: string[]
  dateRange?: {
    start: string
    end: string
  }
}) {
  await requireServerActionAuth({ permissions: ["reports.create"] })
  // Validierung
  if (!reportTypes[data.type]) {
    throw new Error(`Invalid report type: ${data.type}`)
  }

  // Report-ID generieren
  const { randomUUID } = await import('crypto')
  const id = randomUUID()
  
  // Report-Name generieren falls nicht angegeben
  const reportName = data.name || `${reportTypes[data.type].name} - ${new Date().toLocaleDateString()}`
  
  // Daten für Report sammeln
  const dashboardData = await getDashboardDataForReport()
  
  // Report-Objekt erstellen
  const report = {
    id,
    name: reportName,
    type: data.type,
    format: data.format,
    status: 'generated',
    description: reportTypes[data.type].description,
    data: dashboardData,
    metadata: {
      generatedAt: new Date().toISOString(),
      generatedBy: 'system',
      dateRange: data.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Letzte 30 Tage
        end: new Date().toISOString()
      },
      emailRecipients: data.emailRecipients || []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // Report speichern
  await upsertReportToStore(report)
  
  // Cache revalidieren
  revalidatePath('/reports')

  // Try to generate AI summary (non-blocking)
  try {
    // Use setTimeout to avoid blocking the response
    setTimeout(async () => {
      try {
        await generateReportSummary(id);
      } catch (error) {
        console.error('Failed to generate AI summary:', error);
      }
    }, 0);
  } catch (error) {
    console.error('Could not start AI summary generation:', error);
  }
  
  return report
}

export async function deleteReport(id: string) {
  await requireServerActionAuth({ permissions: ["reports.export"] })
  const existing = await getReportByIdFromStore(id)
  if (!existing) throw new Error('Report not found')

  try {
    await prisma.$executeRaw`DELETE FROM "reports_store" WHERE "id" = ${id}`
  } catch (error) {
    if (isMissingReportsStoreTable(error)) {
      try {
        await ensureReportsStoreTableExists()
        await prisma.$executeRaw`DELETE FROM "reports_store" WHERE "id" = ${id}`
      } catch (bootstrapError) {
        warnMissingReportsStoreOnce()
        console.error('Failed to bootstrap reports_store table:', bootstrapError)
        throw new Error('Reports table is missing. Please run database migrations.')
      }
    } else {
      throw error
    }
  }
  revalidatePath('/reports')
  
  return true
}

export async function sendReport(id: string, recipients: string[]) {
  await requireServerActionAuth({ permissions: ["reports.export"] })
  return sendReportEmail({
    id,
    recipients,
    includeAttachment: true,
  })
}

export async function generateReportEmailContent(
  id: string,
  customInstructions?: string
): Promise<{ success: boolean; subject?: string; message?: string; error?: string }> {
  await requireServerActionAuth({ permissions: ["reports.create"] })
  const report = await getReportByIdFromStore(id)
  
  if (!report) {
    return { success: false, error: 'Report not found' }
  }

  try {
    const prompt = `Generate a concise email subject and body for sending the following ITSM report.

Report Name: ${report.name}
Report Type: ${report.type}
Generated: ${report.createdAt}
Key Metrics:
- Total Tickets: ${report.data?.totalTickets ?? 0}
- Open Tickets: ${report.data?.openTickets ?? 0}
- Resolved Tickets: ${report.data?.resolvedTickets ?? 0}
- Resolution Rate: ${report.data?.resolutionRate ?? 0}%

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Return strict JSON with keys "subject" and "message". Message should be professional and ready to send.`

    const response = await generateWithDefaultLLM(
      prompt,
      'You are an ITSM reporting assistant. Return only valid JSON with subject and message.'
    )

    const raw = response.content.trim()
    const jsonBlockMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonBlockMatch ? jsonBlockMatch[0] : raw)
    const subject = String(parsed.subject || '').trim()
    const message = String(parsed.message || '').trim()

    if (!subject || !message) {
      throw new Error('AI response missing subject or message')
    }

    return { success: true, subject, message }
  } catch (error: any) {
    console.error('Error generating report email content:', error)
    return { success: false, error: error.message || 'Failed to generate email content' }
  }
}

export async function sendReportEmail(data: {
  id: string
  recipients: string[]
  subject?: string
  message?: string
  includeAttachment?: boolean
}) {
  await requireServerActionAuth({ permissions: ["reports.export"] })
  const report = await getReportByIdFromStore(data.id)
  
  if (!report) {
    throw new Error('Report not found')
  }

  const recipients = data.recipients.map((email) => email.trim()).filter(Boolean)
  if (recipients.length === 0) {
    throw new Error('Please provide at least one valid recipient')
  }
  if (recipients.length > MAX_RECIPIENTS) {
    throw new Error(`Too many recipients. Max allowed is ${MAX_RECIPIENTS}`)
  }

  const subject = data.subject?.trim() || `ITSM Report: ${report.name}`
  const manualMessage = data.message?.trim()
  const messageBody = manualMessage || `Please find attached the report "${report.name}".`

  let attachment: { filename: string; content: Buffer; contentType: string } | null = null
  if (data.includeAttachment !== false) {
    const downloadable = await downloadReport(data.id)
    const contentBuffer =
      typeof downloadable.content === 'string'
        ? Buffer.from(downloadable.content, 'utf-8')
        : downloadable.content

    attachment = {
      filename: downloadable.filename,
      content: contentBuffer,
      contentType: downloadable.contentType,
    }
    if (attachment.content.length > MAX_ATTACHMENT_BYTES) {
      throw new Error("Attachment too large to send by email")
    }
  }

  for (const recipient of recipients) {
    const safeSubject = escapeHtml(subject)
    const safeBody = escapeHtml(messageBody).replace(/\n/g, "<br/>")
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>${safeSubject}</h2>
        <p>${safeBody}</p>
      </div>
    `

    const sendResult = await sendOutlookEmail({
      to: recipient,
      subject,
      html,
      attachments: attachment
        ? [
            {
              filename: attachment.filename,
              content: attachment.content,
              contentType: attachment.contentType,
            },
          ]
        : undefined,
    })

    if (!sendResult.sent) {
      throw new Error('Outlook SMTP is not configured. Please configure it in Settings.')
    }
  }

  report.metadata.sentAt = new Date().toISOString()
  report.metadata.emailRecipients = recipients
  report.metadata.lastEmailSubject = subject
  report.updatedAt = new Date().toISOString()
  await upsertReportToStore(report)
  revalidatePath('/reports')
  revalidatePath(`/reports/${data.id}`)
  
  return {
    success: true,
    message: `Report sent to ${recipients.join(', ')}`,
    recipients,
  }
}

export async function downloadReport(id: string) {
  await requireServerActionAuth({ permissions: ["reports.export"] })
  const report = await getReportByIdFromStore(id)
  
  if (!report) {
    throw new Error('Report not found')
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  let filename = `${report.type}_report_${timestamp}.${report.format}`
  
  let content: string | Buffer = ''
  let contentType = 'application/json'
  
  switch (report.format) {
    case 'json':
      content = JSON.stringify(report, null, 2)
      contentType = 'application/json'
      break
    case 'html':
      content = generateHTMLReport(report)
      contentType = 'text/html'
      break
    case 'pdf':
      try {
        // Generate PDF using the PDFReport component
        const { renderToStream } = await import('@react-pdf/renderer')
        const React = await import('react')
        const { PDFReport } = await import('@/components/pdf-report')
        
        // Create PDF component using React.createElement
        const pdfComponent = React.createElement(PDFReport, { report })
        
        const pdfStream = await renderToStream(pdfComponent as any)
        
        // Convert stream to buffer
        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = []
          pdfStream.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          })
          pdfStream.on('end', () => {
            resolve(Buffer.concat(chunks))
          })
          pdfStream.on('error', reject)
        })
        
        content = pdfBuffer
        contentType = 'application/pdf'
      } catch (pdfError) {
        console.error('Failed to generate PDF, falling back to HTML:', pdfError)
        // Fallback to HTML if PDF generation fails
        content = generateHTMLReport(report)
        contentType = 'text/html'
        // Change filename to .html for clarity
        filename = `${report.type}_report_${timestamp}.html`
      }
      break
  }
  
  return {
    filename,
    content,
    contentType,
    report
  }
}

// HTML-Report-Generierung (vereinfacht)
function generateHTMLReport(report: any) {
  const css = getReportCSS()
  const header = generateReportHeader(report)
  const summary = generateExecutiveSummary(report)
  const aiSummary = generateAISummarySection(report)
  const topCategories = generateTopCategoriesSection(report)
  const recentTickets = generateRecentTicketsSection(report)
  const footer = generateReportFooter(report)
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${report.name}</title>
    <style>${css}</style>
</head>
<body>
    ${header}
    ${summary}
    ${aiSummary}
    ${topCategories}
    ${recentTickets}
    ${footer}
</body>
</html>
  `
}

// Helper functions for HTML report generation
function getReportCSS() {
  return `
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #333; }
    .header .meta { color: #666; font-size: 14px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #444; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .stat-card { background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .stat-card .label { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
  `
}

function generateReportHeader(report: any) {
  return `
    <div class="header">
        <h1>${report.name}</h1>
        <div class="meta">
            Generated on ${new Date(report.createdAt).toLocaleDateString()} | 
            Type: ${report.type} | Format: ${report.format.toUpperCase()}
        </div>
    </div>
  `
}

function generateExecutiveSummary(report: any) {
  return `
    <div class="section">
        <h2>Executive Summary</h2>
        <div class="stats">
            <div class="stat-card">
                <div class="value">${report.data.totalTickets}</div>
                <div class="label">Total Tickets</div>
            </div>
            <div class="stat-card">
                <div class="value">${report.data.openTickets}</div>
                <div class="label">Open Tickets</div>
            </div>
            <div class="stat-card">
                <div class="value">${report.data.resolutionRate}%</div>
                <div class="label">Resolution Rate</div>
            </div>
            <div class="stat-card">
                <div class="value">${report.data.totalArticles}</div>
                <div class="label">Knowledge Articles</div>
            </div>
        </div>
    </div>
  `
}

function generateAISummarySection(report: any) {
  if (!report.summary) return ''
  const formattedSummary = markdownToHtml(report.summary)
  return `
    <div class="section">
        <h2>Report Summary</h2>
        <div class="ai-summary" style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="margin: 0;">${formattedSummary}</div>
        </div>
    </div>
  `
}

function generateTopCategoriesSection(report: any) {
  if (report.data.topCategories.length === 0) return ''
  
  const rows = report.data.topCategories.map((cat: any) => `
    <tr>
        <td>${cat.category}</td>
        <td>${cat.count}</td>
    </tr>
  `).join('')
  
  return `
    <div class="section">
        <h2>Top Categories</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Ticket Count</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </div>
  `
}

function generateRecentTicketsSection(report: any) {
  if (report.data.recentTickets.length === 0) return ''
  
  const rows = report.data.recentTickets.map((ticket: any) => `
    <tr>
        <td style="width: 15%; word-wrap: break-word;">${ticket.id}</td>
        <td style="width: 35%; word-wrap: break-word;">${ticket.title}</td>
        <td style="width: 15%;">${ticket.priority}</td>
        <td style="width: 15%;">${ticket.status}</td>
        <td style="width: 20%;">${ticket.category || 'N/A'}</td>
    </tr>
  `).join('')
  
  return `
    <div class="section">
        <h2>Recent Tickets</h2>
        <table style="table-layout: fixed; width: 100%;">
            <thead>
                <tr>
                    <th style="width: 15%;">ID</th>
                    <th style="width: 35%;">Title</th>
                    <th style="width: 15%;">Priority</th>
                    <th style="width: 15%;">Status</th>
                    <th style="width: 20%;">Category</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </div>
  `
}

function generateReportFooter(report: any) {
  return `
    <div class="footer" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>Report generated by Ponturo ITSM Tool</p>
        <p>${report.description}</p>
    </div>
  `
}

