"use server"

import { revalidatePath } from "next/cache"
import * as fs from 'fs/promises'
import * as path from 'path'

interface CreateTicketInput {
  title: string
  description: string
  category: string
  priority: string
  customer: string
  email: string
  department?: string
}

const ticketsFilePath = path.join(process.cwd(), 'tickets.json')

async function readTickets() {
  try {
    const data = await fs.readFile(ticketsFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist, return empty array
    return []
  }
}

async function writeTickets(tickets: any[]) {
  await fs.writeFile(ticketsFilePath, JSON.stringify(tickets, null, 2), 'utf-8')
}

export async function createTicket(data: CreateTicketInput) {
  // Validate required fields
  if (!data.title.trim()) {
    throw new Error("Title is required")
  }
  if (!data.description.trim()) {
    throw new Error("Description is required")
  }
  if (!data.category.trim()) {
    throw new Error("Category is required")
  }
  if (!data.priority.trim()) {
    throw new Error("Priority is required")
  }
  if (!data.customer.trim()) {
    throw new Error("Customer name is required")
  }
  if (!data.email.trim()) {
    throw new Error("Customer email is required")
  }

  const tickets = await readTickets()
  const newTicket = {
    id: `TKT-${(tickets.length + 1).toString().padStart(3, '0')}`,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    priority: data.priority,
    customer: data.customer.trim(),
    email: data.email.trim(),
    department: data.department || null,
    status: "New",
    assignedTo: "Unassigned",
    sla: "24h", // Default SLA
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  tickets.push(newTicket)
  await writeTickets(tickets)

  // Revalidate the tickets page
  revalidatePath("/tickets")
  
  return newTicket
}