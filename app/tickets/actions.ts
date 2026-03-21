"use server"

import { prisma } from "@/lib/prisma"
import { TicketStatus, Priority } from "@prisma/client"

export async function getTicketsFromDatabase(userId?: string, userRole?: string) {
  try {
    // Build where clause based on user role
    let whereClause: any = {}
    
    if (userRole === "END_USER" && userId) {
      // END_USER can only see their own tickets
      whereClause.userId = userId
    }
    // ADMIN and AGENT can see all tickets (no filter)
    
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
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

export async function getTicketStats(userId?: string, userRole?: string) {
  try {
    // Build where clause based on user role for stats
    let whereClause: any = {}
    let whereOpenClause: any = {
      status: {
        in: [TicketStatus.NEW, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS]
      }
    }
    let whereResolvedClause: any = {
      status: {
        in: [TicketStatus.RESOLVED, TicketStatus.CLOSED]
      }
    }
    
    if (userRole === "END_USER" && userId) {
      whereClause.userId = userId
      whereOpenClause.userId = userId
      whereResolvedClause.userId = userId
    }
    
    const totalTickets = await prisma.ticket.count({
      where: whereClause
    })
    const openTickets = await prisma.ticket.count({
      where: whereOpenClause
    })
    const resolvedTickets = await prisma.ticket.count({
      where: whereResolvedClause
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

export async function updateTicket(
  ticketId: string,
  updates: { status?: string; assignedToId?: string | null }
) {
  try {
    // Validate ticket exists and user has permission
    // Note: In a real app, you should add proper authentication and authorization checks
    
    const updateData: any = {}
    
    if (updates.status) {
      // Validate status is a valid TicketStatus
      if (!Object.values(TicketStatus).includes(updates.status as TicketStatus)) {
        throw new Error(`Invalid status: ${updates.status}`)
      }
      updateData.status = updates.status
      
      // If status is CLOSED or RESOLVED, set closedAt
      if (updates.status === TicketStatus.CLOSED || updates.status === TicketStatus.RESOLVED) {
        updateData.closedAt = new Date()
      }
    }
    
    if (updates.assignedToId !== undefined) {
      updateData.assignedToId = updates.assignedToId
      // If assigning to someone, status should become ASSIGNED if it's NEW
      if (updates.assignedToId && !updates.status) {
        const currentTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { status: true }
        })
        if (currentTicket?.status === TicketStatus.NEW) {
          updateData.status = TicketStatus.ASSIGNED
        }
      }
    }
    
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
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
      }
    })
    
    return {
      success: true,
      ticket: updatedTicket
    }
  } catch (error) {
    console.error("Error updating ticket:", error)
    throw new Error(`Failed to update ticket: ${error instanceof Error ? error.message : String(error)}`)
  }
}