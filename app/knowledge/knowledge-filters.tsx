"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface KnowledgeFiltersProps {
  initialSearch: string
  initialCategory: string
  initialStatus: string
  categories: string[]
}

export function KnowledgeFilters({
  initialSearch,
  initialCategory,
  initialStatus,
  categories,
}: KnowledgeFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState(initialCategory)
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmedSearch = search.trim()

      if (trimmedSearch) {
        params.set("search", trimmedSearch)
      } else {
        params.delete("search")
      }

      if (category && category !== "all") {
        params.set("category", category)
      } else {
        params.delete("category")
      }

      if (status && status !== "all") {
        params.set("status", status)
      } else {
        params.delete("status")
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, category, status, router, pathname, searchParams])

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          className="w-[320px] pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="all">All Categories</option>
        {categories.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="all">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
    </div>
  )
}
