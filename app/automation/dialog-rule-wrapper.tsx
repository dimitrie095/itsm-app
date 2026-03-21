"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Power } from "lucide-react"
import RuleModal from "./rule-modal"

interface Rule {
  id: string
  name: string
  description: string
  trigger: string
  condition: string
  action: string
  status: boolean
}

interface DialogRuleWrapperProps {
  rule: Rule
}

export function DialogRuleWrapper({ rule }: DialogRuleWrapperProps) {
  return (
    <RuleModal 
      triggerButton={
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Power className="mr-2 h-4 w-4" />
          Edit Rule
        </DropdownMenuItem>
      }
      editingRule={rule}
    />
  )
}
