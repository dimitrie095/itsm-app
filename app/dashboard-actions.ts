"use server"

import { computeSlaSnapshot } from "@/lib/sla"
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return Math.round(((current - previous) / previous) * 100)
}




// SLA-Daten aus Datenbank lesen
async function getSLAFromDatabase() {
  try {
    const { prisma } = await import('@/lib/prisma')
    
    // Query SLAs from database using Prisma
    const slas = await prisma.sLA.findMany({
      where: { isActive: true },
      select: {
        priority: true,
        responseTime: true,
        resolutionTime: true
      },
      orderBy: [
        {
          priority: 'asc' // Priority enum order: CRITICAL, HIGH, MEDIUM, LOW
        }
      ]
    })
    
    // Map to expected format with targets
    return slas.map(sla => {
      let target = 95
      switch (sla.priority) {
        case 'CRITICAL': target = 99; break
        case 'HIGH': target = 95; break
        case 'MEDIUM': target = 90; break
        case 'LOW': target = 85; break
      }
      return {
        priority: sla.priority,
        responseTime: sla.responseTime,
        resolutionTime: sla.resolutionTime,
        target
      }
    })
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
    
    const compliantTickets = priorityTickets.filter(ticket => {
      const snapshot = computeSlaSnapshot({
        createdAt: new Date(ticket.createdAt),
        firstResponseAt: ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : null,
        resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
        status: ticket.rawStatus,
        priority: ticket.rawPriority,
        policy: {
          responseTime: sla.responseTime,
          resolutionTime: sla.resolutionTime,
        },
      })
      return snapshot.responseState !== "breached" && snapshot.resolutionState !== "breached"
    }).length
    
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
function calculateAverageResponseTime(tickets: any[], slas: any[]) {
  const respondedTickets = tickets.filter(ticket => ticket.firstResponseAt)

  if (respondedTickets.length === 0) {
    return { average: 0, withinSLA: true }
  }

  const totalResponseTime = respondedTickets.reduce((sum, ticket) => {
    const created = new Date(ticket.createdAt).getTime()
    const firstResponse = new Date(ticket.firstResponseAt).getTime()
    return sum + Math.max(0, Math.round((firstResponse - created) / 60000))
  }, 0)

  const average = Math.round(totalResponseTime / respondedTickets.length)
  const defaultMediumSla = slas.find((s) => s.priority === "MEDIUM")?.responseTime ?? 240
  const withinSLA = average <= defaultMediumSla

  return { average, withinSLA }
}

// Dashboard-Daten sammeln
export async function getDashboardData() {
  // Skip database queries during build
  if (process.env.IS_BUILD || process.env.SKIP_DB_INIT) {
    return {
      tickets: [],
      articles: [],
      userCount: 0,
      openTickets: 0,
      openTicketsChangePct: 0,
      managedAssets: 0,
      managedAssetsChangePct: 0,
      activeUsersChangePct: 0,
      totalArticles: 0,
      totalArticlesChangePct: 0,
      slaCompliance: [
        { level: "Critical", target: 99, actual: null },
        { level: "High", target: 95, actual: null },
        { level: "Medium", target: 90, actual: null },
        { level: "Low", target: 85, actual: null },
      ],
      averageResponseTime: 0,
      isWithinSLA: true,
    }
  }
  
  const { prisma } = await import('@/lib/prisma')
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    dbTickets,
    articles,
    slas,
    userCount,
    managedAssets,
    currentOpenTicketsCount,
    previousOpenTicketsCount,
    usersCreatedThisMonth,
    usersCreatedLastMonth,
    assetsCreatedThisMonth,
    assetsCreatedLastMonth,
    articlesCreatedThisMonth,
    articlesCreatedLastMonth
  ] = await Promise.all([
    prisma.ticket.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        assignedToId: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        firstResponseAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.knowledgeBaseArticle.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        category: true,
        viewCount: true,
        helpfulCount: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        tags: true,
      },
      take: 200,
    }),
    getSLAFromDatabase(),
    prisma.user.count(),
    prisma.asset.count(),
    prisma.ticket.count({
      where: {
        status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { gte: startOfCurrentMonth },
      },
    }),
    prisma.ticket.count({
      where: {
        status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        createdAt: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: startOfCurrentMonth },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
      },
    }),
    prisma.asset.count({
      where: {
        createdAt: { gte: startOfCurrentMonth },
      },
    }),
    prisma.asset.count({
      where: {
        createdAt: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
      },
    }),
    prisma.knowledgeBaseArticle.count({
      where: {
        isPublished: true,
        createdAt: { gte: startOfCurrentMonth },
      },
    }),
    prisma.knowledgeBaseArticle.count({
      where: {
        isPublished: true,
        createdAt: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
      },
    }),
  ])
  
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
      rawPriority: ticket.priority,
      customer: 'Unknown',
      email: '',
      department: 'Unknown',
      status: ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase(), // Capitalize first letter
      rawStatus: ticket.status,
      assignedTo: ticket.assignedTo?.name || ticket.assignedTo?.email || 'Unassigned',
      sla,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : null,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
      // Keep original database ticket for popup
      original: ticket
    }
  })
  
  // Map articles to expected format (views, helpful)
  const mappedArticles = articles.map(article => ({
    ...article,
    views: article.viewCount,
    helpful: article.helpfulCount,
  }))
  
  // SLA-Compliance berechnen
  const slaCompliance = calculateSLACompliance(tickets, slas)
  
  // Durchschnittliche Antwortzeit berechnen
  const responseTime = calculateAverageResponseTime(tickets, slas)
  
  // Sortiere Tickets nach Datum (neueste zuerst) - already sorted by query
  const sortedTickets = tickets
  
  // Nur veröffentlichte Artikel (already filtered)
  const publishedArticles = mappedArticles
  
  // Berechnete Metriken
  const openTickets = dbTickets.filter(ticket => 
    ticket.status === 'NEW' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS'
  ).length
  const openTicketsChangePct = calculatePercentageChange(currentOpenTicketsCount, previousOpenTicketsCount)
  const activeUsersChangePct = calculatePercentageChange(usersCreatedThisMonth, usersCreatedLastMonth)
  const managedAssetsChangePct = calculatePercentageChange(assetsCreatedThisMonth, assetsCreatedLastMonth)
  const totalArticlesChangePct = calculatePercentageChange(articlesCreatedThisMonth, articlesCreatedLastMonth)
  
  return {
    tickets: sortedTickets,
    articles: publishedArticles,
    userCount,
    openTickets,
    openTicketsChangePct,
    managedAssets,
    managedAssetsChangePct,
    activeUsersChangePct,
    totalArticles: publishedArticles.length,
    totalArticlesChangePct,
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