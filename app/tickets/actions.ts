"use server"

import { prisma } from "@/lib/prisma"
import { TicketStatus, Priority } from "@prisma/client"
import { notifyTicketStatusChanged } from "@/lib/notifications"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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
  updates: {
    status?: string
    assignedToId?: string | null
    priority?: string
    category?: string | null
    description?: string
    additionalAssigneeIds?: string[]
  }
) {
  try {
    // Validate ticket exists and user has permission
    // Note: In a real app, you should add proper authentication and authorization checks
    
    const updateData: any = {}
    let oldStatus: string | undefined
    let userId: string | undefined
    let ticketTitle: string | undefined
    
    if (updates.status) {
      // Validate status is a valid TicketStatus
      if (!Object.values(TicketStatus).includes(updates.status as TicketStatus)) {
        throw new Error(`Invalid status: ${updates.status}`)
      }
      // Get current ticket to compare status and get user info
      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true, userId: true, title: true }
      })
      if (currentTicket) {
        oldStatus = currentTicket.status
        userId = currentTicket.userId
        ticketTitle = currentTicket.title
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

    if (updates.priority) {
      if (!Object.values(Priority).includes(updates.priority as Priority)) {
        throw new Error(`Invalid priority: ${updates.priority}`)
      }
      updateData.priority = updates.priority
    }

    if (updates.category !== undefined) {
      updateData.category = updates.category?.trim() || null
    }

    if (updates.description !== undefined) {
      const trimmedDescription = updates.description.trim()
      if (!trimmedDescription) {
        throw new Error("Description cannot be empty")
      }
      updateData.description = trimmedDescription
    }

    const normalizedAdditionalAssignees = updates.additionalAssigneeIds
      ? [...new Set(updates.additionalAssigneeIds.filter(Boolean))]
      : undefined

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
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

      if (normalizedAdditionalAssignees !== undefined) {
        const additionalAssigneeModel = (tx as typeof tx & {
          ticketAdditionalAssignee?: {
            deleteMany: (args: { where: { ticketId: string; userId: { notIn: string[] } } }) => Promise<unknown>
            createMany: (args: { data: Array<{ ticketId: string; userId: string }>; skipDuplicates: boolean }) => Promise<unknown>
          }
        }).ticketAdditionalAssignee

        if (additionalAssigneeModel) {
          await additionalAssigneeModel.deleteMany({
            where: {
              ticketId,
              userId: { notIn: normalizedAdditionalAssignees }
            }
          })

          if (normalizedAdditionalAssignees.length > 0) {
            await additionalAssigneeModel.createMany({
              data: normalizedAdditionalAssignees.map((userId) => ({
                ticketId,
                userId,
              })),
              skipDuplicates: true,
            })
          }
        }
      }

      return updated
    })
    
    // Notify end user if status changed
    if (updates.status && oldStatus && userId && ticketTitle && oldStatus !== updates.status) {
      notifyTicketStatusChanged(ticketId, ticketTitle, userId, oldStatus, updates.status)
        .catch(error => console.error('Failed to send status change notification:', error))
    }
    
    return {
      success: true,
      ticket: updatedTicket
    }
  } catch (error) {
    console.error("Error updating ticket:", error)
    throw new Error(`Failed to update ticket: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function addTicketComment(ticketId: string, content: string, isInternal = true) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const role = session.user.role
  if (role !== "ADMIN" && role !== "AGENT") {
    throw new Error("Only agents and admins can add comments here")
  }

  const trimmedContent = content.trim()
  if (!trimmedContent) {
    throw new Error("Comment cannot be empty")
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  })

  if (!ticket) {
    throw new Error("Ticket not found")
  }

  const comment = await prisma.comment.create({
    data: {
      ticketId,
      userId: session.user.id,
      content: trimmedContent,
      isInternal,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  return comment
}