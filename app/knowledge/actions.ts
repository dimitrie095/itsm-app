"use server"

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

// Fallback demo articles for when database is unavailable
const fallbackArticles = [
  { id: "KB-001", title: "How to reset your password", content: "To reset your password, go to the login page and click 'Forgot Password'. Follow the instructions sent to your email.", category: "Security", viewCount: 245, helpfulCount: 89, isPublished: true, createdAt: "2025-03-10T00:00:00.000Z", updatedAt: "2025-03-10T00:00:00.000Z", authorId: "demo-admin", tags: "[\"password\", \"security\", \"login\"]" },
  { id: "KB-002", title: "VPN setup guide for remote work", content: "1. Download the VPN client from the IT portal.\n2. Install and launch the application.\n3. Enter your credentials when prompted.\n4. Select the appropriate server location.\n5. Click Connect.", category: "Networking", viewCount: 189, helpfulCount: 67, isPublished: true, createdAt: "2025-03-09T00:00:00.000Z", updatedAt: "2025-03-09T00:00:00.000Z", authorId: "demo-admin", tags: "[\"vpn\", \"remote\", \"networking\"]" },
  { id: "KB-003", title: "Troubleshooting printer issues", content: "If your printer is not working:\n\n1. Check that the printer is powered on and connected.\n2. Verify there is paper and toner/ink.\n3. Restart the print spooler service.\n4. Try removing and re-adding the printer.\n5. Contact IT if issues persist.", category: "Hardware", viewCount: 156, helpfulCount: 42, isPublished: true, createdAt: "2025-03-08T00:00:00.000Z", updatedAt: "2025-03-08T00:00:00.000Z", authorId: "demo-admin", tags: "[\"printer\", \"hardware\", \"troubleshooting\"]" },
  { id: "KB-004", title: "Microsoft Teams installation", content: "Download Teams from the Microsoft website or your software center. Run the installer and sign in with your company email.", category: "Software", viewCount: 134, helpfulCount: 38, isPublished: false, createdAt: "2025-03-07T00:00:00.000Z", updatedAt: "2025-03-07T00:00:00.000Z", authorId: "demo-admin", tags: "[\"teams\", \"software\", \"installation\"]" },
  { id: "KB-005", title: "Email signature configuration", content: "To configure your email signature in Outlook:\n1. Go to File > Options > Mail > Signatures\n2. Click New and name your signature\n3. Design your signature using the editor\n4. Set it as default for new messages\n5. Click OK to save", category: "Email", viewCount: 98, helpfulCount: 25, isPublished: true, createdAt: "2025-03-06T00:00:00.000Z", updatedAt: "2025-03-06T00:00:00.000Z", authorId: "demo-admin", tags: "[\"email\", \"outlook\", \"signature\"]" },
  { id: "KB-006", title: "Software license renewal process", content: "When your software license is about to expire:\n1. Submit a ticket 30 days in advance\n2. Include the software name and current license key\n3. Provide business justification for renewal\n4. Wait for approval from your manager\n5. IT will process the renewal and update your license", category: "Process", viewCount: 76, helpfulCount: 18, isPublished: true, createdAt: "2025-03-05T00:00:00.000Z", updatedAt: "2025-03-05T00:00:00.000Z", authorId: "demo-admin", tags: "[\"license\", \"software\", \"renewal\", \"process\"]" },
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
      status: article.isPublished ? 'Published' : 'Draft',
      lastUpdated: article.updatedAt.split('T')[0],
      author: { id: article.authorId, name: 'Demo Admin', email: 'admin@demo.com' }
    }))
  }
}

export async function getArticleById(id: string) {
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
  try {
    const article = await prisma.knowledgeBaseArticle.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        updatedAt: new Date()
      }
    })
    revalidatePath('/knowledge')
    revalidatePath(`/knowledge/${id}`)
    return article
  } catch (error) {
    console.error('Error incrementing article views:', error)
    // Fallback: just revalidate
    revalidatePath('/knowledge')
    revalidatePath(`/knowledge/${id}`)
    throw new Error('Failed to increment views')
  }
}

export async function createArticle(data: ArticleInput) {
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

  // TODO: replace with actual user ID from session
  const authorId = 'demo-admin' // temporary

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

// Statistics functions (optional)
export async function getKnowledgeStats() {
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