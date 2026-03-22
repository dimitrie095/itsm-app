"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getAutomationRules() {
  try {
    // Check if there are any rules, create default ones if empty
    const ruleCount = await prisma.automationRule.count()
    
    if (ruleCount === 0) {
      const defaultRules = [
        { name: "Auto-assign by category", description: "Automatically assign tickets based on category", category: "Ticket", trigger: "Ticket Created", condition: "Category = 'Hardware'", action: "Assign to Team: Hardware Team", isActive: true },
        { name: "SLA escalation", description: "Escalate tickets when SLA is breached", category: "SLA", trigger: "SLA Breach", condition: "Priority = 'High'", action: "Escalate Level", isActive: true },
        { name: "Auto-response email", description: "Send automatic acknowledgment for email tickets", category: "Notification", trigger: "Ticket Created", condition: "Source = 'Email'", action: "Send Email: Requester", isActive: true },
        { name: "Close stale tickets", description: "Automatically close resolved tickets after 7 days", category: "Schedule", trigger: "Daily", condition: "Status = 'Resolved' AND Age > 168", action: "Close Ticket", isActive: false },
        { name: "Tag high impact", description: "Add critical tag to high impact tickets", category: "Ticket", trigger: "Ticket Updated", condition: "Impact = 'Critical'", action: "Add Tag: Critical", isActive: true },
        { name: "Notify manager", description: "Notify manager when ticket is escalated", category: "Notification", trigger: "Ticket Escalated", condition: "Escalation Level >= 2", action: "Notify Manager", isActive: false },
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

    // Get latest execution for each rule
    const ruleIds = rules.map(rule => rule.id)
    let latestExecutions: Record<string, any> = {}
    
    if (ruleIds.length > 0) {
      try {
        const executions = await prisma.automationExecution.findMany({
          where: {
            ruleId: { in: ruleIds }
          },
          orderBy: {
            executedAt: 'desc'
          }
        })

        // Group by ruleId, taking the first (latest) for each rule
        executions.forEach(exec => {
          if (!latestExecutions[exec.ruleId]) {
            latestExecutions[exec.ruleId] = exec
          }
        })
      } catch (error) {
        // If automationExecution table doesn't exist yet, continue without executions
        console.log('Note: automationExecution table not available yet')
      }
    }

    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      category: rule.category || 'General',
      trigger: rule.trigger,
      condition: rule.condition || '',
      action: rule.action,
      status: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      lastExecution: latestExecutions[rule.id]?.executedAt.toISOString() || null,
      lastExecutionSuccess: latestExecutions[rule.id]?.success || null,
    }))
  } catch (error) {
    console.error("Error fetching automation rules:", error)
    // Return empty array if there's an error
    return []
  }
}

export async function getAutomationRule(id: string) {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id }
    })

    if (!rule) {
      return null
    }

    // Get latest execution for this rule
    let latestExecution = null
    try {
      const execution = await prisma.automationExecution.findFirst({
        where: { ruleId: id },
        orderBy: { executedAt: 'desc' }
      })
      latestExecution = execution
    } catch {
      // If automationExecution table doesn't exist yet, continue without execution
      console.log('Note: automationExecution table not available yet')
    }

    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      category: rule.category || 'General',
      trigger: rule.trigger,
      condition: rule.condition || '',
      action: rule.action,
      status: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      lastExecution: latestExecution?.executedAt.toISOString() || null,
      lastExecutionSuccess: latestExecution?.success || null,
    }
  } catch (error) {
    console.error("Error fetching automation rule:", error)
    return null
  }
}

export async function getAutomationStats() {
  try {
    const totalRules = await prisma.automationRule.count()
    const activeRules = await prisma.automationRule.count({
      where: { isActive: true }
    })
    const inactiveRules = totalRules - activeRules

    // Calculate estimated time saved based on active rules
    // Assume each active rule saves ~2 hours per week on average
    const timeSavedHours = activeRules * 2

    // Get today's executions from the execution log if available
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let executionsToday = 0
    let successfulExecutions = 0
    let failedExecutions = 0
    try {
      executionsToday = await prisma.automationExecution.count({
        where: {
          executedAt: {
            gte: today
          }
        }
      })
      
      // Count successful and failed executions today
      const executionResults = await prisma.automationExecution.groupBy({
        by: ['success'],
        where: {
          executedAt: {
            gte: today
          }
        },
        _count: {
          _all: true
        }
      })
      
      executionResults.forEach(result => {
        if (result.success) {
          successfulExecutions = result._count._all
        } else {
          failedExecutions = result._count._all
        }
      })
    } catch {
      // Table might not exist yet, default to 0
      executionsToday = 0
      successfulExecutions = 0
      failedExecutions = 0
    }

    return {
      totalRules,
      activeRules,
      inactiveRules,
      executionsToday,
      successfulExecutions,
      failedExecutions,
      timeSavedHours,
    }
  } catch (error) {
    console.error("Error fetching automation stats:", error)
    return {
      totalRules: 0,
      activeRules: 0,
      inactiveRules: 0,
      executionsToday: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      timeSavedHours: 0,
    }
  }
}

export async function toggleRuleStatus(formData: FormData) {
  try {
    const ruleId = formData.get('ruleId') as string
    const currentStatus = formData.get('currentStatus') === 'true'
    
    if (!ruleId) {
      throw new Error("Rule ID is required")
    }

    await prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive: !currentStatus }
    })

    revalidatePath('/automation')
  } catch (error) {
    console.error("Error toggling rule status:", error)
    throw error
  }
}

export async function setRuleStatus(formData: FormData) {
  try {
    const ruleId = formData.get('ruleId') as string
    const status = formData.get('status') === 'true'
    
    if (!ruleId) {
      throw new Error("Rule ID is required")
    }

    await prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive: status }
    })

    revalidatePath('/automation')
  } catch (error) {
    console.error("Error setting rule status:", error)
    throw error
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
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  actionParam?: string
  isActive: boolean
}) {
  try {
    // Combine action and param if provided
    const fullAction = formData.actionParam 
      ? `${formData.action}: ${formData.actionParam}`
      : formData.action

    const rule = await prisma.automationRule.create({
      data: {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        trigger: formData.trigger,
        condition: formData.condition || null,
        action: fullAction,
        isActive: formData.isActive,
      }
    })

    revalidatePath('/automation')
    return { success: true, rule }
  } catch (error) {
    console.error("Error creating rule:", error)
    return { success: false, error: "Failed to create rule" }
  }
}

export async function updateRule(ruleId: string, formData: {
  name: string
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  actionParam?: string
  isActive: boolean
}) {
  try {
    // Combine action and param if provided
    const fullAction = formData.actionParam 
      ? `${formData.action}: ${formData.actionParam}`
      : formData.action

    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        trigger: formData.trigger,
        condition: formData.condition || null,
        action: fullAction,
        isActive: formData.isActive,
      }
    })

    revalidatePath('/automation')
    return { success: true, rule }
  } catch (error) {
    console.error("Error updating rule:", error)
    return { success: false, error: "Failed to update rule" }
  }
}

export async function deleteRule(formData: FormData) {
  try {
    const ruleId = formData.get('ruleId') as string
    
    if (!ruleId) {
      throw new Error("Rule ID is required")
    }

    await prisma.automationRule.delete({
      where: { id: ruleId }
    })

    revalidatePath('/automation')
  } catch (error) {
    console.error("Error deleting rule:", error)
    throw error
  }
}

export async function duplicateRule(formData: FormData) {
  try {
    const ruleId = formData.get('ruleId') as string
    
    if (!ruleId) {
      throw new Error("Rule ID is required")
    }

    const originalRule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    })

    if (!originalRule) {
      throw new Error("Rule not found")
    }

    await prisma.automationRule.create({
      data: {
        name: `${originalRule.name} (Copy)`,
        description: originalRule.description,
        trigger: originalRule.trigger,
        condition: originalRule.condition,
        action: originalRule.action,
        isActive: false, // Copy is inactive by default
      }
    })

    revalidatePath('/automation')
  } catch (error) {
    console.error("Error duplicating rule:", error)
    throw error
  }
}

// Log rule execution
export async function logRuleExecution(ruleId: string, ticketId: string, success: boolean, details?: string) {
  try {
    await prisma.automationExecution.create({
      data: {
        ruleId,
        ticketId,
        success
      }
    })
  } catch (error) {
    console.error("Error logging rule execution:", error)
  }
}

// Get automation executions with filters
export async function getAutomationExecutions(filters?: {
  ruleId?: string
  success?: boolean
  startDate?: string
  endDate?: string
  ticketId?: string
  search?: string
  page?: number
  limit?: number
}) {
  try {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const skip = (page - 1) * limit

    const where: any = {}

    if (filters?.ruleId) {
      where.ruleId = filters.ruleId
    }

    if (filters?.success !== undefined) {
      where.success = filters.success
    }

    if (filters?.ticketId) {
      where.ticketId = filters.ticketId
    }

    if (filters?.startDate || filters?.endDate) {
      where.executedAt = {}
      if (filters.startDate) {
        where.executedAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.executedAt.lte = new Date(filters.endDate)
      }
    }

    // Search in rule name or ticket ID if search term provided
    if (filters?.search) {
      where.OR = [
        {
          rule: {
            name: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          ticketId: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Get executions with related rule data
    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              trigger: true,
              action: true,
              isActive: true
            }
          }
        },
        orderBy: {
          executedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.automationExecution.count({ where })
    ])

    // Get statistics
    const successCount = await prisma.automationExecution.count({
      where: { ...where, success: true }
    })
    
    const failureCount = await prisma.automationExecution.count({
      where: { ...where, success: false }
    })

    // Format executions for response
    const formattedExecutions = executions.map(exec => ({
      id: exec.id,
      ruleId: exec.ruleId,
      ruleName: exec.rule.name,
      ruleTrigger: exec.rule.trigger,
      ruleAction: exec.rule.action,
      ruleActive: exec.rule.isActive,
      ticketId: exec.ticketId,
      success: exec.success,
      executedAt: exec.executedAt.toISOString()
    }))

    return {
      executions: formattedExecutions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        total,
        successCount,
        failureCount,
        successRate: total > 0 ? (successCount / total) * 100 : 0
      }
    }
  } catch (error) {
    console.error("Error fetching automation executions:", error)
    // Return empty results if table doesn't exist yet
    return {
      executions: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      },
      statistics: {
        total: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0
      }
    }
  }
}

// Execute a rule manually
export async function executeRule(ruleId: string) {
  try {
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId }
    })

    if (!rule) {
      return { success: false, error: "Rule not found" }
    }

    // In a real implementation, this would execute the rule logic
    // For now, we just log it
    await logRuleExecution(ruleId, 'manual', true)

    revalidatePath('/automation')
    return { success: true, message: `Rule "${rule.name}" executed successfully` }
  } catch (error) {
    console.error("Error executing rule:", error)
    return { success: false, error: "Failed to execute rule" }
  }
}
