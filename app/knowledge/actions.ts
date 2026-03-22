"use server"

import * as fs from 'fs/promises'
import * as path from 'path'
import { revalidatePath } from 'next/cache'

const articlesFilePath = path.join(process.cwd(), 'articles.json')

// Helper functions
async function readArticles() {
  try {
    const data = await fs.readFile(articlesFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return []
    }
    console.error('Error reading articles:', error)
    return []
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