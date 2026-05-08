import { prisma } from "@/lib/prisma"
import { AssetStatus, Priority, TicketSource, TicketStatus } from "@/lib/generated/prisma/enums"
import { notifyTicketAssigned } from "@/lib/notifications"
import {
  assetStatusParamToEnum,
  parseCondition,
  priorityParamToEnum,
  sourceParamToEnum,
  splitStoredAction,
  statusParamToEnum,
} from "@/lib/automation/rule-support"

type RuleShape = {
  id: string
  trigger: string
  condition: string | null
  action: string
  isActive: boolean
}

function splitConditionExpression(ruleCondition: string | null): string[] {
  if (!ruleCondition) return []
  return ruleCondition
    .split(/\s+AND\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function conditionMatchesTicket(ruleCondition: string | null, ticket: {
  priority: Priority
  source: TicketSource
  category: string | null
  status?: TicketStatus
}): boolean {
  const conditions = splitConditionExpression(ruleCondition)
  if (conditions.length === 0) return true

  return conditions.every((condition) => {
    const parsed = parseCondition(condition)
    if (!parsed) return false

    if (parsed.field === "Priority") {
      const priority = priorityParamToEnum(parsed.value)
      return priority ? ticket.priority === priority : false
    }

    if (parsed.field === "Source") {
      const source = sourceParamToEnum(parsed.value)
      return source ? ticket.source === source : false
    }

    if (parsed.field === "Category") {
      return (ticket.category || "").toLowerCase() === parsed.value.toLowerCase()
    }

    if (parsed.field === "Status" && ticket.status) {
      const status = statusParamToEnum(parsed.value)
      return status ? ticket.status === status : false
    }

    return false
  })
}

function conditionMatchesAsset(ruleCondition: string | null, asset: {
  type: string
  status: AssetStatus
  location: string | null
}): boolean {
  const conditions = splitConditionExpression(ruleCondition)
  if (conditions.length === 0) return true

  return conditions.every((condition) => {
    const parsed = parseCondition(condition)
    if (!parsed) return false

    if (parsed.field === "Asset Type") {
      return asset.type.toLowerCase() === parsed.value.toLowerCase()
    }

    if (parsed.field === "Asset Status") {
      const status = assetStatusParamToEnum(parsed.value)
      return status ? asset.status === status.toUpperCase() : false
    }

    if (parsed.field === "Asset Location") {
      return (asset.location || "").toLowerCase() === parsed.value.toLowerCase()
    }

    return false
  })
}

function conditionMatchesArticle(ruleCondition: string | null, article: {
  category: string
  isPublished: boolean
}): boolean {
  const conditions = splitConditionExpression(ruleCondition)
  if (conditions.length === 0) return true

  return conditions.every((condition) => {
    const parsed = parseCondition(condition)
    if (!parsed) return false

    if (parsed.field === "Article Category") {
      return article.category.toLowerCase() === parsed.value.toLowerCase()
    }

    if (parsed.field === "Article Status") {
      if (parsed.value.toLowerCase() === "published") return article.isPublished
      if (parsed.value.toLowerCase() === "draft") return !article.isPublished
    }

    return false
  })
}

async function executeTicketAction(rule: RuleShape, ticketId: string): Promise<{ success: boolean; error?: string }> {
  const { actionName, actionParam } = splitStoredAction(rule.action)

  if (actionName === "Assign to Agent") {
    if (!actionParam) return { success: false, error: "Assign to Agent requires email parameter" }
    const agent = await prisma.user.findFirst({
      where: { email: actionParam },
      select: { id: true },
    })
    if (!agent) return { success: false, error: `Agent not found: ${actionParam}` }
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: agent.id, status: TicketStatus.ASSIGNED },
      select: { id: true, title: true, assignedToId: true },
    })
    if (updatedTicket.assignedToId) {
      await notifyTicketAssigned(updatedTicket.id, updatedTicket.title, updatedTicket.assignedToId, "automation-rule")
    }
    return { success: true }
  }

  if (actionName === "Change Priority") {
    if (!actionParam) return { success: false, error: "Change Priority requires parameter" }
    const priority = priorityParamToEnum(actionParam)
    if (!priority) return { success: false, error: `Unsupported priority: ${actionParam}` }
    await prisma.ticket.update({ where: { id: ticketId }, data: { priority } })
    return { success: true }
  }

  if (actionName === "Change Status") {
    if (!actionParam) return { success: false, error: "Change Status requires parameter" }
    const status = statusParamToEnum(actionParam)
    if (!status) return { success: false, error: `Unsupported status: ${actionParam}` }
    await prisma.ticket.update({ where: { id: ticketId }, data: { status } })
    return { success: true }
  }

  if (actionName === "Close Ticket") {
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.CLOSED } })
    return { success: true }
  }

  if (actionName === "Add Tag") {
    if (!actionParam) return { success: false, error: "Add Tag requires parameter" }
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { tags: true },
    })
    const existing = ticket?.tags ? (JSON.parse(ticket.tags) as string[]) : []
    const normalized = actionParam.trim()
    const updated = existing.includes(normalized) ? existing : [...existing, normalized]
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { tags: JSON.stringify(updated) },
    })
    return { success: true }
  }

  return { success: false, error: `Unsupported action: ${actionName}` }
}

async function executeAssetAction(rule: RuleShape, assetId: string): Promise<{ success: boolean; error?: string }> {
  const { actionName, actionParam } = splitStoredAction(rule.action)

  if (actionName === "Assign Asset to User") {
    if (!actionParam) return { success: false, error: "Assign Asset to User requires email parameter" }
    const targetUser = await prisma.user.findUnique({
      where: { email: actionParam },
      select: { id: true },
    })
    if (!targetUser) return { success: false, error: `User not found: ${actionParam}` }
    await prisma.asset.update({
      where: { id: assetId },
      data: { userId: targetUser.id },
    })
    return { success: true }
  }

  if (actionName === "Update Asset Status") {
    if (!actionParam) return { success: false, error: "Update Asset Status requires parameter" }
    const normalized = assetStatusParamToEnum(actionParam)
    if (!normalized) return { success: false, error: `Unsupported asset status: ${actionParam}` }
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: normalized.toUpperCase() as AssetStatus },
    })
    return { success: true }
  }

  if (actionName === "Update Asset Location") {
    if (!actionParam) return { success: false, error: "Update Asset Location requires parameter" }
    await prisma.asset.update({
      where: { id: assetId },
      data: { location: actionParam },
    })
    return { success: true }
  }

  return { success: false, error: `Unsupported action for asset trigger: ${actionName}` }
}

async function executeArticleAction(rule: RuleShape, articleId: string): Promise<{ success: boolean; error?: string }> {
  const { actionName, actionParam } = splitStoredAction(rule.action)

  if (actionName === "Publish Article") {
    await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: { isPublished: true },
    })
    return { success: true }
  }

  if (actionName === "Update Article Category") {
    if (!actionParam) return { success: false, error: "Set Article Category requires parameter" }
    await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: { category: actionParam },
    })
    return { success: true }
  }

  return { success: false, error: `Unsupported action for article trigger: ${actionName}` }
}

async function fetchRulesByTrigger(trigger: string) {
  return prisma.automationRule.findMany({
    where: {
      isActive: true,
      trigger,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      trigger: true,
      condition: true,
      action: true,
      isActive: true,
    },
  })
}

export async function runAutomationForTicketCreated(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      priority: true,
      source: true,
      category: true,
    },
  })

  if (!ticket) return

  const rules = await fetchRulesByTrigger("Ticket Created")

  for (const rule of rules) {
    if (!conditionMatchesTicket(rule.condition, ticket)) {
      continue
    }

    const result = await executeTicketAction(rule, ticket.id)
    await prisma.automationExecution.create({
      data: {
        ruleId: rule.id,
        ticketId: ticket.id,
        success: result.success,
      },
    })
  }
}

export async function runAutomationForTicketUpdated(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      priority: true,
      source: true,
      category: true,
      status: true,
    },
  })
  if (!ticket) return

  const rules = await fetchRulesByTrigger("Ticket Updated")
  for (const rule of rules) {
    if (!conditionMatchesTicket(rule.condition, ticket)) continue
    const result = await executeTicketAction(rule, ticket.id)
    await prisma.automationExecution.create({
      data: { ruleId: rule.id, ticketId: ticket.id, success: result.success },
    })
  }
}

export async function runAutomationForAssetCreated(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, type: true, status: true, location: true },
  })
  if (!asset) return

  const rules = await fetchRulesByTrigger("Asset Created")
  for (const rule of rules) {
    if (!conditionMatchesAsset(rule.condition, asset)) continue
    const result = await executeAssetAction(rule, asset.id)
    await prisma.automationExecution.create({
      data: { ruleId: rule.id, ticketId: `asset:${asset.id}`, success: result.success },
    })
  }
}

export async function runAutomationForAssetUpdated(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, type: true, status: true, location: true },
  })
  if (!asset) return

  const rules = await fetchRulesByTrigger("Asset Updated")
  for (const rule of rules) {
    if (!conditionMatchesAsset(rule.condition, asset)) continue
    const result = await executeAssetAction(rule, asset.id)
    await prisma.automationExecution.create({
      data: { ruleId: rule.id, ticketId: `asset:${asset.id}`, success: result.success },
    })
  }
}

export async function runAutomationForArticleCreated(articleId: string) {
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { id: articleId },
    select: { id: true, category: true, isPublished: true },
  })
  if (!article) return

  const rules = await fetchRulesByTrigger("Article Created")
  for (const rule of rules) {
    if (!conditionMatchesArticle(rule.condition, article)) continue
    const result = await executeArticleAction(rule, article.id)
    await prisma.automationExecution.create({
      data: { ruleId: rule.id, ticketId: `article:${article.id}`, success: result.success },
    })
  }
}

export async function runAutomationForArticleUpdated(articleId: string) {
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { id: articleId },
    select: { id: true, category: true, isPublished: true },
  })
  if (!article) return

  const rules = await fetchRulesByTrigger("Article Updated")
  for (const rule of rules) {
    if (!conditionMatchesArticle(rule.condition, article)) continue
    const result = await executeArticleAction(rule, article.id)
    await prisma.automationExecution.create({
      data: { ruleId: rule.id, ticketId: `article:${article.id}`, success: result.success },
    })
  }
}

