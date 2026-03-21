"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { Role } from "@/lib/generated/prisma/enums"

export default function NewTicketPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: session, status } = useSession()
  
  const userRole = session?.user?.role
  const isEndUser = userRole === Role.END_USER
  const isAdminOrAgent = userRole === Role.ADMIN || userRole === Role.AGENT

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Check if user is authenticated
    if (status === "loading") {
      toast.error("Please wait while we verify your session")
      return
    }
    
    if (status === "unauthenticated" || !session) {
      toast.error("You must be logged in to create a ticket")
      router.push("/login")
      return
    }
    
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    // Basic validation
    const title = (formData.get("title") as string).trim()
    const description = (formData.get("description") as string).trim()
    const category = (formData.get("category") as string).trim()
    const priority = (formData.get("priority") as string).toUpperCase()
    
    if (!title) {
      toast.error("Title is required")
      setIsSubmitting(false)
      return
    }
    
    if (!description) {
      toast.error("Description is required")
      setIsSubmitting(false)
      return
    }
    
    if (!category) {
      toast.error("Category is required")
      setIsSubmitting(false)
      return
    }
    
    // Build payload for API
    const payload: any = {
      title,
      description,
      category,
      priority,
      source: "PORTAL", // Default source
      impact: "LOW", // Default impact
      urgency: "LOW", // Default urgency
    }
    
    // Add user information for admin/agent creating tickets for others
    if (isAdminOrAgent) {
      const customerName = (formData.get("customer") as string).trim()
      const customerEmail = (formData.get("email") as string).trim()
      const department = (formData.get("department") as string).trim()
      
      if (customerEmail) {
        payload.userEmail = customerEmail
        if (customerName) {
          payload.userName = customerName
        }
        if (department) {
          payload.department = department
        }
      } else {
        toast.error("Customer email is required when creating tickets for others")
        setIsSubmitting(false)
        return
      }
    }
    
    // Add tags if we had a tags field (optional)
    // payload.tags = []
    
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to create ticket: ${response.status}`)
      }
      
      const ticket = await response.json()
      
      toast.success("Ticket created successfully", {
        description: "Your ticket has been submitted and is now in the queue.",
      })
      
      // Redirect to tickets list after a short delay
      setTimeout(() => {
        router.push(`/tickets?created=true&highlight=${ticket.id}`)
      }, 1500)
    } catch (err) {
      toast.error("Failed to create ticket", {
        description: err instanceof Error ? err.message : "Please check your inputs and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
            <p className="text-muted-foreground">Loading session...</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Verifying your permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user has permission to create tickets
  const userPermissions = (session?.user as any)?.permissions as string[] || []
  const canCreateTicket = userPermissions.includes('tickets.create')
  
  if (!canCreateTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
            <p className="text-muted-foreground">You don't have permission to create tickets.</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You need the "tickets.create" permission to create tickets.</p>
            <Button asChild>
              <Link href="/tickets">Back to Tickets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
          <p className="text-muted-foreground">Fill in the details to create a new support ticket.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <CardDescription>Provide information about the issue or request.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" placeholder="Brief summary of the issue" required disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select name="category" required disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the issue in detail. Include steps to reproduce, error messages, and any relevant information."
                className="min-h-[200px]"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select name="priority" required disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {isAdminOrAgent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer Name *</Label>
                    <Input id="customer" name="customer" placeholder="Customer name" required disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Customer Email *</Label>
                    <Input id="email" name="email" type="email" placeholder="customer@example.com" required disabled={isSubmitting} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="customer" className="text-muted-foreground">Requester</Label>
                    <Input 
                      id="customer" 
                      value={session?.user?.name || session?.user?.email || "You"} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Requester Email</Label>
                    <Input 
                      id="email" 
                      value={session?.user?.email || "Your email"} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </>
              )}
            </div>

            {isAdminOrAgent && (
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select name="department" disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-4">
              <Button variant="outline" type="button" asChild disabled={isSubmitting}>
                <Link href="/tickets">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}