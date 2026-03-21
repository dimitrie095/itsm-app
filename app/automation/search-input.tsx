"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from 'react'

interface SearchInputProps {
  initialSearch?: string
}

export function SearchInput({ initialSearch = '' }: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)
  
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
      const newUrl = queryString ? `/automation?${queryString}` : '/automation'
      
      router.push(newUrl, { scroll: false })
    }, 300) // Debounce to avoid too many updates
    
    return () => clearTimeout(timer)
  }, [search, router, searchParams])
  
  return (
    <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search rules by name, trigger, or action..."
        className="pl-10 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}