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
          items.map((item, index) => (
            <details
              key={item.id}
              open={index === 0}
              className="rounded-lg border border-slate-300 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-900/30"
            >
              <summary className="group flex cursor-pointer list-none items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      item.type === "ISSUE"
                        ? "bg-red-600 text-white hover:bg-red-600"
                        : "bg-[#0073d2] text-white hover:bg-[#0073d2]"
                    }
                  >
                    {item.type === "ISSUE" ? "Issue" : "Comment"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {(item.userName || item.userEmail || "Unknown user").toString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200">
                    <span className="group-open:hidden">Expand</span>
                    <span className="hidden group-open:inline">Collapse</span>
                    <span className="ml-1 group-open:hidden">▼</span>
                    <span className="ml-1 hidden group-open:inline">▲</span>
                  </span>
                </div>
              </summary>
              <div className="mt-3 border-t pt-3">
                <p className="whitespace-pre-wrap text-sm">{item.content}</p>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  )
}

