"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Copy, Trash2, Play, Power, ToggleRight } from "lucide-react"
import { duplicateRule, deleteRule, executeRule, setRuleStatus } from "./actions"
import { toast } from "sonner"
import Link from "next/link"

interface AutomationRule {
  id: string
  name: string
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  status: boolean
}

interface RuleActionsDropdownProps {
  rule: AutomationRule
  canUpdateRule: boolean
  canCreateRule?: boolean
  canDeleteRule: boolean
}

export function RuleActionsDropdown({
  rule,
  canUpdateRule,
  canCreateRule,
  canDeleteRule,
}: RuleActionsDropdownProps) {
  const handleDelete = (e: React.MouseEvent) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      e.preventDefault()
    }
  }

  const handleTest = async () => {
    try {
      toast.info('Testing rule...')
      const result = await executeRule(rule.id)
      if (result.success) {
        toast.success('Rule test executed successfully')
      } else {
        toast.error(`Test failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to test rule')
    }
  }

  const handleToggleStatus = async () => {
    try {
      const formData = new FormData()
      formData.append('ruleId', rule.id)
      formData.append('status', String(!rule.status))
      
      toast.info(rule.status ? 'Deactivating rule...' : 'Activating rule...')
      await setRuleStatus(formData)
      toast.success(rule.status ? 'Rule deactivated' : 'Rule activated')
    } catch (error) {
      toast.error('Failed to toggle rule status')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Rule Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {canUpdateRule && (
          <DropdownMenuItem asChild>
            <Link href={`/automation/${rule.id}/edit`} className="flex items-center w-full">
              <Power className="mr-2 h-4 w-4" />
              Edit Rule
            </Link>
          </DropdownMenuItem>
        )}
        
        {canUpdateRule && (
          <DropdownMenuItem onSelect={(e) => {
            e.preventDefault()
            handleToggleStatus()
          }}>
            <ToggleRight className="mr-2 h-4 w-4" />
            {rule.status ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        )}
        
        {canCreateRule && (
          <form action={duplicateRule} className="w-full">
            <input type="hidden" name="ruleId" value={rule.id} />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </button>
            </DropdownMenuItem>
          </form>
        )}
        
        {canUpdateRule && (
          <DropdownMenuItem onSelect={(e) => {
            e.preventDefault()
            handleTest()
          }}>
            <Play className="mr-2 h-4 w-4" />
            Test Rule
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {canDeleteRule && (
          <form action={deleteRule} className="w-full">
            <input type="hidden" name="ruleId" value={rule.id} />
            <DropdownMenuItem asChild className="text-red-600 focus:text-red-600">
              <button 
                type="submit" 
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            </DropdownMenuItem>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}