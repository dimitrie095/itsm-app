"use server"

import { prisma } from "@/lib/prisma"

export async function getAutomationRules() {
  try {
    // Check if there are any rules, create default ones if empty
    const ruleCount = await prisma.automationRule.count()
    
    if (ruleCount === 0) {
      const defaultRules = [
        { name: "Auto-assign by category", description: "Automatically assign tickets based on category", trigger: "Ticket Created", condition: "Category = 'Hardware'", action: "Assign to Hardware Team", isActive: true },
        { name: "SLA escalation", description: "Escalate tickets when SLA is breached", trigger: "SLA Breach", condition: "Priority = High", action: "Escalate to Level 2", isActive: true },
        { name: "Auto-response email", description: "Send automatic acknowledgment for email tickets", trigger: "Ticket Created", condition: "Source = Email", action: "Send acknowledgment", isActive: true },
        { name: "Close stale tickets", description: "Automatically close resolved tickets after 7 days", trigger: "Daily", condition: "Status = Resolved > 7 days", action: "Auto-close", isActive: false },
        { name: "Tag high impact", description: "Add critical tag to high impact tickets", trigger: "Ticket Updated", condition: "Impact = Critical", action: "Add 'Critical' tag", isActive: true },
        { name: "Notify manager", description: "Notify manager when ticket is escalated", trigger: "Ticket Escalated", condition: "Escalation Level >= 2", action: "Send email to manager", isActive: false },
      ]
      
      for (const ruleData of defaultRules) {
        await prisma.automationRule.create({
          data: ruleData
        })
      }
      
      console.log("Created default automation rules")
    }

    const rules = await prisma.automationRule.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return rules.map(rule => ({
      id: rule.id.substring(0, 8).toUpperCase(), // Short ID for display
      fullId: rule.id,
      name: rule.name,
      description: rule.description || '',
      trigger: rule.trigger,
      condition: rule.condition || '',
      action: rule.action,
      status: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }))
  } catch (error) {
    console.error("Error fetching automation rules:", error)
    // Return empty array if there's an error
    return []
  }
}

export async function getAutomationStats() {
  try {
    const totalRules = await prisma.automationRule.count()
    const activeRules = await prisma.automationRule.count({
      where: {
        isActive: true
      }
    })
    const inactiveRules = totalRules - activeRules

    // Placeholder for executions (would need separate logging table)
    const executionsToday = 0
    const timeSavedHours = 0

    return {
      totalRules,
      activeRules,
      inactiveRules,
      executionsToday,
      timeSavedHours,
    }
  } catch (error) {
    console.error("Error fetching automation stats:", error)
    return {
      totalRules: 0,
      activeRules: 0,
      inactiveRules: 0,
      executionsToday: 0,
      timeSavedHours: 0,
    }
  }
}

export async function toggleRuleStatus(ruleId: string, isActive: boolean) {
  try {
    const updatedRule = await prisma.automationRule.update({
      where: {
        id: ruleId
      },
      data: {
        isActive: !isActive
      }
    })

    return { success: true, rule: updatedRule }
  } catch (error) {
    console.error("Error toggling rule status:", error)
    return { success: false, error: "Failed to toggle rule status" }
  }
}

export async function getRuleById(ruleId: string) {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    })

    if (!rule) {
      return null
    }

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      trigger: rule.trigger,
      condition: rule.condition || '',
      action: rule.action,
      isActive: rule.isActive,
    }
  } catch (error) {
    console.error("Error fetching rule by ID:", error)
    return null
  }
}

export async function createRule(formData: {
  name: string
  description?: string
  trigger: string
  condition?: string
  action: string
  isActive: boolean
}) {
  try {
    const rule = await prisma.automationRule.create({
      data: {
        name: formData.name,
        description: formData.description || null,
        trigger: formData.trigger,
        condition: formData.condition || null,
        action: formData.action,
        isActive: formData.isActive,
      }
    })

    return { success: true, rule }
  } catch (error) {
    console.error("Error creating rule:", error)
    return { success: false, error: "Failed to create rule" }
  }
}

export async function updateRule(ruleId: string, formData: {
  name: string
  description?: string
  trigger: string
  condition?: string
  action: string
  isActive: boolean
}) {
  try {
    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        name: formData.name,
        description: formData.description || null,
        trigger: formData.trigger,
        condition: formData.condition || null,
        action: formData.action,
        isActive: formData.isActive,
      }
    })

    return { success: true, rule }
  } catch (error) {
    console.error("Error updating rule:", error)
    return { success: false, error: "Failed to update rule" }
  }
}

export async function deleteRule(ruleId: string) {
  try {
    await prisma.automationRule.delete({
      where: { id: ruleId }
    })

    return { success: true }
  } catch (error) {
    console.error("Error deleting rule:", error)
    return { success: false, error: "Failed to delete rule" }
  }
}