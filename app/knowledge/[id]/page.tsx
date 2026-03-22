import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Eye, ThumbsUp, Calendar, User, Tag, BookOpen } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getArticleById } from "../actions"
import ViewIncrementor from "./components/ViewIncrementor"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await getArticleById(id)
  
  if (!article) {
    notFound()
  }
  

  
  const session = await getServerSession(authOptions)
  const canUpdateArticle = session ? hasPermission(session, "knowledge.update") : false
  
  // Format dates
  const createdAt = new Date(article.createdAt).toLocaleDateString()
  const updatedAt = new Date(article.updatedAt).toLocaleDateString()
  
  // Parse tags (stored as JSON string or array)
  let tags: string[] = []
  try {
    if (typeof article.tags === 'string') {
      tags = JSON.parse(article.tags)
    } else if (Array.isArray(article.tags)) {
      tags = article.tags
    }
  } catch {
    // ignore
  }
  
  return (
    <div className="space-y-6">
      <ViewIncrementor articleId={id} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/knowledge">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{article.category}</Badge>
                  <Badge variant={article.isPublished ? "default" : "secondary"}>
                    {article.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{article.views || 0} views</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{article.helpful || 0} helpful</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2">Article ID: {article.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canUpdateArticle && (
            <Button asChild>
              <Link href={`/knowledge/${article.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Article
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>The full article content.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none dark:prose-invert">
              {article.content.split('\n').map((paragraph: string, idx: number) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Sidebar with metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Created</span>
                </div>
                <span className="text-sm">{createdAt}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Last Updated</span>
                </div>
                <span className="text-sm">{updatedAt}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Author</span>
                </div>
                <span className="text-sm">{article.authorId || "Demo Admin"}</span>
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/knowledge">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Knowledge Base
                </Link>
              </Button>
              {canUpdateArticle && (
                <Button className="w-full justify-start" asChild>
                  <Link href={`/knowledge/${article.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Article
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start">
                <ThumbsUp className="mr-2 h-4 w-4" />
                Mark as Helpful
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="mr-2 h-4 w-4" />
                Report Issue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}