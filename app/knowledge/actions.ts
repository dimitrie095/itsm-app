"use server"

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { sendOutlookEmail } from "@/lib/outlook-mailer"
import { sendTeamsMessage } from "@/lib/teams-webhook"
import { requireServerActionAuth } from "@/lib/auth/server-actions"
const VIEW_REVALIDATE_THROTTLE_MS = 30_000
const articleViewRevalidateTracker = new Map<string, number>()

// Fallback demo articles for when database is unavailable
const fallbackArticles = [
  { id: "KB-001", title: "How to reset your password", content: "To reset your password, go to the login page and click 'Forgot Password'. Follow the instructions sent to your email.", category: "Security", viewCount: 245, helpfulCount: 89, notHelpfulCount: 3, isPublished: true, createdAt: "2025-03-10T00:00:00.000Z", updatedAt: "2025-03-10T00:00:00.000Z", authorId: "demo-admin", tags: "[\"password\", \"security\", \"login\"]" },
  { id: "KB-002", title: "VPN setup guide for remote work", content: "1. Download the VPN client from the IT portal.\n2. Install and launch the application.\n3. Enter your credentials when prompted.\n4. Select the appropriate server location.\n5. Click Connect.", category: "Networking", viewCount: 189, helpfulCount: 67, notHelpfulCount: 4, isPublished: true, createdAt: "2025-03-09T00:00:00.000Z", updatedAt: "2025-03-09T00:00:00.000Z", authorId: "demo-admin", tags: "[\"vpn\", \"remote\", \"networking\"]" },
  { id: "KB-003", title: "Troubleshooting printer issues", content: "If your printer is not working:\n\n1. Check that the printer is powered on and connected.\n2. Verify there is paper and toner/ink.\n3. Restart the print spooler service.\n4. Try removing and re-adding the printer.\n5. Contact IT if issues persist.", category: "Hardware", viewCount: 156, helpfulCount: 42, notHelpfulCount: 2, isPublished: true, createdAt: "2025-03-08T00:00:00.000Z", updatedAt: "2025-03-08T00:00:00.000Z", authorId: "demo-admin", tags: "[\"printer\", \"hardware\", \"troubleshooting\"]" },
  { id: "KB-004", title: "Microsoft Teams installation", content: "Download Teams from the Microsoft website or your software center. Run the installer and sign in with your company email.", category: "Software", viewCount: 134, helpfulCount: 38, notHelpfulCount: 1, isPublished: false, createdAt: "2025-03-07T00:00:00.000Z", updatedAt: "2025-03-07T00:00:00.000Z", authorId: "demo-admin", tags: "[\"teams\", \"software\", \"installation\"]" },
  { id: "KB-005", title: "Email signature configuration", content: "To configure your email signature in Outlook:\n1. Go to File > Options > Mail > Signatures\n2. Click New and name your signature\n3. Design your signature using the editor\n4. Set it as default for new messages\n5. Click OK to save", category: "Email", viewCount: 98, helpfulCount: 25, notHelpfulCount: 1, isPublished: true, createdAt: "2025-03-06T00:00:00.000Z", updatedAt: "2025-03-06T00:00:00.000Z", authorId: "demo-admin", tags: "[\"email\", \"outlook\", \"signature\"]" },
  { id: "KB-006", title: "Software license renewal process", content: "When your software license is about to expire:\n1. Submit a ticket 30 days in advance\n2. Include the software name and current license key\n3. Provide business justification for renewal\n4. Wait for approval from your manager\n5. IT will process the renewal and update your license", category: "Process", viewCount: 76, helpfulCount: 18, notHelpfulCount: 0, isPublished: true, createdAt: "2025-03-05T00:00:00.000Z", updatedAt: "2025-03-05T00:00:00.000Z", authorId: "demo-admin", tags: "[\"license\", \"software\", \"renewal\", \"process\"]" },
]



// Type definitions
export interface ArticleInput {
  title: string
  content: string
  category: string
  tags: string[]
  isPublished: boolean
}

// Article functions
export async function getArticles() {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    // Map to match expected format (optional)
    return articles.map(article => ({
      ...article,
      views: article.viewCount,
      helpful: article.helpfulCount,
      notHelpful: article.notHelpfulCount,
      status: article.isPublished ? 'Published' : 'Draft',
      lastUpdated: article.updatedAt.toISOString().split('T')[0]
    }))
  } catch (error) {
    console.error('Error fetching articles from database:', error)
    // Return fallback articles (mapped to expected format)
    return fallbackArticles.map(article => ({
      ...article,
      views: article.viewCount,
      helpful: article.helpfulCount,
      notHelpful: article.notHelpfulCount || 0,
      status: article.isPublished ? 'Published' : 'Draft',
      lastUpdated: article.updatedAt.split('T')[0],
      author: { id: article.authorId, name: 'Demo Admin', email: 'admin@demo.com' }
    }))
  }
}

export async function getArticleById(id: string) {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    if (!article) throw new Error('Article not found')
    return article
  } catch (error) {
    console.error('Error fetching article from database:', error)
    // Fallback to fallbackArticles
    const fallback = fallbackArticles.find(a => a.id === id)
    if (!fallback) throw new Error('Article not found')
    return {
      ...fallback,
      author: { id: fallback.authorId, name: 'Demo Admin', email: 'admin@demo.com' }
    }
  }
}

export async function incrementArticleViews(id: string) {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
      }
    })
    const now = Date.now()
    const lastRevalidateAt = articleViewRevalidateTracker.get(id) ?? 0
    if (now - lastRevalidateAt >= VIEW_REVALIDATE_THROTTLE_MS) {
      articleViewRevalidateTracker.set(id, now)
      revalidatePath(`/knowledge/${id}`)
    }
    return article
  } catch (error) {
    console.error('Error incrementing article views:', error)
    throw new Error('Failed to increment views')
  }
}

export async function createArticle(data: ArticleInput) {
  const currentUser = await requireServerActionAuth({ permissions: ["knowledge.create"] })
  // Validate required fields
  if (!data.title.trim()) {
    throw new Error("Title is required")
  }
  if (!data.content.trim()) {
    throw new Error("Content is required")
  }
  if (!data.category.trim()) {
    throw new Error("Category is required")
  }

  const authorId = currentUser.id

  try {
    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category.trim(),
        tags: JSON.stringify(data.tags || []),
        isPublished: data.isPublished,
        viewCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    revalidatePath('/knowledge')
    return article
  } catch (error) {
    console.error('Error creating article:', error)
    throw new Error('Failed to create article')
  }
}

export async function updateArticle(id: string, data: Partial<ArticleInput>) {
  await requireServerActionAuth({ permissions: ["knowledge.update"] })
  try {
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.content !== undefined) updateData.content = data.content.trim()
    if (data.category !== undefined) updateData.category = data.category.trim()
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished
    updateData.updatedAt = new Date()

    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    revalidatePath('/knowledge')
    revalidatePath(`/knowledge/${id}`)
    return article
  } catch (error) {
    console.error('Error updating article:', error)
    throw new Error('Failed to update article')
  }
}

export async function deleteArticle(id: string) {
  await requireServerActionAuth({ permissions: ["knowledge.delete"] })
  try {
    await prisma.knowledgeBaseArticle.delete({
      where: { id }
    })
    revalidatePath('/knowledge')
    return true
  } catch (error) {
    console.error('Error deleting article:', error)
    throw new Error('Failed to delete article')
  }
}

export type KnowledgeFeedbackItem = {
  id: string
  articleId: string
  type: "ISSUE" | "COMMENT"
  content: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  createdAt: string
}

export async function getArticleFeedback(articleId: string): Promise<KnowledgeFeedbackItem[]> {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const rows = await prisma.$queryRaw<Array<any>>`
      SELECT
        "id",
        "article_id" AS "articleId",
        "type",
        "content",
        "user_id" AS "userId",
        "user_name" AS "userName",
        "user_email" AS "userEmail",
        "created_at" AS "createdAt"
      FROM "knowledge_article_feedback"
      WHERE "article_id" = ${articleId}
        AND "type" IN ('ISSUE', 'COMMENT')
      ORDER BY "created_at" DESC
      `

    return rows.map((row) => ({
      ...row,
      type: row.type === "ISSUE" ? "ISSUE" : "COMMENT",
      createdAt: new Date(row.createdAt).toISOString(),
    }))
  } catch (error) {
    console.error("Error loading article feedback:", error)
    return []
  }
}

async function notifyKnowledgeIssueReported(articleId: string, articleTitle: string, message: string, reporterName: string) {
  const recipients = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "AGENT"] } },
    select: { id: true, email: true, name: true },
  })

  for (const recipient of recipients) {
    await createNotification({
      userId: recipient.id,
      type: "system_alert",
      title: "Knowledge article issue reported",
      message: `Issue reported for "${articleTitle}": ${message.slice(0, 120)}`,
      metadata: { articleId, articleTitle, reporterName },
    })
  }

  const articleUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/knowledge/${articleId}`
  for (const recipient of recipients) {
    if (!recipient.email) continue
    await sendOutlookEmail({
      to: recipient.email,
      subject: `Issue reported: ${articleTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Knowledge issue reported</h2>
          <p><strong>Article:</strong> ${articleTitle}</p>
          <p><strong>Reported by:</strong> ${reporterName}</p>
          <p><strong>Issue:</strong></p>
          <div style="margin: 12px 0; padding: 12px; background: #f4f6f8; border-radius: 8px;">
            ${message.replace(/\n/g, "<br/>")}
          </div>
          <p>Open article: <a href="${articleUrl}">${articleUrl}</a></p>
        </div>
      `,
    }).catch((error) => console.error("Failed to send issue email:", error))
  }

  await sendTeamsMessage({
    title: "Knowledge issue reported",
    text: `**Article:** ${articleTitle}<br/>**Reported by:** ${reporterName}<br/>**Issue:** ${message.replace(/\n/g, "<br/>")}<br/>[Open article](${articleUrl})`,
  }).catch((error) => console.error("Failed to send Teams issue notification:", error))
}

export async function markArticleHelpful(id: string) {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) {
      return { success: false as const, message: "You must be logged in to mark as helpful" }
    }

    const existingHelpful = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "knowledge_article_feedback"
      WHERE "article_id" = ${id}
        AND "user_id" = ${userId}
        AND "type" = 'HELPFUL'
      LIMIT 1
      `

    if (existingHelpful.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM "knowledge_article_feedback"
        WHERE "id" = ${existingHelpful[0].id}
        `
      await prisma.knowledgeBaseArticle.update({
        where: { id },
        data: {
          helpfulCount: { decrement: 1 },
          updatedAt: new Date(),
        },
      })
      revalidatePath("/knowledge")
      revalidatePath(`/knowledge/${id}`)
      return { success: true as const, marked: false as const }
    }

    await prisma.$executeRaw`
      INSERT INTO "knowledge_article_feedback"
        ("id", "article_id", "type", "content", "user_id", "user_name", "user_email")
      VALUES (${crypto.randomUUID()}, ${id}, 'HELPFUL', ${"helpful_vote"}, ${userId}, ${session?.user?.name || null}, ${session?.user?.email || null})
      `

    await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        helpfulCount: { increment: 1 },
        updatedAt: new Date(),
      },
    })
    revalidatePath("/knowledge")
    revalidatePath(`/knowledge/${id}`)
    return { success: true as const, marked: true as const }
  } catch (error) {
    console.error("Error marking article as helpful:", error)
    return { success: false as const, message: "Failed to mark article as helpful" }
  }
}

export async function reportArticleIssue(id: string, content?: string) {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const session = await getServerSession(authOptions)
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id },
      select: { id: true, title: true },
    })
    if (!article) {
      return { success: false as const, message: "Article not found" }
    }

    if (content && content.trim().length > 0) {
      await prisma.$executeRaw`
        INSERT INTO "knowledge_article_feedback"
          ("id", "article_id", "type", "content", "user_id", "user_name", "user_email")
        VALUES (${crypto.randomUUID()}, ${id}, 'ISSUE', ${content.trim()}, ${session?.user?.id || null}, ${session?.user?.name || null}, ${session?.user?.email || null})
        `
      await notifyKnowledgeIssueReported(
        article.id,
        article.title,
        content.trim(),
        session?.user?.name || session?.user?.email || "Unknown user"
      )
    }

    await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        notHelpfulCount: { increment: 1 },
        updatedAt: new Date(),
      },
    })
    revalidatePath("/knowledge")
    revalidatePath(`/knowledge/${id}`)
    return { success: true as const }
  } catch (error) {
    console.error("Error reporting article issue:", error)
    return { success: false as const, message: "Failed to report issue" }
  }
}

export async function addArticleComment(id: string, content: string) {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const clean = content.trim()
    if (!clean) {
      return { success: false as const, message: "Comment cannot be empty" }
    }

    const session = await getServerSession(authOptions)
    await prisma.$executeRaw`
      INSERT INTO "knowledge_article_feedback"
        ("id", "article_id", "type", "content", "user_id", "user_name", "user_email")
      VALUES (${crypto.randomUUID()}, ${id}, 'COMMENT', ${clean}, ${session?.user?.id || null}, ${session?.user?.name || null}, ${session?.user?.email || null})
      `

    revalidatePath("/knowledge")
    revalidatePath(`/knowledge/${id}`)
    return { success: true as const }
  } catch (error) {
    console.error("Error adding article comment:", error)
    return { success: false as const, message: "Failed to add comment" }
  }
}

export async function hasUserMarkedArticleHelpful(articleId: string): Promise<boolean> {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return false

    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "knowledge_article_feedback"
      WHERE "article_id" = ${articleId}
        AND "user_id" = ${userId}
        AND "type" = 'HELPFUL'
      LIMIT 1
      `
    return rows.length > 0
  } catch (error) {
    console.error("Error checking helpful status:", error)
    return false
  }
}

// Statistics functions (optional)
export async function getKnowledgeStats() {
  await requireServerActionAuth({ permissions: ["knowledge.view"] })
  try {
    const articles = await prisma.knowledgeBaseArticle.findMany({
      select: {
        isPublished: true,
        viewCount: true,
        helpfulCount: true,
      }
    })
    const totalArticles = articles.length
    const publishedArticles = articles.filter(article => article.isPublished === true).length
    const draftArticles = articles.filter(article => article.isPublished === false).length
    const totalViews = articles.reduce((sum, article) => sum + article.viewCount, 0)
    const totalHelpful = articles.reduce((sum, article) => sum + article.helpfulCount, 0)
    
    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      totalViews,
      totalHelpful,
    }
  } catch (error) {
    console.error('Error fetching knowledge stats:', error)
    // Fallback to fallbackArticles
    const articles = fallbackArticles
    const totalArticles = articles.length
    const publishedArticles = articles.filter(article => article.isPublished === true).length
    const draftArticles = articles.filter(article => article.isPublished === false).length
    const totalViews = articles.reduce((sum, article) => sum + article.viewCount, 0)
    const totalHelpful = articles.reduce((sum, article) => sum + article.helpfulCount, 0)
    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      totalViews,
      totalHelpful,
    }
  }
}