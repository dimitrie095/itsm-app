"use server"

import fs from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'

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
    
    // Transform tickets to match expected shape (similar to JSON)
    const tickets = dbTickets.map(ticket => {
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
    })
    
    // Metriken berechnen
    const openTickets = dbTickets.filter(ticket => 
      ticket.status === 'NEW' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS'
    ).length
    
    const resolvedTickets = dbTickets.filter(ticket => 
      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
    ).length
    
    // Kategorie-Verteilung
    const categoryDistribution = tickets.reduce((acc: any, ticket: any) => {
      const category = ticket.category || 'Other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
    
    // Prioritäts-Verteilung
    const priorityDistribution = tickets.reduce((acc: any, ticket: any) => {
      const priority = ticket.priority?.toLowerCase() || 'medium'
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    }, {})
    
    // Top-Kategorien
    const topCategories = Object.entries(categoryDistribution)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([category, count]: any) => ({ category, count }))
    
    return {
      totalTickets: tickets.length,
      openTickets,
      resolvedTickets,
      resolutionRate: tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 100) : 0,
      totalArticles: dbArticles.length,
      categoryDistribution,
      priorityDistribution,
      topCategories,
      recentTickets: tickets.slice(0, 10).map((ticket: any) => ({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.category,
        createdAt: ticket.createdAt
      }))
    }
  } catch (error) {
    console.error('Error getting dashboard data for report:', error)
    // Fallback-Daten
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
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${report.name}</title>
    <style>
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
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.name}</h1>
        <div class="meta">
            Generated on ${new Date(report.createdAt).toLocaleDateString()} | 
            Type: ${report.type} | Format: ${report.format.toUpperCase()}
        </div>
    </div>
    
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
    
    ${report.data.topCategories.length > 0 ? `
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
                ${report.data.topCategories.map((cat: any) => `
                <tr>
                    <td>${cat.category}</td>
                    <td>${cat.count}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    ${report.data.recentTickets.length > 0 ? `
    <div class="section">
        <h2>Recent Tickets</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                ${report.data.recentTickets.map((ticket: any) => `
                <tr>
                    <td>${ticket.id}</td>
                    <td>${ticket.title}</td>
                    <td>${ticket.priority}</td>
                    <td>${ticket.status}</td>
                    <td>${ticket.category || 'N/A'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}
    
    <div class="footer" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>Report generated by ITSM Portal</p>
        <p>${report.description}</p>
    </div>
</body>
</html>
  `
}