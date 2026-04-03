"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function GenerateSuggestionsButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <RefreshCw className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Generating..." : "Generate Suggestions"}
    </Button>
  )
}