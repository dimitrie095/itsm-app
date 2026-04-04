"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { generateSuggestions } from "../actions"

export function GenerateSuggestionsButton() {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setPending(true)
    try {
      const result = await generateSuggestions()
      toast.success("Article suggestions generated.", {
        description: `${result.generated} suggestions generated successfully.`
      })
      // Revalidate the page to show new suggestions
      router.refresh()
    } catch (error) {
      toast.error("Failed to generate suggestions", {
        description: error instanceof Error ? error.message : "Please try again."
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      disabled={pending}
      onClick={handleClick}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Generating..." : "Generate Suggestions"}
    </Button>
  )
}