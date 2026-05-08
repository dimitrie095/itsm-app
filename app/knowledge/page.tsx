export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Eye, ThumbsUp, BookOpen, Tag, Sparkles } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { getArticles, deleteArticle } from "./actions"
import { KnowledgeFilters } from "./knowledge-filters"

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams?: { search?: string; category?: string; status?: string }
}) {
  const session = await getServerSession(authOptions)
  
  // Check if user has permission to view knowledge base
  const canViewKnowledge = hasPermission(session, "knowledge.view")
  if (!canViewKnowledge) {
    redirect('/unauthorized')
  }
  
  const articles = await getArticles()
  const canCreateArticle = hasPermission(session, "knowledge.create")
  const canViewSuggestions = hasPermission(session, "knowledge.suggestions.view")
  const userPermissions = (session?.user as any)?.permissions as string[] || []
  const canUpdateArticle = userPermissions.includes("knowledge.update")
  const canDeleteArticle = userPermissions.includes("knowledge.delete")
  const canPublishArticle = userPermissions.includes("knowledge.publish")

  const searchTerm = (searchParams?.search || "").trim().toLowerCase()
  const categoryFilter = (searchParams?.category || "all").trim()
  const statusFilter = (searchParams?.status || "all").trim().toLowerCase()
  const allArticles = articles

  const displayArticles = allArticles.filter((article: any) => {
    const title = String(article.title || "").toLowerCase()
    const category = String(article.category || "").toLowerCase()
    const id = String(article.id || "").toLowerCase()
    const matchesSearch =
      !searchTerm || title.includes(searchTerm) || category.includes(searchTerm) || id.includes(searchTerm)
    const matchesCategory =
      categoryFilter === "all" || String(article.category || "") === categoryFilter
    const articleStatus = String(article.status || (article.isPublished ? "Published" : "Draft")).toLowerCase()
    const matchesStatus = statusFilter === "all" || articleStatus === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Calculate metrics from the full dataset (not affected by search filters)
  const totalArticles = allArticles.length
  const totalViews = allArticles.reduce((sum: number, article: any) => sum + (article.views || 0), 0)
  const totalHelpful = allArticles.reduce((sum: number, article: any) => sum + (article.helpful || 0), 0)
  const totalNotHelpful = allArticles.reduce((sum: number, article: any) => sum + (article.notHelpful || 0), 0)
  const helpfulRate = totalHelpful + totalNotHelpful > 0 
    ? Math.round((totalHelpful / (totalHelpful + totalNotHelpful)) * 100) 
    : 0
  const issueReportRate = totalHelpful + totalNotHelpful > 0
    ? Math.round((totalNotHelpful / (totalHelpful + totalNotHelpful)) * 100)
    : 0
  const draftArticles = allArticles.filter((article: any) => article.status === "Draft" || article.isPublished === false).length

  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const createdThisMonth = allArticles.filter((article: any) => {
    const createdAt = new Date(article.createdAt)
    return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfCurrentMonth
  }).length
  const createdLastMonth = allArticles.filter((article: any) => {
    const createdAt = new Date(article.createdAt)
    return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfPreviousMonth && createdAt < startOfCurrentMonth
  }).length
  const monthlyArticleDelta = createdThisMonth - createdLastMonth
  const monthlyDeltaPrefix = monthlyArticleDelta > 0 ? "+" : ""
  const monthlyDeltaLabel =
    monthlyArticleDelta === 0
      ? "No change from last month"
      : `${monthlyDeltaPrefix}${monthlyArticleDelta} from last month`

  // Extract unique categories
  const categories = Array.from(new Set(allArticles.map((article: any) => article.category))).filter(Boolean)
  // Count articles per category
  const categoryCounts = categories.map(cat => ({
    name: cat as string,
    count: displayArticles.filter((article: any) => article.category === cat).length,
  }))

  // Find top article by views
  const topArticle = displayArticles.length > 0 
    ? displayArticles.reduce((max: any, article: any) => (article.views || 0) > (max.views || 0) ? article : max)
    : null

  const defaultCategories = ["Security", "Networking", "Hardware", "Software", "Email", "Process", "Other"]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Knowledge Base</h1>
          <p className="text-muted-foreground">Central repository of solutions and FAQs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewSuggestions && (
            <Button asChild variant="outline">
              <a href="/knowledge/suggestions">
                <Sparkles className="mr-2 h-4 w-4" />
                View Suggestions
              </a>
            </Button>
          )}
          {canCreateArticle && (
            <Button asChild>
              <a href="/knowledge/new">
                <Plus className="mr-2 h-4 w-4" />
                New Article
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">{monthlyDeltaLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all articles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{helpfulRate}%</div>
            <p className="text-xs text-muted-foreground">Based on user feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{draftArticles}</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Issue Report Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{issueReportRate}%</div>
            <p className="text-xs text-muted-foreground">Reported issues vs. all feedback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Articles</CardTitle>
                <CardDescription>All knowledge base articles.</CardDescription>
              </div>
              <KnowledgeFilters
                initialSearch={searchParams?.search || ""}
                initialCategory={categoryFilter}
                initialStatus={statusFilter}
                categories={categories.map((category) => String(category))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Helpful</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayArticles.map((article: any) => (
                  <TableRow key={article.id}>
                    <TableCell><Link href={`/knowledge/${article.id}`} className="hover:underline">{article.title}</Link></TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {article.helpful || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={article.status === "Published" || article.isPublished === true ? "default" : "secondary"}>
                        {article.status || (article.isPublished ? "Published" : "Draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.lastUpdated || new Date(article.updatedAt).toISOString().split('T')[0]}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild><Link href={`/knowledge/${article.id}`}>View Article</Link></DropdownMenuItem>
                          {canUpdateArticle && <DropdownMenuItem asChild><Link href={`/knowledge/${article.id}/edit`}>Edit</Link></DropdownMenuItem>}
                          {canCreateArticle && <DropdownMenuItem>Duplicate</DropdownMenuItem>}
                          {(canUpdateArticle || canCreateArticle || canDeleteArticle) && <DropdownMenuSeparator />}
                          {canDeleteArticle && (
                            <DropdownMenuItem asChild className="text-red-600">
                              <form
                                action={async () => {
                                  "use server"
                                  await deleteArticle(article.id)
                                }}
                              >
                                <button type="submit" className="w-full text-left">
                                  Delete
                                </button>
                              </form>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Article distribution by category.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryCounts.map(({ name, count }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{name}</span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              {categoryCounts.length === 0 && defaultCategories.map(category => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{category}</span>
                  </div>
                  <Badge variant="outline">0</Badge>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="font-medium mb-2">Top Article</h3>
              {topArticle ? (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{topArticle.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {topArticle.category} • {topArticle.views || 0} views
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">No articles yet</p>
                        <p className="text-sm text-muted-foreground">Create your first article</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}