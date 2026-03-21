"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@/lib/generated/prisma/enums"

// Helper function to calculate time ago
function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}

// Helper function to format resolution time
function formatResolutionTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  } else if (minutes < 1440) { // 24 hours
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim()
  } else {
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    return `${days}d ${hours > 0 ? `${hours}h` : ''}`.trim()
  }
}

// End User Dashboard-Daten sammeln (aus Datenbank)
export async function getEndUserDashboardData(userEmail: string) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: userEmail }
  })
  
  if (!user) {
    throw new Error(`User not found with email: ${userEmail}`)
  }
  
  // Get user's tickets from database
  const userTickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  })
  
  // Calculate metrics
  const openTickets = userTickets.filter(ticket => 
    ticket.status === 'NEW' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS'
  ).length
  
  const resolvedTickets = userTickets.filter(ticket => 
    ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  ).length
  
  // Calculate average resolution time for resolved tickets
  let avgResolutionTime = { formatted: 'N/A', withinSLA: true }
  const resolvedTicketsWithTimes = userTickets.filter(ticket => 
    (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && ticket.resolvedAt
  )
  
  if (resolvedTicketsWithTimes.length > 0) {
    let totalResolutionMinutes = 0
    resolvedTicketsWithTimes.forEach(ticket => {
      if (ticket.createdAt && ticket.resolvedAt) {
        const resolutionMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
        totalResolutionMinutes += Math.floor(resolutionMs / (1000 * 60))
      }
    })
    
    const avgMinutes = Math.round(totalResolutionMinutes / resolvedTicketsWithTimes.length)
    avgResolutionTime = {
      formatted: formatResolutionTime(avgMinutes),
      withinSLA: avgMinutes < 1440 // Within SLA if < 24 hours
    }
  } else {
    // Fallback: simulate based on priority for demo
    const resolvedTicketsForSimulation = userTickets.filter(ticket => 
      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
    )
    
    if (resolvedTicketsForSimulation.length > 0) {
      let totalSimulatedMinutes = 0
      resolvedTicketsForSimulation.forEach(ticket => {
        switch (ticket.priority) {
          case 'CRITICAL': totalSimulatedMinutes += 90; break // 1.5 hours
          case 'HIGH': totalSimulatedMinutes += 270; break // 4.5 hours
          case 'MEDIUM': totalSimulatedMinutes += 720; break // 12 hours
          case 'LOW': totalSimulatedMinutes += 1440; break // 24 hours
          default: totalSimulatedMinutes += 480; break // 8 hours
        }
      })
      
      const avgMinutes = Math.round(totalSimulatedMinutes / resolvedTicketsForSimulation.length)
      avgResolutionTime = {
        formatted: formatResolutionTime(avgMinutes),
        withinSLA: avgMinutes < 1440
      }
    }
  }
  
  // Get recent tickets (last 5)
  const recentTickets = userTickets.slice(0, 5).map(ticket => ({
    id: ticket.id,
    title: ticket.title,
    priority: ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase(),
    status: ticket.status,
    assignee: ticket.assignedTo?.name || 'Unassigned',
    time: timeAgo(ticket.updatedAt || ticket.createdAt),
    updatedAt: ticket.updatedAt,
    createdAt: ticket.createdAt
  }))
  
  // Get top knowledge base articles from database
  const topArticles = await prisma.knowledgeBaseArticle.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      category: true,
      createdAt: true
    }
  })
  
  const totalArticles = await prisma.knowledgeBaseArticle.count({
    where: { isPublished: true }
  })
  
  return {
    // User information
    userEmail,
    userName: user.name || user.email.split('@')[0],
    
    // Ticket data
    userTickets,
    recentTickets,
    openTickets,
    resolvedThisMonth: resolvedTickets,
    
    // Knowledge Base
    topArticles,
    totalArticles,
    
    // Metrics
    averageResponseTime: avgResolutionTime,
    
    // Statistics for dashboard cards
    stats: {
      openTickets,
      resolvedThisMonth: resolvedTickets,
      averageResponseTime: avgResolutionTime.formatted,
      withinSLA: avgResolutionTime.withinSLA
    }
  }
}

// Fallback function using JSON files
