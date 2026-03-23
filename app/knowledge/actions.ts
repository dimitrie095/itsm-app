"use server"

import * as fs from 'fs/promises'
import * as path from 'path'
import { revalidatePath } from 'next/cache'

const articlesFilePath = path.join(process.cwd(), 'articles.json')

// Demo/fallback articles for when the file doesn't exist
const fallbackArticles = [
  { id: "KB-001", title: "How to reset your password", content: "To reset your password, go to the login page and click 'Forgot Password'. Follow the instructions sent to your email.", category: "Security", views: 245, helpful: 89, isPublished: true, createdAt: "2025-03-10T00:00:00.000Z", updatedAt: "2025-03-10T00:00:00.000Z", authorId: "demo-admin", tags: ["password", "security", "login"] },
  { id: "KB-002", title: "VPN setup guide for remote work", content: "1. Download the VPN client from the IT portal.\n2. Install and launch the application.\n3. Enter your credentials when prompted.\n4. Select the appropriate server location.\n5. Click Connect.", category: "Networking", views: 189, helpful: 67, isPublished: true, createdAt: "2025-03-09T00:00:00.000Z", updatedAt: "2025-03-09T00:00:00.000Z", authorId: "demo-admin", tags: ["vpn", "remote", "networking"] },
  { id: "KB-003", title: "Troubleshooting printer issues", content: "If your printer is not working:\n\n1. Check that the printer is powered on and connected.\n2. Verify there is paper and toner/ink.\n3. Restart the print spooler service.\n4. Try removing and re-adding the printer.\n5. Contact IT if issues persist.", category: "Hardware", views: 156, helpful: 42, isPublished: true, createdAt: "2025-03-08T00:00:00.000Z", updatedAt: "2025-03-08T00:00:00.000Z", authorId: "demo-admin", tags: ["printer", "hardware", "troubleshooting"] },
  { id: "KB-004", title: "Microsoft Teams installation", content: "Download Teams from the Microsoft website or your software center. Run the installer and sign in with your company email.", category: "Software", views: 134, helpful: 38, isPublished: false, createdAt: "2025-03-07T00:00:00.000Z", updatedAt: "2025-03-07T00:00:00.000Z", authorId: "demo-admin", tags: ["teams", "software", "installation"] },
  { id: "KB-005", title: "Email signature configuration", content: "To configure your email signature in Outlook:\n1. Go to File > Options > Mail > Signatures\n2. Click New and name your signature\n3. Design your signature using the editor\n4. Set it as default for new messages\n5. Click OK to save", category: "Email", views: 98, helpful: 25, isPublished: true, createdAt: "2025-03-06T00:00:00.000Z", updatedAt: "2025-03-06T00:00:00.000Z", authorId: "demo-admin", tags: ["email", "outlook", "signature"] },
  { id: "KB-006", title: "Software license renewal process", content: "When your software license is about to expire:\n1. Submit a ticket 30 days in advance\n2. Include the software name and current license key\n3. Provide business justification for renewal\n4. Wait for approval from your manager\n5. IT will process the renewal and update your license", category: "Process", views: 76, helpful: 18, isPublished: true, createdAt: "2025-03-05T00:00:00.000Z", updatedAt: "2025-03-05T00:00:00.000Z", authorId: "demo-admin", tags: ["license", "software", "renewal", "process"] },
]

// Helper functions
async function readArticles() {
  try {
    const data = await fs.readFile(articlesFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return fallback demo data
      return fallbackArticles
    }
    console.error('Error reading articles:', error)
    return fallbackArticles
  }
}

async function writeArticles(articles: any[]) {
  await fs.writeFile(articlesFilePath, JSON.stringify(articles, null, 2), 'utf-8')
}

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
  const articles = await readArticles()
  // Sort by date (newest first)
  return articles.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getArticleById(id: string) {
  const articles = await readArticles()
  return articles.find((article: any) => article.id === id)
}

export async function incrementArticleViews(id: string) {
  const articles = await readArticles()
  const articleIndex = articles.findIndex((article: any) => article.id === id)
  
  if (articleIndex === -1) {
    throw new Error('Article not found')
  }
  
  const updatedArticle = {
    ...articles[articleIndex],
    views: (articles[articleIndex].views || 0) + 1,
    updatedAt: new Date().toISOString()
  }
  
  articles[articleIndex] = updatedArticle
  await writeArticles(articles)
  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${id}`)
  
  return updatedArticle
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

  const articles = await readArticles()
  const newArticle = {
    id: `KB-${(articles.length + 1).toString().padStart(3, '0')}`,
    title: data.title.trim(),
    content: data.content.trim(),
    category: data.category.trim(),
    tags: data.tags,
    isPublished: data.isPublished,
    views: 0,
    helpful: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: 'demo-admin', // TODO: replace with actual user ID
  }
  
  articles.push(newArticle)
  await writeArticles(articles)

  // Revalidate the knowledge base page
  revalidatePath("/knowledge")
  
  return newArticle
}

export async function updateArticle(id: string, data: Partial<ArticleInput>) {
  const articles = await readArticles()
  const articleIndex = articles.findIndex((article: any) => article.id === id)
  
  if (articleIndex === -1) {
    throw new Error('Article not found')
  }
  
  // Update article
  const updatedArticle = {
    ...articles[articleIndex],
    ...data,
    updatedAt: new Date().toISOString()
  }
  
  articles[articleIndex] = updatedArticle
  await writeArticles(articles)
  
  // Revalidate cache
  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${id}`)
  
  return updatedArticle
}

export async function deleteArticle(id: string) {
  const articles = await readArticles()
  const filteredArticles = articles.filter((article: any) => article.id !== id)
  
  if (filteredArticles.length === articles.length) {
    throw new Error('Article not found')
  }
  
  await writeArticles(filteredArticles)
  revalidatePath('/knowledge')
  
  return true
}

// Statistics functions (optional)
export async function getKnowledgeStats() {
  const articles = await readArticles()
  
  const totalArticles = articles.length
  const publishedArticles = articles.filter((article: any) => article.isPublished === true).length
  const draftArticles = articles.filter((article: any) => article.isPublished === false).length
  const totalViews = articles.reduce((sum: number, article: any) => sum + (article.views || 0), 0)
  const totalHelpful = articles.reduce((sum: number, article: any) => sum + (article.helpful || 0), 0)
  
  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    totalViews,
    totalHelpful,
  }
}