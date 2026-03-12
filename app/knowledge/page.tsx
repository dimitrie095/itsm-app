import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter, Eye, ThumbsUp, BookOpen, Tag } from "lucide-react"

export default function KnowledgePage() {
  const articles = [
    { id: "KB-001", title: "How to reset your password", category: "Security", views: 245, helpful: 89, status: "Published", lastUpdated: "2025-03-10" },
    { id: "KB-002", title: "VPN setup guide for remote work", category: "Networking", views: 189, helpful: 67, status: "Published", lastUpdated: "2025-03-09" },
    { id: "KB-003", title: "Troubleshooting printer issues", category: "Hardware", views: 156, helpful: 42, status: "Published", lastUpdated: "2025-03-08" },
    { id: "KB-004", title: "Microsoft Teams installation", category: "Software", views: 134, helpful: 38, status: "Draft", lastUpdated: "2025-03-07" },
    { id: "KB-005", title: "Email signature configuration", category: "Email", views: 98, helpful: 25, status: "Published", lastUpdated: "2025-03-06" },
    { id: "KB-006", title: "Software license renewal process", category: "Process", views: 76, helpful: 18, status: "Published", lastUpdated: "2025-03-05" },
  ]

  const categories = ["Security", "Networking", "Hardware", "Software", "Email", "Process", "Other"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">Central repository of solutions and FAQs.</p>
        </div>
        <Button asChild>
          <a href="/knowledge/new">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78</div>
            <p className="text-xs text-muted-foreground">+8 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Based on user feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Articles</CardTitle>
                <CardDescription>All knowledge base articles.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search articles..." className="w-[300px] pl-9" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
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
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">{article.id}</TableCell>
                    <TableCell>{article.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {article.helpful}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={article.status === "Published" ? "default" : "secondary"}>
                        {article.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{article.lastUpdated}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Article</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
              {categories.map((category) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{category}</span>
                  </div>
                  <Badge variant="outline">12</Badge>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="font-medium mb-2">Top Article</h3>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">How to reset your password</p>
                      <p className="text-sm text-muted-foreground">Security • 245 views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}