"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""

async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    // Note: API routes rely on session cookie, so we don't need to add Authorization header
  }

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: "include",
  })
}

export async function getSuggestions(params?: {
  status?: string
  audience?: string
  search?: string
}) {
  try {
    const url = new URL(`${API_BASE}/api/knowledge/suggestions`)
    if (params?.status) url.searchParams.set("status", params.status)
    if (params?.audience) url.searchParams.set("audience", params.audience)
    if (params?.search) url.searchParams.set("search", params.search)

    const res = await authenticatedFetch(url.toString())
    if (!res.ok) {
      throw new Error(`Failed to fetch suggestions: ${res.statusText}`)
    }
    const data = await res.json()
    return data.suggestions || []
  } catch (error) {
    console.error("Error fetching suggestions:", error)
    return []
  }
}

export async function generateSuggestions() {
  try {
    const res = await authenticatedFetch("/api/knowledge/suggestions/generate", {
      method: "POST",
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to generate suggestions")
    }
    const data = await res.json()
    revalidatePath("/knowledge/suggestions")
    return data
  } catch (error) {
    console.error("Error generating suggestions:", error)
    throw error
  }
}

export async function updateSuggestion(id: string, data: any) {
  try {
    const res = await authenticatedFetch("/api/knowledge/suggestions", {
      method: "PUT",
      body: JSON.stringify({ id, ...data }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to update suggestion")
    }
    revalidatePath("/knowledge/suggestions")
    return await res.json()
  } catch (error) {
    console.error("Error updating suggestion:", error)
    throw error
  }
}

export async function deleteSuggestion(id: string) {
  try {
    const res = await authenticatedFetch("/api/knowledge/suggestions", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to delete suggestion")
    }
    revalidatePath("/knowledge/suggestions")
    return { success: true }
  } catch (error) {
    console.error("Error deleting suggestion:", error)
    throw error
  }
}

export async function convertSuggestionToArticle(suggestionId: string, publish: boolean = false) {
  try {
    const res = await authenticatedFetch("/api/knowledge/suggestions/convert", {
      method: "POST",
      body: JSON.stringify({ suggestionId, publish }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to convert suggestion")
    }
    revalidatePath("/knowledge/suggestions")
    revalidatePath("/knowledge")
    return await res.json()
  } catch (error) {
    console.error("Error converting suggestion:", error)
    throw error
  }
}