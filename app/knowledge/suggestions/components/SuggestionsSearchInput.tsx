"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from 'react'

interface SuggestionsSearchInputProps {
  initialSearch?: string
}

export function SuggestionsSearchInput({ initialSearch = '' }: SuggestionsSearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)
  
  // Sync state with props when they change (e.g., when URL changes from external source)
  useEffect(() => {
    setSearch(initialSearch || '')
  }, [initialSearch])
  
  // Update URL when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
      }
      
      const queryString = params.toString()
      const newUrl = queryString ? `/knowledge/suggestions?${queryString}` : '/knowledge/suggestions'
      
      router.push(newUrl, { scroll: false })
    }, 300) // Debounce to avoid too many updates
    
    return () => clearTimeout(timer)
  }, [search, router, searchParams])
  
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search suggestions..."
        className="pl-10 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}