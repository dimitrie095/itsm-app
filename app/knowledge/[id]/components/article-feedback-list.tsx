import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { KnowledgeFeedbackItem } from "@/app/knowledge/actions"

interface ArticleFeedbackListProps {
  items: KnowledgeFeedbackItem[]
}

export default function ArticleFeedbackList({ items }: ArticleFeedbackListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues & Comments</CardTitle>
        <CardDescription>Feedback submitted by users for this article.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues or comments yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant={item.type === "ISSUE" ? "destructive" : "outline"}>
                  {item.type === "ISSUE" ? "Issue" : "Comment"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{item.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                by {item.userName || item.userEmail || "Unknown user"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

