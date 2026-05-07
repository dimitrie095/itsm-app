import { prisma } from "./prisma"

type TeamsMessagePayload = {
  title: string
  text: string
}

type TeamsConfig = {
  enabled: boolean
  organizationName?: string
  channelName?: string
  webhookUrl?: string
}

async function getTeamsConfig(): Promise<TeamsConfig | null> {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "microsoft_teams" },
    })

    if (integration?.enabled) {
      const cfg = JSON.parse(integration.config || "{}")
      return {
        enabled: integration.enabled,
        organizationName: cfg.organizationName,
        channelName: cfg.channelName,
        webhookUrl: cfg.webhookUrl,
      }
    }
  } catch (error) {
    console.error("Failed to load Microsoft Teams config:", error)
  }

  if (process.env.TEAMS_WEBHOOK_URL) {
    return {
      enabled: true,
      organizationName: process.env.TEAMS_ORGANIZATION_NAME || "",
      channelName: process.env.TEAMS_CHANNEL_NAME || "",
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    }
  }

  return null
}

export async function sendTeamsMessage(payload: TeamsMessagePayload) {
  const cfg = await getTeamsConfig()
  if (!cfg?.enabled || !cfg.webhookUrl) {
    return { sent: false as const, reason: "missing_teams_config" as const }
  }

  const response = await fetch(cfg.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: payload.title,
      themeColor: "0073d2",
      title: payload.title,
      text: payload.text,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`Teams webhook failed (${response.status}): ${body}`)
  }

  return { sent: true as const }
}

export function buildTeamsTicketCreatedMessage(ticketId: string, ticketTitle: string, requesterName: string) {
  return {
    title: "New ticket created",
    text: `**Ticket:** ${ticketTitle}<br/>**ID:** ${ticketId}<br/>**Requester:** ${requesterName}`,
  }
}

export function buildTeamsTicketAssignedMessage(ticketId: string, ticketTitle: string, assigneeName: string) {
  return {
    title: "Ticket assigned",
    text: `**Ticket:** ${ticketTitle}<br/>**ID:** ${ticketId}<br/>**Assigned to:** ${assigneeName}`,
  }
}

export function buildTeamsTicketStatusChangedMessage(
  ticketId: string,
  ticketTitle: string,
  oldStatus: string,
  newStatus: string
) {
  return {
    title: "Ticket status changed",
    text: `**Ticket:** ${ticketTitle}<br/>**ID:** ${ticketId}<br/>**From:** ${oldStatus}<br/>**To:** ${newStatus}`,
  }
}
