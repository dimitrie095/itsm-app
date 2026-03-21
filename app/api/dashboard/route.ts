import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiAuth } from "@/lib/api-auth"
import { Role } from "@/lib/generated/prisma/enums"

export const runtime = 'nodejs'

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

export async function GET(request: Request) {
  try {
    // Check authentication with dashboard.view permission
    const authResult = await checkApiAuth(request, undefined, ["dashboard.view"])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { user, session } = authResult
    
    // Build response based on user role
    if (user.role === Role.END_USER) {
      return await getEndUserDashboardData(user)
    } else {
      return await getAdminAgentDashboardData(user)
    }
  } catch (error) {
    console.error("GET /api/dashboard error:", error)
    return NextResponse.json({
      error: "Failed to fetch dashboard data",
      details: String(error)
    }, { status: 500 })
  }
}

// End User Dashboard Data
async function getEndUserDashboardData(user: any) {
  // Get user's tickets
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
  }
  
  // Get recent tickets (last 5)
  const recentTickets = userTickets.slice(0, 5).map(ticket => ({
    id: ticket.id,
    title: ticket.title,
    priority: ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase(),
    status: ticket.status,
    assignedTo: ticket.assignedTo?.name || 'Unassigned',
    time: timeAgo(ticket.updatedAt || ticket.createdAt),
    updatedAt: ticket.updatedAt
  }))
  
  // Get top knowledge base articles
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
  
  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    },
    metrics: {
      openTickets,
      resolvedTickets,
      avgResolutionTime,
      totalTickets: userTickets.length
    },
    recentTickets,
    topArticles,
    userRole: 'END_USER'
  })
}

// Admin/Agent Dashboard Data
async function getAdminAgentDashboardData(user: any) {
  // For now, return basic data for non-end users
  // In a real implementation, this would have admin/agent specific data
  
  const totalTickets = await prisma.ticket.count()
  const openTickets = await prisma.ticket.count({
    where: {
      status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] }
    }
  })
  
  const totalUsers = await prisma.user.count()
  const totalArticles = await prisma.knowledgeBaseArticle.count({
    where: { isPublished: true }
  })
  
  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    },
    metrics: {
      openTickets,
      totalTickets,
      totalUsers,
      totalArticles
    },
    userRole: user.role
  })
}