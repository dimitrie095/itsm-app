import nodemailer from "nodemailer"
import { prisma } from "./prisma"

type TicketEmailPayload = {
  to: string
  subject: string
  html: string
}

type OutlookEmailPayload = {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

let transporter: nodemailer.Transporter | null = null
let cachedConfigKey: string | null = null

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000"
}

async function getSmtpConfig() {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "outlook_smtp" },
    })

    if (integration?.enabled) {
      const cfg = JSON.parse(integration.config || "{}")
      if (cfg.smtpUser && cfg.smtpPass) {
        return {
          host: cfg.smtpHost || "smtp.office365.com",
          port: Number(cfg.smtpPort || 587),
          user: cfg.smtpUser,
          pass: cfg.smtpPass,
          from: cfg.fromEmail || cfg.smtpUser,
          configKey: `${cfg.smtpHost}|${cfg.smtpPort}|${cfg.smtpUser}|${cfg.fromEmail}`,
        }
      }
    }
  } catch (error) {
    console.error("Failed to load Outlook integration config from database:", error)
  }

  const user = process.env.OUTLOOK_SMTP_USER
  const pass = process.env.OUTLOOK_SMTP_PASS
  if (!user || !pass) return null

  return {
    host: process.env.OUTLOOK_SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.OUTLOOK_SMTP_PORT || 587),
    user,
    pass,
    from: process.env.OUTLOOK_FROM_EMAIL || user,
    configKey: `${process.env.OUTLOOK_SMTP_HOST}|${process.env.OUTLOOK_SMTP_PORT}|${user}|${process.env.OUTLOOK_FROM_EMAIL || ""}`,
  }
}

async function getTransporter() {
  const cfg = await getSmtpConfig()
  if (!cfg) return null

  if (transporter && cachedConfigKey === cfg.configKey) {
    return { transporter, from: cfg.from }
  }

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  })
  cachedConfigKey = cfg.configKey

  return { transporter, from: cfg.from }
}

export async function sendTicketEmail(payload: TicketEmailPayload) {
  return sendOutlookEmail(payload)
}

export async function sendOutlookEmail(payload: OutlookEmailPayload) {
  const mailContext = await getTransporter()
  if (!mailContext) {
    console.warn("Outlook SMTP not configured; skipping ticket email send.")
    return { sent: false, reason: "missing_smtp_config" as const }
  }

  const { transporter: mailer, from } = mailContext
  if (!from) {
    return { sent: false, reason: "missing_from_email" as const }
  }

  await mailer.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    attachments: payload.attachments,
  })

  return { sent: true as const }
}

export function buildTicketCreatedEmailHtml(ticketId: string, ticketTitle: string) {
  const ticketUrl = `${getBaseUrl()}/tickets`
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New ticket created</h2>
      <p>Your ticket has been created successfully.</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>ID:</strong> ${ticketId}</p>
      <p>You can track updates here: <a href="${ticketUrl}">${ticketUrl}</a></p>
    </div>
  `
}

export function buildTicketStatusChangedEmailHtml(
  ticketId: string,
  ticketTitle: string,
  oldStatus: string,
  newStatus: string
) {
  const ticketUrl = `${getBaseUrl()}/tickets`
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Ticket status updated</h2>
      <p>Your ticket status has changed.</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>ID:</strong> ${ticketId}</p>
      <p><strong>From:</strong> ${oldStatus}</p>
      <p><strong>To:</strong> ${newStatus}</p>
      <p>View ticket details: <a href="${ticketUrl}">${ticketUrl}</a></p>
    </div>
  `
}

export function buildTicketClarificationEmailHtml(
  ticketId: string,
  ticketTitle: string,
  requesterName: string,
  message: string
) {
  const ticketUrl = `${getBaseUrl()}/tickets`
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Question about your ticket</h2>
      <p>Hello ${requesterName},</p>
      <p>Our support team needs more information to continue with your ticket.</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>ID:</strong> ${ticketId}</p>
      <div style="margin: 16px 0; padding: 12px; border-radius: 8px; background: #f4f6f8;">
        ${message.replace(/\n/g, "<br/>")}
      </div>
      <p>Please reply with the requested details.</p>
      <p>Ticket overview: <a href="${ticketUrl}">${ticketUrl}</a></p>
    </div>
  `
}

export function buildTicketAssignedEmailHtml(ticketId: string, ticketTitle: string, assigneeName: string) {
  const ticketUrl = `${getBaseUrl()}/tickets/${ticketId}/edit`
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New ticket assigned to you</h2>
      <p>Hello ${assigneeName},</p>
      <p>A ticket has been assigned to you.</p>
      <p><strong>Ticket:</strong> ${ticketTitle}</p>
      <p><strong>ID:</strong> ${ticketId}</p>
      <p>Open ticket: <a href="${ticketUrl}">${ticketUrl}</a></p>
    </div>
  `
}
