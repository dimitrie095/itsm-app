"use server"

import { prisma } from "@/lib/prisma"
import { TicketStatus, Priority, TicketSource } from "@prisma/client"

export async function getAnalyticsData() {
  try {
    // Get all tickets
    const tickets = await prisma.ticket.findMany({
      include: {
        assignedTo: true,
        user: true,
      },
    })

    // Calculate total tickets
    const totalTickets = tickets.length

    // Calculate average resolution time (in hours)
    let totalResolutionTime = 0
    let resolvedCount = 0
    tickets.forEach(ticket => {
      if (ticket.resolvedAt && ticket.createdAt) {
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
        totalResolutionTime += resolutionTime
        resolvedCount++
      }
    })
    const avgResolutionTimeMs = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
    const avgResolutionHours = Math.floor(avgResolutionTimeMs / (1000 * 60 * 60))
    const avgResolutionMinutes = Math.floor((avgResolutionTimeMs % (1000 * 60 * 60)) / (1000 * 60))

    // Calculate tickets by status
    const ticketsByStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {} as Record<TicketStatus, number>)

    // Calculate tickets by priority
    const ticketsByPriority = tickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
      return acc
    }, {} as Record<Priority, number>)

    // Calculate tickets by source
    const ticketsBySource = tickets.reduce((acc, ticket) => {
      acc[ticket.source] = (acc[ticket.source] || 0) + 1
      return acc
    }, {} as Record<TicketSource, number>)

    // Calculate monthly trends (last 6 months)
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(now.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date()
      month.setMonth(now.getMonth() - i)
      const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999)

      const monthlyTickets = tickets.filter(ticket => {
        const ticketDate = ticket.createdAt
        return ticketDate >= startOfMonth && ticketDate <= endOfMonth
      })

      const resolvedMonthly = monthlyTickets.filter(ticket => ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED).length
      const resolutionRate = monthlyTickets.length > 0 ? Math.round((resolvedMonthly / monthlyTickets.length) * 100) : 0

      monthlyTrends.push({
        month: monthName,
        tickets: monthlyTickets.length,
        resolved: resolvedMonthly,
        resolutionRate,
      })
    }

    // Get agent performance (top 5 agents by number of resolved tickets)
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
      },
      include: {
        assignedTickets: {
          where: {
            status: {
              in: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
            }
          }
        }
      }
    })

    const agentPerformance = agents
      .map(agent => ({
        id: agent.id,
        name: agent.name || agent.email,
        email: agent.email,
        resolvedTickets: agent.assignedTickets.length,
        avgResolutionTime: 0, // Would need to calculate per agent
      }))
      .sort((a, b) => b.resolvedTickets - a.resolvedTickets)
      .slice(0, 5)

    // Get SLA data
    const slas = await prisma.sLA.findMany({
      where: {
        isActive: true,
      },
      include: {
        tickets: {
          where: {
            resolvedAt: {
              not: null
            }
          }
        }
      }
    })

    const slaPerformance = slas.map(sla => {
      const compliantTickets = sla.tickets.filter(ticket => {
        if (!ticket.resolvedAt || !ticket.createdAt) return false
        const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime()
        const resolutionTimeHours = resolutionTime / (1000 * 60 * 60)
        return resolutionTimeHours <= sla.resolutionTime
      }).length

      const complianceRate = sla.tickets.length > 0 ? Math.round((compliantTickets / sla.tickets.length) * 100) : 0

      return {
        priority: sla.priority,
        responseTime: sla.responseTime,
        resolutionTime: sla.resolutionTime,
        totalTickets: sla.tickets.length,
        compliantTickets,
        complianceRate,
      }
    })

    // Calculate customer satisfaction (placeholder - would need feedback data)
    const customerSatisfaction = 94 // Placeholder

    // Calculate first contact resolution (placeholder)
    const firstContactResolution = 68 // Placeholder

    return {
      totalTickets,
      avgResolutionTime: {
        hours: avgResolutionHours,
        minutes: avgResolutionMinutes,
        formatted: `${avgResolutionHours}h ${avgResolutionMinutes}m`,
      },
      customerSatisfaction,
      firstContactResolution,
      ticketsByStatus,
      ticketsByPriority,
      ticketsBySource,
      monthlyTrends,
      agentPerformance,
      slaPerformance,
      totalResolvedTickets: resolvedCount,
      openTickets: tickets.filter(t => t.status === TicketStatus.NEW || t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS).length,
    }
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    // Return default data if there's an error
    return {
      totalTickets: 0,
      avgResolutionTime: {
        hours: 0,
        minutes: 0,
        formatted: "0h 0m",
      },
      customerSatisfaction: 0,
      firstContactResolution: 0,
      ticketsByStatus: {},
      ticketsByPriority: {},
      ticketsBySource: {},
      monthlyTrends: [],
      agentPerformance: [],
      slaPerformance: [],
      totalResolvedTickets: 0,
      openTickets: 0,
    }
  }
}