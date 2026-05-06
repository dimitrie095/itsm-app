"use server"

import * as fs from 'fs/promises'
import * as path from 'path'
import { revalidatePath } from 'next/cache'
import { generateWithDefaultLLM } from '@/lib/services/llm-service'
import { markdownToHtml } from '@/lib/formatting'

const reportsFilePath = path.join(process.cwd(), 'reports.json')

// Hilfsfunktion zum Lesen von Reports
async function readReports() {
  try {
    const data = await fs.readFile(reportsFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Datei existiert nicht, leeres Array zurückgeben
      return []
    }
    console.error('Error reading reports:', error)
    return []
  }
}

// Hilfsfunktion zum Schreiben von Reports
async function writeReports(reports: any[]) {
  await fs.writeFile(reportsFilePath, JSON.stringify(reports, null, 2), 'utf-8')
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
    // Tickets und Artikel aus Datenbank lesen
    const { prisma } = await import('@/lib/prisma')
    
    // Fetch tickets from database
    const dbTickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Fetch published articles from database
    const dbArticles = await prisma.knowledgeBaseArticle.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    })
    
    // Transform tickets to match expected shape
    const tickets = dbTickets.map(transformTicketForReport)
    
    // Calculate metrics
    const { openTickets, resolvedTickets } = calculateTicketMetrics(dbTickets)
    
    // Calculate distributions
    const categoryDistribution = calculateDistribution(tickets, 'category', 'Other')
    const priorityDistribution = calculateDistribution(tickets, 'priority', 'medium')
    
    // Get top categories
    const topCategories = getTopCategories(categoryDistribution)
    
    // Get recent tickets
    const recentTickets = getRecentTickets(tickets)
    
    // Calculate resolution rate
    const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 100) : 0
    
    return {
      totalTickets: tickets.length,
      openTickets,
      resolvedTickets,
      resolutionRate,
      totalArticles: dbArticles.length,
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
  const reports = await readReports()
  // Sortiere nach Datum (neueste zuerst)
  return reports.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getReportById(id: string) {
  const reports = await readReports()
  return reports.find((report: any) => report.id === id)
}

export async function generateReportSummary(reportId: string): Promise<{ success: boolean; summary?: string; error?: string }> {
  try {
    const reports = await readReports();
    const report = reports.find((r: any) => r.id === reportId);
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
    await writeReports(reports);
    revalidatePath(`/reports/${reportId}`);

    return { success: true, summary: response.content };
  } catch (error: any) {
    console.error('Error generating report summary:', error);
    return { success: false, error: error.message || 'Failed to generate summary' };
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
  const reports = await readReports()
  reports.push(report)
  await writeReports(reports)
  
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
  const reports = await readReports()
  const filteredReports = reports.filter((report: any) => report.id !== id)
  
  if (filteredReports.length === reports.length) {
    throw new Error('Report not found')
  }
  
  await writeReports(filteredReports)
  revalidatePath('/reports')
  
  return true
}

export async function sendReport(id: string, recipients: string[]) {
  const reports = await readReports()
  const report = reports.find((r: any) => r.id === id)
  
  if (!report) {
    throw new Error('Report not found')
  }
  
  // Hier würde die E-Mail-Sendelogik implementiert werden
  // Für Demo: nur Status aktualisieren
  report.metadata.sentAt = new Date().toISOString()
  report.metadata.emailRecipients = recipients
  
  await writeReports(reports)
  revalidatePath('/reports')
  
  return {
    success: true,
    message: `Report sent to ${recipients.join(', ')}`,
    recipients
  }
}

export async function downloadReport(id: string) {
  const reports = await readReports()
  const report = reports.find((r: any) => r.id === id)
  
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
        
        console.log('Starting PDF generation for report:', report.id)
        
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
        
        console.log('PDF generation successful, buffer size:', pdfBuffer.length)
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
        <h2>AI Summary</h2>
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

