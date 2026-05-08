"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MoreHorizontal, Copy, Trash2, Play, Pencil, ToggleRight } from "lucide-react"
import { duplicateRule, deleteRule, executeRule, setRuleStatus } from "./actions"
import { toast } from "sonner"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface AutomationRule {
  id: string
  name: string
  description: string
  category?: string
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const formData = new FormData()
      formData.append("ruleId", rule.id)
      await deleteRule(formData)
      toast.success("Rule deleted")
      setConfirmDeleteOpen(false)
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete rule")
    } finally {
      setIsDeleting(false)
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
              <Pencil className="mr-2 h-4 w-4" />
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
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmDeleteOpen(true)
            }}
          >
            <span className="w-full flex items-center">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{rule.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  )
}