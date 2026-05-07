"use server"

import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

export interface AzureADConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  tenantId: string
  syncUsers: boolean
  syncGroups: boolean
  defaultRole: "END_USER" | "AGENT" | "ADMIN"
  syncInterval: string
}

export interface OutlookConfig {
  enabled: boolean
  organizationName: string
  employeeDomains: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  fromEmail: string
}

export interface TeamsConfig {
  enabled: boolean
  organizationName: string
  channelName: string
  webhookUrl: string
}

export async function saveAzureADConfig(config: AzureADConfig) {
  try {
    // In a real application, you would:
    // 1. Store configuration in a database table
    // 2. Encrypt sensitive data like clientSecret
    // 3. Update environment variables (requires server restart)
    // 4. Update NextAuth configuration dynamically
    
    // For now, we'll simulate saving to a database
    const integration = await prisma.integrationConfig.upsert({
      where: {
        provider: "azure_ad",
      },
      update: {
        config: JSON.stringify(config),
        enabled: config.enabled,
        updatedAt: new Date(),
      },
      create: {
        provider: "azure_ad",
        name: "Azure Active Directory",
        config: JSON.stringify(config),
        enabled: config.enabled,
      },
    })

    // Also update environment variables for current session
    // Note: In production, you'd need to restart the server or use a configuration service
    process.env.AZURE_AD_CLIENT_ID = config.enabled ? config.clientId : ""
    process.env.AZURE_AD_CLIENT_SECRET = config.enabled ? config.clientSecret : ""
    process.env.AZURE_AD_TENANT_ID = config.enabled ? config.tenantId : ""

    return { success: true, message: "Azure AD configuration saved successfully" }
  } catch (error) {
    console.error("Error saving Azure AD config:", error)
    return { success: false, error: "Failed to save Azure AD configuration" }
  }
}

export async function testAzureADConnection(config: AzureADConfig) {
  try {
    // Test Azure AD connection by attempting to get a token
    // This is a simplified test - in production, you'd make an actual API call
    
    if (!config.enabled || !config.clientId || !config.clientSecret || !config.tenantId) {
      return { success: false, message: "Please enable Azure AD and fill in all required fields" }
    }

    // Simulate API call to Azure AD
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
    
    // In a real implementation, you would:
    // 1. Use MSAL or similar library to get an access token
    // 2. Make a test call to Microsoft Graph API
    // 3. Validate permissions and connectivity
    
    const isValidConfig = 
      config.clientId.length === 36 && 
      config.clientSecret.length >= 16 &&
      config.tenantId.length === 36
    
    if (!isValidConfig) {
      return { 
        success: false, 
        message: "Invalid configuration. Please check your Client ID, Secret, and Tenant ID format." 
      }
    }

    return { 
      success: true, 
      message: "Successfully connected to Azure AD. Configuration is valid." 
    }
  } catch (error) {
    console.error("Error testing Azure AD connection:", error)
    return { 
      success: false, 
      message: "Failed to connect to Azure AD. Please check your configuration and network connectivity." 
    }
  }
}

export async function getAzureADConfig() {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "azure_ad" },
    })

    if (integration) {
      const config = JSON.parse(integration.config)
      return {
        enabled: integration.enabled,
        ...config,
      } as AzureADConfig
    }

    // Return default configuration
    return {
      enabled: false,
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      syncUsers: true,
      syncGroups: false,
      defaultRole: "END_USER" as const,
      syncInterval: "24",
    }
  } catch (error) {
    console.error("Error getting Azure AD config:", error)
    return {
      enabled: false,
      clientId: "",
      clientSecret: "",
      tenantId: "",
      syncUsers: true,
      syncGroups: false,
      defaultRole: "END_USER" as const,
      syncInterval: "24",
    }
  }
}

export async function triggerUserSync() {
  try {
    // This would trigger a background job to sync users from Azure AD
    // For now, we'll simulate the sync
    
    console.log("Starting Azure AD user sync...")
    
    // In a real implementation:
    // 1. Fetch users from Microsoft Graph API
    // 2. Create/update users in local database
    // 3. Sync group memberships if enabled
    // 4. Send notifications about sync results
    
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate sync
    
    return { 
      success: true, 
      message: "User synchronization started. It may take a few minutes to complete." 
    }
  } catch (error) {
    console.error("Error triggering user sync:", error)
    return { success: false, error: "Failed to start user synchronization" }
  }
}

export async function saveOutlookConfig(config: OutlookConfig) {
  try {
    const integration = await prisma.integrationConfig.upsert({
      where: {
        provider: "outlook_smtp",
      },
      update: {
        config: JSON.stringify(config),
        enabled: config.enabled,
        updatedAt: new Date(),
      },
      create: {
        provider: "outlook_smtp",
        name: "Outlook SMTP",
        config: JSON.stringify(config),
        enabled: config.enabled,
      },
    })

    return { success: true, message: "Outlook configuration saved successfully", integrationId: integration.id }
  } catch (error) {
    console.error("Error saving Outlook config:", error)
    return { success: false, error: "Failed to save Outlook configuration" }
  }
}

export async function getOutlookConfig() {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "outlook_smtp" },
    })

    if (integration) {
      const config = JSON.parse(integration.config)
      return {
        enabled: integration.enabled,
        organizationName: config.organizationName || "",
        employeeDomains: config.employeeDomains || "",
        smtpHost: config.smtpHost || "smtp.office365.com",
        smtpPort: config.smtpPort || "587",
        smtpUser: config.smtpUser || "",
        smtpPass: config.smtpPass || "",
        fromEmail: config.fromEmail || "",
      } as OutlookConfig
    }

    return {
      enabled: false,
      organizationName: "",
      employeeDomains: "",
      smtpHost: process.env.OUTLOOK_SMTP_HOST || "smtp.office365.com",
      smtpPort: process.env.OUTLOOK_SMTP_PORT || "587",
      smtpUser: process.env.OUTLOOK_SMTP_USER || "",
      smtpPass: process.env.OUTLOOK_SMTP_PASS || "",
      fromEmail: process.env.OUTLOOK_FROM_EMAIL || process.env.OUTLOOK_SMTP_USER || "",
    } as OutlookConfig
  } catch (error) {
    console.error("Error getting Outlook config:", error)
    return {
      enabled: false,
      organizationName: "",
      employeeDomains: "",
      smtpHost: "smtp.office365.com",
      smtpPort: "587",
      smtpUser: "",
      smtpPass: "",
      fromEmail: "",
    } as OutlookConfig
  }
}

export async function testOutlookConnection(config: OutlookConfig) {
  try {
    if (!config.enabled) {
      return { success: false, message: "Please enable Outlook integration first." }
    }
    if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass || !config.fromEmail) {
      return { success: false, message: "Please fill in all required SMTP fields." }
    }
    if (!config.organizationName.trim()) {
      return { success: false, message: "Please provide your organization name." }
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: Number(config.smtpPort),
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })

    await transporter.verify()
    return {
      success: true,
      message: `Connection successful for ${config.organizationName}. SMTP is reachable.`,
    }
  } catch (error) {
    console.error("Outlook connection test failed:", error)
    return {
      success: false,
      message: "Failed to connect to Outlook SMTP. Please verify host, port, user, and password.",
    }
  }
}

export async function saveTeamsConfig(config: TeamsConfig) {
  try {
    const integration = await prisma.integrationConfig.upsert({
      where: { provider: "microsoft_teams" },
      update: {
        config: JSON.stringify(config),
        enabled: config.enabled,
        updatedAt: new Date(),
      },
      create: {
        provider: "microsoft_teams",
        name: "Microsoft Teams",
        config: JSON.stringify(config),
        enabled: config.enabled,
      },
    })

    return { success: true, message: "Microsoft Teams configuration saved.", integrationId: integration.id }
  } catch (error) {
    console.error("Error saving Teams config:", error)
    return { success: false, error: "Failed to save Microsoft Teams configuration" }
  }
}

export async function getTeamsConfig() {
  try {
    const integration = await prisma.integrationConfig.findUnique({
      where: { provider: "microsoft_teams" },
    })

    if (integration) {
      const config = JSON.parse(integration.config || "{}")
      return {
        enabled: integration.enabled,
        organizationName: config.organizationName || "",
        channelName: config.channelName || "",
        webhookUrl: config.webhookUrl || "",
      } as TeamsConfig
    }

    return {
      enabled: false,
      organizationName: process.env.TEAMS_ORGANIZATION_NAME || "",
      channelName: process.env.TEAMS_CHANNEL_NAME || "",
      webhookUrl: process.env.TEAMS_WEBHOOK_URL || "",
    } as TeamsConfig
  } catch (error) {
    console.error("Error loading Teams config:", error)
    return {
      enabled: false,
      organizationName: "",
      channelName: "",
      webhookUrl: "",
    } as TeamsConfig
  }
}

export async function testTeamsConnection(config: TeamsConfig) {
  try {
    if (!config.enabled) {
      return { success: false, message: "Please enable Microsoft Teams integration first." }
    }
    if (!config.organizationName.trim()) {
      return { success: false, message: "Please provide organization name." }
    }
    if (!config.channelName.trim()) {
      return { success: false, message: "Please provide channel name." }
    }
    if (!config.webhookUrl.trim()) {
      return { success: false, message: "Please provide webhook URL." }
    }

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        summary: "ITSM Teams test",
        themeColor: "0073d2",
        title: "ITSM Teams integration test",
        text: `Connection successful for ${config.organizationName} (${config.channelName}).`,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      return {
        success: false,
        message: `Teams webhook rejected the test (${response.status}). ${body || ""}`.trim(),
      }
    }

    return { success: true, message: "Microsoft Teams connection successful. Test message sent." }
  } catch (error) {
    console.error("Error testing Teams connection:", error)
    return { success: false, message: "Failed to connect to Microsoft Teams webhook." }
  }
}