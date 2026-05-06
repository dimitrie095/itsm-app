import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { prisma } from "@/lib/prisma"
import { Role } from "@/lib/generated/prisma/enums"
import { TicketEditPageForm } from "./ticket-edit-page-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketEditPage({ params }: PageProps) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (!hasPermission(session, "tickets.view") || !hasPermission(session, "tickets.update")) {
    redirect("/unauthorized")
  }

  let ticket: Awaited<ReturnType<typeof prisma.ticket.findUnique>> | null = null
  let additionalAssignees: Array<{ user: { id: string; name: string | null; email: string; role: Role } }> = []

  try {
    ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        asset: {
          select: { id: true, name: true, type: true, status: true },
        },
        sla: {
          select: { id: true, name: true, responseTime: true, resolutionTime: true },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        additionalAssignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })
  } catch {
    ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        asset: {
          select: { id: true, name: true, type: true, status: true },
        },
        sla: {
          select: { id: true, name: true, responseTime: true, resolutionTime: true },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    })
  }

  if (!ticket) {
    notFound()
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: [Role.ADMIN, Role.AGENT] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  })

  return (
    <TicketEditPageForm
      ticket={{
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedToId: ticket.assignedToId,
        assignedTo: ticket.assignedTo,
        user: ticket.user,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        asset: ticket.asset,
        sla: ticket.sla,
        comments: ticket.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          isInternal: comment.isInternal,
          createdAt: comment.createdAt.toISOString(),
          user: comment.user,
        })),
        additionalAssignees: (ticket as typeof ticket & { additionalAssignees?: typeof additionalAssignees }).additionalAssignees?.map((entry) => ({
          id: entry.user.id,
          name: entry.user.name,
          email: entry.user.email,
          role: entry.user.role,
        })) ?? [],
      }}
      users={users}
    />
  )
}

