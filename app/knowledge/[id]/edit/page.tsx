"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { X, Save, Send, ArrowLeft } from "lucide-react"
import { getArticleById, updateArticle } from "../../actions"
import { toast } from "sonner"

const categories = ["Security", "Networking", "Hardware", "Software", "Email", "Process", "Other"]

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isPublished, setIsPublished] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadArticle() {
      try {
        const { id } = await params
        const article = await getArticleById(id)
        if (!article) {
          toast.error("Article not found")
          router.push("/knowledge")
          return
        }
        setTitle(article.title)
        setContent(article.content)
        setCategory(article.category)
        setIsPublished(article.isPublished)
        // Parse tags
        let parsedTags: string[] = []
        if (typeof article.tags === 'string') {
          try {
            parsedTags = JSON.parse(article.tags)
          } catch {
            parsedTags = []
          }
        } else if (Array.isArray(article.tags)) {
          parsedTags = article.tags
        }
        setTags(parsedTags)
      } catch (err) {
        toast.error("Failed to load article")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadArticle()
  }, [params, router])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async (publish: boolean) => {
    setIsSubmitting(true)
    try {
      const { id } = await params
      await updateArticle(id, {
        title,
        content,
        category,
        tags,
        isPublished: publish,
      })
      toast.success(publish ? "Article published" : "Article updated", {
        description: publish 
          ? "Your article has been published and is now live."
          : "Your changes have been saved.",
      })
      router.push(`/knowledge/${id}`)
    } catch (err) {
      toast.error("Failed to save article", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading article...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Article</h1>
          <p className="text-muted-foreground">Update the knowledge base article.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Article Content</CardTitle>
            <CardDescription>Update the details of your article.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., How to reset your password"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write the article content here. You can use Markdown formatting."
                rows={20}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Supports Markdown formatting for rich content.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  id="publish"
                />
                <Label htmlFor="publish" className="cursor-pointer">
                  Publish article
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPublished 
                    ? "Article will be visible to all users."
                    : "Article will be saved as draft."
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleSave(false)}
                  disabled={isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button 
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Publish Article
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
            <CardDescription>Best practices for knowledge articles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Clear Titles</h4>
              <p className="text-sm text-muted-foreground">
                Use descriptive titles that clearly state the problem or solution.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Structured Content</h4>
              <p className="text-sm text-muted-foreground">
                Break content into sections with headings and bullet points for readability.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Relevant Tags</h4>
              <p className="text-sm text-muted-foreground">
                Add tags that help users find this article through search.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Regular Updates</h4>
              <p className="text-sm text-muted-foreground">
                Keep articles up-to-date with the latest information and procedures.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}