import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter, Eye, ThumbsUp, BookOpen, Tag, RefreshCw, CheckCircle, XCircle, FileText } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { getSuggestions, generateSuggestions, updateSuggestion, deleteSuggestion, convertSuggestionToArticle } from "./actions"

export default async function KnowledgeSuggestionsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | undefined }
}) {
  const session = await getServerSession(authOptions)
  
  // Check if user has permission to view suggestions
  const canViewSuggestions = hasPermission(session, "knowledge.suggestions.view")
  if (!canViewSuggestions) {
    redirect('/unauthorized')
  }

  const canGenerateSuggestions = hasPermission(session, "knowledge.suggestions.generate")
  const canManageSuggestions = hasPermission(session, "knowledge.suggestions.manage")
  const canCreateArticles = hasPermission(session, "knowledge.create")
  const canPublishArticles = hasPermission(session, "knowledge.publish")

  // Fetch suggestions with optional filters
  const statusFilter = searchParams?.status
  const audienceFilter = searchParams?.audience
  const searchFilter = searchParams?.search
  const suggestions = await getSuggestions({
    status: statusFilter,
    audience: audienceFilter,
    search: searchFilter,
  })

  // Calculate metrics
  const totalSuggestions = suggestions.length
  const pendingReview = suggestions.filter(s => s.status === "PENDING_REVIEW").length
  const approved = suggestions.filter(s => s.status === "APPROVED").length
  const rejected = suggestions.filter(s => s.status === "REJECTED").length
  const published = suggestions.filter(s => s.status === "PUBLISHED").length
  const endUserCount = suggestions.filter(s => s.targetAudience === "END_USER").length
  const itSupportCount = suggestions.filter(s => s.targetAudience === "IT_SUPPORT").length

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Helper to get badge variant for status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW": return "secondary"
      case "APPROVED": return "default"
      case "REJECTED": return "destructive"
      case "PUBLISHED": return "success"
      default: return "outline"
    }
  }

  // Helper to get badge variant for audience
  const getAudienceBadgeVariant = (audience: string) => {
    switch (audience) {
      case "END_USER": return "secondary"
      case "IT_SUPPORT": return "default"
      default: return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Suggestions</h1>
          <p className="text-muted-foreground">AI-generated article suggestions from ticket analysis.</p>
        </div>
        <div className="flex gap-2">
          {canGenerateSuggestions && (
            <form action={async () => {
              "use server"
              await generateSuggestions()
            }}>
              <Button type="submit" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Suggestions
              </Button>
            </form>
          )}
          <Button asChild>
            <Link href="/knowledge">
              <BookOpen className="mr-2 h-4 w-4" />
              View Knowledge Base
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuggestions}</div>
            <p className="text-xs text-muted-foreground">From ticket analysis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReview}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">End‑User Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{endUserCount}</div>
            <p className="text-xs text-muted-foreground">Low‑complexity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">IT‑Support Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itSupportCount}</div>
            <p className="text-xs text-muted-foreground">High‑complexity</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Suggestions</CardTitle>
          <CardDescription>
            Review, approve, or convert AI‑generated article suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suggestions..."
                className="pl-10"
                defaultValue={searchFilter}
                // Implement search via form with query param
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>Pending Review</DropdownMenuItem>
                <DropdownMenuItem>Approved</DropdownMenuItem>
                <DropdownMenuItem>Rejected</DropdownMenuItem>
                <DropdownMenuItem>Published</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Audience</DropdownMenuLabel>
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>End‑User</DropdownMenuItem>
                <DropdownMenuItem>IT‑Support</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Suggestions Table */}
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No suggestions yet</h3>
              <p className="text-muted-foreground">
                {canGenerateSuggestions
                  ? "Click 'Generate Suggestions' to analyze tickets and create article drafts."
                  : "No suggestions have been generated yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate">{suggestion.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {suggestion.problemSummary.substring(0, 60)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getAudienceBadgeVariant(suggestion.targetAudience)}>
                        {suggestion.targetAudience.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(suggestion.status)}>
                        {suggestion.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(suggestion.createdAt)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {suggestion.author?.name || suggestion.author?.email || 'System'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/knowledge/suggestions/${suggestion.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {canManageSuggestions && suggestion.status === "PENDING_REVIEW" && (
                            <>
                              <DropdownMenuItem asChild>
                                <form action={async () => {
                                  "use server"
                                  await updateSuggestion(suggestion.id, { status: "APPROVED" })
                                }}>
                                  <button type="submit" className="flex w-full items-center">
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </button>
                                </form>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <form action={async () => {
                                  "use server"
                                  await updateSuggestion(suggestion.id, { status: "REJECTED" })
                                }}>
                                  <button type="submit" className="flex w-full items-center">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </button>
                                </form>
                              </DropdownMenuItem>
                            </>
                          )}
                          {canCreateArticles && suggestion.status === "APPROVED" && (
                            <DropdownMenuItem asChild>
                              <form action={async () => {
                                "use server"
                                await convertSuggestionToArticle(suggestion.id, false)
                              }}>
                                <button type="submit" className="flex w-full items-center">
                                  <FileText className="mr-2 h-4 w-4" />
                                  Convert to Article
                                </button>
                              </form>
                            </DropdownMenuItem>
                          )}
                          {canManageSuggestions && suggestion.status !== "PUBLISHED" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <form action={async () => {
                                  "use server"
                                  await deleteSuggestion(suggestion.id)
                                }}>
                                  <button type="submit" className="flex w-full items-center text-destructive">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Delete
                                  </button>
                                </form>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}