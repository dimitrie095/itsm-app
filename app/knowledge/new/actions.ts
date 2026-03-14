"use server"

import { revalidatePath } from "next/cache"
import fs from 'fs/promises'
import path from 'path'

interface CreateArticleInput {
  title: string
  content: string
  category: string
  tags: string[]
  isPublished: boolean
}

const articlesFilePath = path.join(process.cwd(), 'articles.json')

async function readArticles() {
  try {
    const data = await fs.readFile(articlesFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist, return empty array
    return []
  }
}

async function writeArticles(articles: any[]) {
  await fs.writeFile(articlesFilePath, JSON.stringify(articles, null, 2), 'utf-8')
}

export async function createArticle(data: CreateArticleInput) {
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
    authorId: 'demo-admin',
  }
  
  articles.push(newArticle)
  await writeArticles(articles)

  // Revalidate the knowledge base page
  revalidatePath("/knowledge")
  
  return newArticle
}