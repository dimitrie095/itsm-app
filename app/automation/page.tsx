import { prisma } from "@/lib/prisma"
import AutomationClient from "./automation-client"
import { getAutomationStats } from "./actions"

export default async function AutomationPage() {
  // Fetch data directly
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' }
  })
  
  // Transform data for client component
  const formattedRules = rules.map(rule => ({
    id: rule.id.substring(0, 8).toUpperCase(),
    fullId: rule.id,
    name: rule.name,
    description: rule.description || '',
    trigger: rule.trigger,
    condition: rule.condition || '',
    action: rule.action,
    status: rule.isActive,
  }))
  
  const stats = await getAutomationStats()

  return <AutomationClient initialRules={formattedRules} initialStats={stats} />
}