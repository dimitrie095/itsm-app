"use server"

import { prisma } from "@/lib/prisma"
import { TicketStatus, Priority } from "@prisma/client"

export async function getTicketsFromDatabase() {
  try {
    const tickets = await prisma.ticket.findMany({
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
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return tickets.map(ticket => ({
      id: ticket.id.substring(0, 8).toUpperCase(), // Short ID for display
      fullId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      customer: ticket.user?.name || ticket.user?.email || 'Unknown',
      assignedTo: ticket.assignedTo?.name || ticket.assignedTo?.email || 'Unassigned',
      createdAt: ticket.createdAt.toISOString().split('T')[0],
      sla: getSlaForPriority(ticket.priority),
      description: ticket.description,
      category: ticket.category,
      tags: ticket.tags,
      source: ticket.source,
    }))
  } catch (error) {
    console.error("Error fetching tickets from database:", error)
    // Return empty array if there's an error
    return []
  }
}

function getSlaForPriority(priority: Priority): string {
  switch (priority) {
    case Priority.CRITICAL: return "2h"
    case Priority.HIGH: return "24h"
    case Priority.MEDIUM: return "48h"
    case Priority.LOW: return "72h"
    default: return "72h"
  }
}

export async function getTicketStats() {
  try {
    const totalTickets = await prisma.ticket.count()
    const openTickets = await prisma.ticket.count({
      where: {
        status: {
          in: [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]
        }
      }
    })
    const resolvedTickets = await prisma.ticket.count({
      where: {
        status: {
          in: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
        }
      }
    })

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
    }
  } catch (error) {
    console.error("Error fetching ticket stats:", error)
    return {
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
    }
  }
}