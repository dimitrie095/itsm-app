"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from 'react'

interface FilterControlsProps {
  initialCategory?: string
  initialStatus?: string
  initialSearch?: string
}

export function FilterControls({ 
  initialCategory = '', 
  initialStatus = '', 
  initialSearch = '' 
}: FilterControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [category, setCategory] = useState(initialCategory || 'all')
  const [status, setStatus] = useState(initialStatus || 'all')
  
  // Sync state with props when they change (e.g., when URL changes from external source)
  useEffect(() => {
    setCategory(initialCategory || 'all')
  }, [initialCategory])
  
  useEffect(() => {
    setStatus(initialStatus || 'all')
  }, [initialStatus])
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (category && category !== 'all') {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    
    if (status && status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `/automation?${queryString}` : '/automation'
    
    router.push(newUrl, { scroll: false })
  }, [category, status, router, searchParams])
  
  const handleClearAll = () => {
    // Clear all filters including search
    router.push('/automation', { scroll: false })
    // Local state will be updated via sync effects when props change
  }
  
  const hasActiveFilters = 
    (category && category !== 'all') || 
    (status && status !== 'all') || 
    searchParams.get('search')
  
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-wrap gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Ticket">Ticket Automations</SelectItem>
            <SelectItem value="Asset">Asset Automations</SelectItem>
            <SelectItem value="User">User Automations</SelectItem>
            <SelectItem value="Knowledge Base">Knowledge Base</SelectItem>
            <SelectItem value="Reporting">Reporting & Analytics</SelectItem>
            <SelectItem value="Role & Permission">Role & Permission</SelectItem>
            <SelectItem value="SLA">SLA Automations</SelectItem>
            <SelectItem value="Notification">Notification</SelectItem>
            <SelectItem value="Schedule">Scheduled</SelectItem>
            <SelectItem value="General">General</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
        
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}