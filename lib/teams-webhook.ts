import { prisma } from "./prisma"
import { decryptSecret } from "./security/secrets"

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

function isPrivateOrLocalHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  if (normalized === "localhost" || normalized.endsWith(".local")) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    const parts = normalized.split(".").map(Number)
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254)
    )
  }
  return false
}

function sanitizeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

async function getTeamsConfig(): Promise<TeamsConfig | null> {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "microsoft_teams" },
    })

    if (integration?.enabled) {
      const cfg = JSON.parse(integration.config || "{}")
      const webhookUrl = decryptSecret(cfg.webhookUrl)
      return {
        enabled: integration.enabled,
        organizationName: cfg.organizationName,
        channelName: cfg.channelName,
        webhookUrl,
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
  let webhook: URL
  try {
    webhook = new URL(cfg.webhookUrl)
  } catch {
    return { sent: false as const, reason: "invalid_teams_config" as const }
  }
  if (webhook.protocol !== "https:" || isPrivateOrLocalHost(webhook.hostname)) {
    return { sent: false as const, reason: "invalid_teams_config" as const }
  }

  const response = await fetch(webhook.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: sanitizeText(payload.title),
      themeColor: "0073d2",
      title: sanitizeText(payload.title),
      text: sanitizeText(payload.text),
    }),
  })

  if (!response.ok) {
    throw new Error(`Teams webhook failed (${response.status})`)
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
