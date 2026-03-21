"use server"

import * as fs from 'fs/promises'
import * as path from 'path'

// Hilfsfunktion zum Lesen von JSON-Dateien
async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []
    }
    console.error(`Error reading ${filePath}:`, error)
    return []
  }
}

// SLA-Daten aus Datenbank lesen
async function getSLAFromDatabase() {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const dbPath = './itsm.db'
    const query = 'SELECT priority, responseTime, resolutionTime FROM slas WHERE isActive = 1 ORDER BY CASE priority WHEN "CRITICAL" THEN 1 WHEN "HIGH" THEN 2 WHEN "MEDIUM" THEN 3 WHEN "LOW" THEN 4 ELSE 5 END'
    
    const { stdout } = await execAsync(`sqlite3 "${dbPath}" "${query}"`)
    
    // Ergebnis parsen
    const lines = stdout.trim().split('\n')
    const slas = lines.map(line => {
      const [priority, responseTime, resolutionTime] = line.split('|')
      // Setze unterschiedliche Targets basierend auf Priorität
      let target = 95
      switch (priority) {
        case 'CRITICAL': target = 99; break
        case 'HIGH': target = 95; break
        case 'MEDIUM': target = 90; break
        case 'LOW': target = 85; break
      }
      return {
        priority,
        responseTime: parseInt(responseTime),
        resolutionTime: parseInt(resolutionTime),
        target
      }
    })
    
    return slas
  } catch (error) {
    console.error('Error reading SLA from database:', error)
    // Fallback: Demo SLA-Daten
    return [
      { priority: 'CRITICAL', responseTime: 60, resolutionTime: 240, target: 99 },
      { priority: 'HIGH', responseTime: 120, resolutionTime: 480, target: 95 },
      { priority: 'MEDIUM', responseTime: 240, resolutionTime: 1440, target: 90 },
      { priority: 'LOW', responseTime: 480, resolutionTime: 2880, target: 85 }
    ]
  }
}

// Berechne SLA-Compliance basierend auf Tickets
function calculateSLACompliance(tickets: any[], slas: any[]) {
  const compliance = slas.map(sla => {
    // Tickets dieser Priorität finden
    const priorityTickets = tickets.filter(ticket => 
      ticket.priority.toUpperCase() === sla.priority
    )
    
    const totalTickets = priorityTickets.length
    
    if (totalTickets === 0) {
      // Keine Tickets für diese Priorität
      return {
        level: sla.priority.charAt(0) + sla.priority.slice(1).toLowerCase(),
        target: sla.target,
        actual: null, // N/A wenn keine Tickets
        totalTickets: 0,
        compliantTickets: 0
      }
    }
    
    // Für Demo: Angenommen, Tickets sind innerhalb der SLA wenn sie "Resolved" oder "Closed" sind
    // In einer realen App würde man firstResponseAt und resolvedAt mit responseTime/resolutionTime vergleichen
    const compliantTickets = priorityTickets.filter(ticket => 
      ticket.status === 'Resolved' || ticket.status === 'Closed'
    ).length
    
    const actual = Math.round((compliantTickets / totalTickets) * 100)
    
    return {
      level: sla.priority.charAt(0) + sla.priority.slice(1).toLowerCase(),
      target: sla.target,
      actual,
      totalTickets,
      compliantTickets
    }
  })
  
  return compliance
}

// Durchschnittliche Antwortzeit berechnen
function calculateAverageResponseTime(tickets: any[]) {
  // Für Demo: Angenommene Antwortzeit basierend auf Ticket-Status
  // In einer realen App würde man firstResponseAt - createdAt berechnen
  const respondedTickets = tickets.filter(ticket => 
    ticket.status !== 'New' && ticket.status !== 'Assigned'
  )
  
  if (respondedTickets.length === 0) {
    return { average: 24, withinSLA: true } // Default für Demo
  }
  
  // Simulierte Antwortzeiten basierend auf Priorität
  let totalResponseTime = 0
  respondedTickets.forEach(ticket => {
    switch (ticket.priority.toUpperCase()) {
      case 'CRITICAL': totalResponseTime += 15; break // 15 Minuten
      case 'HIGH': totalResponseTime += 45; break // 45 Minuten
      case 'MEDIUM': totalResponseTime += 120; break // 2 Stunden
      case 'LOW': totalResponseTime += 360; break // 6 Stunden
      default: totalResponseTime += 60; break // 1 Stunde
    }
  })
  
  const average = Math.round(totalResponseTime / respondedTickets.length)
  
  // Annahme: Innerhalb der SLA wenn < 60 Minuten für alle außer Critical
  const withinSLA = average < 60 || (average < 15 && respondedTickets.some(t => t.priority === 'CRITICAL'))
  
  return { average, withinSLA }
}

// Dashboard-Daten sammeln
export async function getDashboardData() {
  // Tickets aus Datenbank lesen
  const { prisma } = await import('@/lib/prisma')
  const dbTickets = await prisma.ticket.findMany({
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
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
  
  // Transform tickets to match the expected JSON shape
  const tickets = dbTickets.map(ticket => {
    // Map priority to lowercase for compatibility
    const priority = ticket.priority.toLowerCase()
    
    // Get SLA based on priority
    const sla = getSlaForPriority(ticket.priority)
    
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category || 'other',
      priority,
      customer: ticket.user?.name || ticket.user?.email || 'Unknown',
      email: ticket.user?.email || '',
      department: ticket.user?.department || 'Unknown',
      status: ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase(), // Capitalize first letter
      assignedTo: ticket.assignedTo?.name || ticket.assignedTo?.email || 'Unassigned',
      sla,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      // Keep original database ticket for popup
      original: ticket
    }
  })
  
  // Artikel aus JSON lesen (temporarily keep JSON for articles)
  const articlesPath = path.join(process.cwd(), 'articles.json')
  const articles = await readJsonFile(articlesPath)
  
  // SLA-Daten aus Datenbank lesen
  const slas = await getSLAFromDatabase()
  
  // SLA-Compliance berechnen
  const slaCompliance = calculateSLACompliance(tickets, slas)
  
  // Durchschnittliche Antwortzeit berechnen
  const responseTime = calculateAverageResponseTime(tickets)
  
  // User-Anzahl aus Datenbank
  const userCount = await prisma.user.count()
  
  // Sortiere Tickets nach Datum (neueste zuerst) - already sorted by query
  const sortedTickets = tickets
  
  // Nur veröffentlichte Artikel
  const publishedArticles = articles.filter((article: any) => article.isPublished)
  
  // Berechnete Metriken
  const openTickets = dbTickets.filter(ticket => 
    ticket.status === 'NEW' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS'
  ).length
  
  // Assets count from database
  const managedAssets = await prisma.asset.count()
  
  return {
    tickets: sortedTickets,
    articles: publishedArticles,
    userCount,
    openTickets,
    managedAssets,
    totalArticles: publishedArticles.length,
    slaCompliance,
    averageResponseTime: responseTime.average,
    isWithinSLA: responseTime.withinSLA
  }
}

// Helper function to get SLA string based on priority
function getSlaForPriority(priority: string): string {
  switch (priority.toUpperCase()) {
    case 'CRITICAL': return '2h'
    case 'HIGH': return '24h'
    case 'MEDIUM': return '48h'
    case 'LOW': return '72h'
    default: return '72h'
  }
}