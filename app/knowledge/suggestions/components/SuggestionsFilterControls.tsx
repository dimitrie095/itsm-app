"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from 'react'

interface SuggestionsFilterControlsProps {
  initialStatus?: string
  initialAudience?: string
}

export function SuggestionsFilterControls({ 
  initialStatus = '', 
  initialAudience = '' 
}: SuggestionsFilterControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [status, setStatus] = useState(initialStatus || 'all')
  const [audience, setAudience] = useState(initialAudience || 'all')
  
  // Sync state with props when they change (e.g., when URL changes from external source)
  useEffect(() => {
    setStatus(initialStatus || 'all')
  }, [initialStatus])
  
  useEffect(() => {
    setAudience(initialAudience || 'all')
  }, [initialAudience])
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (status && status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    
    if (audience && audience !== 'all') {
      params.set('audience', audience)
    } else {
      params.delete('audience')
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `/knowledge/suggestions?${queryString}` : '/knowledge/suggestions'
    
    router.push(newUrl, { scroll: false })
  }, [status, audience, router, searchParams])
  
  const handleClearAll = () => {
    // Clear all filters including search
    router.push('/knowledge/suggestions', { scroll: false })
    // Local state will be updated via sync effects when props change
  }
  
  const hasActiveFilters = 
    (status && status !== 'all') || 
    (audience && audience !== 'all') || 
    searchParams.get('search')
  
  return (
    <div className="flex items-center gap-3">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={audience} onValueChange={setAudience}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Audience" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Audience</SelectItem>
          <SelectItem value="END_USER">End‑User</SelectItem>
          <SelectItem value="IT_SUPPORT">IT‑Support</SelectItem>
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
  )
}